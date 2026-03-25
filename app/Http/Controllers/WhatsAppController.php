<?php

namespace App\Http\Controllers;

use App\Models\ConversationState;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    /** Load available menu items from DB, keyed by slug. Cached per request. */
    private ?array $menu    = null;
    private ?array $itemMap = null;

    private function getMenu(): array
    {
        if ($this->menu === null) {
            $rows = MenuItem::where('available', true)->orderBy('sort_order')->orderBy('id')->get();
            $this->menu    = [];
            $this->itemMap = [];
            foreach ($rows as $row) {
                $this->menu[$row->slug] = [
                    'name'        => $row->name,
                    'price'       => (float) $row->price,
                    'emoji'       => $row->emoji,
                    'description' => $row->description ?? '',
                    'image_url'   => $row->image_path
                        ? rtrim(env('PUBLIC_URL', config('app.url')), '/') . '/storage/' . $row->image_path
                        : null,
                ];
                $this->itemMap['order_' . $row->slug] = $row->slug;
            }
        }
        return $this->menu;
    }

    private function getItemMap(): array
    {
        $this->getMenu(); // ensure loaded
        return $this->itemMap;
    }

    // ══════════════════════════════════════════
    //  WEBHOOK VERIFICATION
    // ══════════════════════════════════════════
    public function verify(Request $request)
    {
        if (
            $request->query('hub_mode')         === 'subscribe' &&
            $request->query('hub_verify_token') === env('WHATSAPP_VERIFY_TOKEN')
        ) {
            return response($request->query('hub_challenge'), 200);
        }
        return response('Forbidden', 403);
    }

    // ══════════════════════════════════════════
    //  MAIN HANDLER
    // ══════════════════════════════════════════
    public function handle(Request $request)
    {
        $entry = $request->input('entry.0.changes.0.value');
        if (!$entry) return response()->json(['status' => 'ignored']);

        $msg = $entry['messages'][0] ?? null;
        if (!$msg) return response()->json(['status' => 'ignored']);

        $phone = $msg['from'];
        $type  = $msg['type'] ?? 'text';

        $text = match ($type) {
            'text'        => strtolower(trim($msg['text']['body'] ?? '')),
            'interactive' => strtolower(trim(
                $msg['interactive']['button_reply']['id']
                    ?? $msg['interactive']['list_reply']['id']
                    ?? ''
            )),
            default => '',
        };

        $convo = ConversationState::firstOrCreate(
            ['phone' => $phone],
            ['state' => 'idle', 'cart' => json_encode([]), 'order_text' => null]
        );

        // ── Always allow restart ──
        if ($this->isGreeting($text)) {
            return $this->sendWelcome($phone, $convo);
        }

        // ── Review button replies (review_good_123, review_ok_123, review_bad_123) ──
        if (preg_match('/^review_(good|ok|bad)_(\d+)$/', $text, $m)) {
            return $this->handleReview($phone, $m[1], (int) $m[2], $convo);
        }

        // ── Handle post-order buttons BEFORE completed check ──
        if ($convo->state === 'completed') {
            return match ($text) {
                'place_order' => $this->sendOrderList($phone, $convo),
                'view_menu'   => $this->sendMenu($phone),
                'contact_us'  => $this->sendContact($phone, $convo),
                'view_order'  => $this->sendViewOrder($phone, $convo),
                default       => $this->sendCompletedMenu($phone),
            };
        }

        // ── Global interactive reply handlers ──
        if ($text === 'reorder') {
            return $this->handleReorder($phone, $convo);
        }

        if (in_array($text, ['checkout', 'add_more'])) {
            return $this->handleCartAction($phone, $text, $convo);
        }

        if (in_array($text, ['pickup', 'delivery', '1', '2'])) {
            return $this->handleDeliveryChoice($phone, $text, $convo);
        }

        if (in_array($text, ['qty_1', 'qty_2', 'qty_3'])) {
            return $this->handleQuantity($phone, $text, $convo);
        }

        // ── Item selected directly from menu image card ──
        if (isset($this->getItemMap()[$text])) {
            return $this->handleOrdering($phone, $text, $convo);
        }

        // ── State machine ──
        return match ($convo->state) {
            'idle'             => $this->handleIdle($phone, $text, $convo),
            'main_menu'        => $this->handleMainMenu($phone, $text, $convo),
            'ordering'         => $this->handleOrdering($phone, $text, $convo),
            'awaiting_qty'     => $this->handleQuantity($phone, $text, $convo),
            'cart_action'      => $this->handleCartAction($phone, $text, $convo),
            'delivery_choice'  => $this->handleDeliveryChoice($phone, $text, $convo),
            'awaiting_feedback'=> $this->handleBadFeedback($phone, $text, $convo),
            default            => $this->sendFallback($phone, $convo),
        };
    }

    // ══════════════════════════════════════════
    //  WELCOME
    // ══════════════════════════════════════════
    private function sendWelcome(string $phone, ConversationState $convo)
    {
        $convo->update(['state' => 'main_menu', 'cart' => json_encode([]), 'order_text' => null]);

        // Check if this customer has ordered before
        $lastOrder = Order::where('phone', $phone)->where('phone', '!=', 'POS')->latest()->first();

        if ($lastOrder) {
            return $this->sendButtons(
                $phone,
                "👋 *Welcome back to Savanna Bites!*\n\n" .
                    "Great to see you again 🔥\n" .
                    "Your last order was \${$lastOrder->total}.",
                "What would you like to do?",
                [
                    ['id' => 'reorder',     'title' => '🔁 Reorder'],
                    ['id' => 'place_order', 'title' => '🛒 New Order'],
                    ['id' => 'view_menu',   'title' => '📋 View Menu'],
                ]
            );
        }

        return $this->sendButtons(
            $phone,
            "👋 *Welcome to Savanna Bites Express!*\n\n" .
                "Zimbabwe's favourite fast food 🔥\n" .
                "Fresh, fast and delivered to you!",
            "What would you like to do?",
            [
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
                ['id' => 'place_order', 'title' => '🛒 Place Order'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  MAIN MENU
    // ══════════════════════════════════════════
    private function handleMainMenu(string $phone, string $text, ConversationState $convo)
    {
        return match ($text) {
            'view_menu', '1'   => $this->sendMenu($phone, $convo),
            'place_order', '2' => $this->sendOrderList($phone, $convo),
            'contact_us', '3'  => $this->sendContact($phone, $convo),
            'reorder'          => $this->handleReorder($phone, $convo),
            default            => $this->sendWelcome($phone, $convo),
        };
    }

    // ══════════════════════════════════════════
    //  REVIEW HANDLER
    // ══════════════════════════════════════════
    private function handleReview(string $phone, string $sentiment, int $orderId, ConversationState $convo): mixed
    {
        $order = Order::find($orderId);

        if ($order && $order->phone === $phone) {
            /** @var Order $order */
            $rating = match ($sentiment) {
                'good' => 5,
                'ok'   => 3,
                'bad'  => 1,
            };
            $order->update(['rating' => $rating]);
        }

        if ($sentiment === 'bad') {
            // Ask customer to type their complaint before showing buttons
            $convo->update(['state' => 'awaiting_feedback', 'order_text' => (string) $orderId]);
            return $this->sendText(
                $phone,
                "😔 *We're really sorry to hear that!*\n\nYour experience matters to us. Could you please tell us what went wrong so we can fix it? ✍️"
            );
        }

        $response = match ($sentiment) {
            'good' => "🎉 *Thank you so much!*\n\nWe're thrilled you loved it! ⭐⭐⭐⭐⭐\n\nSee you next time at *Savanna Bites!* 😊",
            'ok'   => "🙏 *Thanks for the feedback!*\n\nWe'll keep working to make every order amazing. ⭐⭐⭐\n\nHope to see you again soon!",
            default => '',
        };

        return $this->sendButtons(
            $phone,
            $response,
            "Anything else?",
            [
                ['id' => 'place_order', 'title' => '🛒 Order Again'],
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  BAD FEEDBACK — capture typed complaint
    // ══════════════════════════════════════════
    private function handleBadFeedback(string $phone, string $text, ConversationState $convo): mixed
    {
        $orderId = (int) $convo->order_text;
        $order   = Order::find($orderId);

        if ($order && $order->phone === $phone) {
            /** @var Order $order */
            $order->update(['review' => $text]);
        }

        $convo->update(['state' => 'completed']);

        return $this->sendButtons(
            $phone,
            "🙏 *Thank you for letting us know.*\n\nWe've noted your feedback and our team will look into this right away.\n\nIf you need immediate assistance: 📞 +263 77 247 6989",
            "What would you like to do next?",
            [
                ['id' => 'place_order', 'title' => '🛒 Order Again'],
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  REORDER — rebuild cart from last order
    // ══════════════════════════════════════════
    private function handleReorder(string $phone, ConversationState $convo)
    {
        $lastOrder = Order::where('phone', $phone)
            ->where('phone', '!=', 'POS')
            ->whereNotNull('order_text')
            ->latest()
            ->first();

        if (!$lastOrder) {
            return $this->sendOrderList($phone, $convo);
        }

        // Parse order_text "2 chicken 1 burger" back to ['chicken' => 2, 'burger' => 1]
        $parts = preg_split('/\s+/', trim($lastOrder->order_text));
        $cart  = [];
        for ($i = 0; $i + 1 < count($parts); $i += 2) {
            $qty = (int) $parts[$i];
            $kw  = $parts[$i + 1];
            if ($qty > 0 && $kw) {
                $cart[$kw] = $qty;
            }
        }

        // Remove any items no longer on the menu
        $menu = $this->getMenu();
        $cart = array_filter($cart, fn($kw) => isset($menu[$kw]), ARRAY_FILTER_USE_KEY);

        if (empty($cart)) {
            $this->sendText($phone, "⚠️ Some items from your last order are no longer available.");
            return $this->sendOrderList($phone, $convo);
        }

        $this->saveCart($convo, $cart);
        $convo->update(['state' => 'delivery_choice', 'order_text' => null]);

        $fullSummary = $this->cartSummaryFull($cart);
        $cartTotal   = $this->cartTotal($cart);

        return $this->sendButtons(
            $phone,
            "🔁 *Reorder from last time:*\n\n{$fullSummary}\n━━━━━━━━━━━━━━━━━\n💵 *Subtotal: \${$cartTotal}*",
            "How would you like your order?",
            [
                ['id' => 'pickup',   'title' => '🏃 Pickup'],
                ['id' => 'delivery', 'title' => '🚗 Delivery (+$1.50)'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  STATIC MENU (view only) — one card per item with image
    // ══════════════════════════════════════════
    private function sendMenu(string $phone)
    {
        $menu = $this->getMenu();

        if (empty($menu)) {
            return $this->sendText($phone, "Sorry, our menu is unavailable right now. Please try again later.");
        }

        $last = null;
        foreach ($menu as $slug => $item) {
            $price     = number_format($item['price'], 2);
            $desc      = $item['description'] ?: '';
            $bodyText  = "*{$item['emoji']} {$item['name']}*" . ($desc ? "\n{$desc}" : '') . "\n\n💵 *\${$price}*";
            $btnTitle  = mb_substr("🛒 Order {$item['name']}", 0, 20);

            $payload = [
                'type' => 'interactive',
                'interactive' => [
                    'type'   => 'button',
                    'body'   => ['text' => $bodyText],
                    'footer' => ['text' => 'Savanna Bites Express'],
                    'action' => [
                        'buttons' => [
                            ['type' => 'reply', 'reply' => ['id' => "order_{$slug}", 'title' => $btnTitle]],
                        ],
                    ],
                ],
            ];

            // Add image header if available, otherwise use text header
            if (!empty($item['image_url'])) {
                $payload['interactive']['header'] = ['type' => 'image', 'image' => ['link' => $item['image_url']]];
            } else {
                $payload['interactive']['header'] = ['type' => 'text', 'text' => "{$item['emoji']} {$item['name']}"];
            }

            $last = $this->call($phone, $payload);
        }

        return $last;
    }

    // ══════════════════════════════════════════
    //  ORDER LIST — pick an item
    // ══════════════════════════════════════════
    private function sendOrderList(string $phone, ConversationState $convo, string $notice = '')
    {
        $convo->update(['state' => 'ordering']);

        $cart    = $this->getCart($convo);
        $summary = $this->cartSummaryLine($cart);

        $body = empty($cart)
            ? "🛒 *Place Your Order*\n\nSelect an item to add:"
            : ($notice ? "{$notice}\n\n" : '') .
            "🛒 *Cart:* {$summary}\n\nSelect another item to add:";

        $menu    = $this->getMenu();
        $grouped = [];
        foreach ($menu as $slug => $item) {
            $grouped[$item['category'] ?? 'Mains'][] = [
                'id'          => "order_{$slug}",
                'title'       => $item['name'],
                'description' => '$' . number_format($item['price'], 2) . ($item['description'] ? ' — ' . $item['description'] : ''),
            ];
        }
        $sections = [];
        foreach ($grouped as $category => $rows) {
            $sections[] = ['title' => $category, 'rows' => $rows];
        }

        return $this->sendList($phone, $body, "Tap an item to add it", "Choose Item", $sections);
    }

    // ══════════════════════════════════════════
    //  ITEM SELECTED → ASK QUANTITY
    // ══════════════════════════════════════════
    private function handleOrdering(string $phone, string $text, ConversationState $convo)
    {
        if (!isset($this->getItemMap()[$text])) {
            return $this->sendOrderList($phone, $convo);
        }

        $keyword = $this->getItemMap()[$text];
        $item    = $this->getMenu()[$keyword];

        // Store pending item keyword in order_text temporarily
        $convo->update([
            'state'      => 'awaiting_qty',
            'order_text' => $keyword,
        ]);

        $bodyText = "{$item['emoji']} *{$item['name']}*\n" .
            "\${$item['price']} each\n\n" .
            "How many would you like?\n" .
            "_(Or type any number, e.g. 5)_";

        $buttons = [
            ['id' => 'qty_1', 'title' => '1️⃣  1'],
            ['id' => 'qty_2', 'title' => '2️⃣  2'],
            ['id' => 'qty_3', 'title' => '3️⃣  3'],
        ];

        // If the item has an image, show it as the message header
        if (!empty($item['image_url'])) {
            return $this->call($phone, [
                'type' => 'interactive',
                'interactive' => [
                    'type'   => 'button',
                    'header' => ['type' => 'image', 'image' => ['link' => $item['image_url']]],
                    'body'   => ['text' => $bodyText],
                    'footer' => ['text' => 'Savanna Bites Express'],
                    'action' => ['buttons' => array_map(
                        fn($b) => ['type' => 'reply', 'reply' => $b],
                        $buttons
                    )],
                ],
            ]);
        }

        return $this->sendButtons($phone, $bodyText, "Choose a quantity", $buttons);
    }

    // ══════════════════════════════════════════
    //  QUANTITY RECEIVED → ADD TO CART
    // ══════════════════════════════════════════
    private function handleQuantity(string $phone, string $text, ConversationState $convo)
    {
        $qty = match (true) {
            $text === 'qty_1'                                          => 1,
            $text === 'qty_2'                                          => 2,
            $text === 'qty_3'                                          => 3,
            ctype_digit($text) && (int)$text >= 1 && (int)$text <= 20 => (int)$text,
            default                                                    => 0,
        };

        if ($qty === 0) {
            return $this->sendButtons(
                $phone,
                "⚠️ Please enter a number between 1 and 20,\nor tap a button below:",
                "How many would you like?",
                [
                    ['id' => 'qty_1', 'title' => '1️⃣  1'],
                    ['id' => 'qty_2', 'title' => '2️⃣  2'],
                    ['id' => 'qty_3', 'title' => '3️⃣  3'],
                ]
            );
        }

        $keyword = $convo->order_text;
        if (!isset($this->getMenu()[$keyword])) {
            return $this->sendOrderList($phone, $convo);
        }

        $item = $this->getMenu()[$keyword];

        // Add qty to cart (accumulates if item already exists)
        $cart = $this->getCart($convo);
        $cart[$keyword] = ($cart[$keyword] ?? 0) + $qty;
        $this->saveCart($convo, $cart);

        $lineTotal = round($item['price'] * $qty, 2);
        $cartTotal = $this->cartTotal($cart);
        $fullSummary = $this->cartSummaryFull($cart);

        $convo->update(['state' => 'cart_action', 'order_text' => null]);

        return $this->sendButtons(
            $phone,
            "✅ Added *{$qty}x {$item['name']}* — \${$lineTotal}\n\n" .
                "🛒 *Your cart:*\n{$fullSummary}\n" .
                "━━━━━━━━━━━━━━━━━\n" .
                "💵 *Subtotal: \${$cartTotal}*\n" .
                "━━━━━━━━━━━━━━━━━\n\n" .
                "What would you like to do?",
            "Add more or proceed to checkout",
            [
                ['id' => 'add_more', 'title' => '➕ Add More'],
                ['id' => 'checkout', 'title' => '✅ Checkout'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  CART ACTION — add more or checkout
    // ══════════════════════════════════════════
    private function handleCartAction(string $phone, string $text, ConversationState $convo)
    {
        if ($text === 'add_more') {
            return $this->sendOrderList($phone, $convo);
        }

        if ($text === 'checkout') {
            $cart = $this->getCart($convo);

            if (empty($cart)) {
                return $this->sendOrderList($phone, $convo, "⚠️ Your cart is empty. Please add an item first.");
            }

            $cartTotal   = $this->cartTotal($cart);
            $fullSummary = $this->cartSummaryFull($cart);

            $convo->update(['state' => 'delivery_choice']);

            return $this->sendButtons(
                $phone,
                "🧾 *Order Summary*\n\n" .
                    "{$fullSummary}\n" .
                    "━━━━━━━━━━━━━━━━━\n" .
                    "💵 *Subtotal: \${$cartTotal}*",
                "How would you like your order?",
                [
                    ['id' => 'pickup',   'title' => '🏃 Pickup'],
                    ['id' => 'delivery', 'title' => '🚗 Delivery (+$1.50)'],
                ]
            );
        }

        return $this->sendButtons(
            $phone,
            "What would you like to do?",
            "Add more or proceed to checkout",
            [
                ['id' => 'add_more', 'title' => '➕ Add More'],
                ['id' => 'checkout', 'title' => '✅ Checkout'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  DELIVERY CHOICE → CONFIRM ORDER
    // ══════════════════════════════════════════
    private function handleDeliveryChoice(string $phone, string $text, ConversationState $convo)
    {
        if (!in_array($text, ['pickup', 'delivery', '1', '2'])) {
            return $this->sendButtons(
                $phone,
                "⚠️ Please choose a delivery option:",
                "How would you like your order?",
                [
                    ['id' => 'pickup',   'title' => '🏃 Pickup'],
                    ['id' => 'delivery', 'title' => '🚗 Delivery (+$1.50)'],
                ]
            );
        }

        $convo->refresh();
        $cart = $this->getCart($convo);

        if (empty($cart)) {
            $convo->update(['state' => 'idle']);
            return $this->sendWelcome($phone, $convo);
        }

        $isPickup = in_array($text, ['pickup', '1']);
        $delivery = $isPickup ? 0 : 1.50;
        $subtotal = $this->cartTotal($cart);
        $total    = round($subtotal + $delivery, 2);
        $status   = $isPickup ? 'pickup' : 'delivery';
        $orderNum = 'SB' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);

        $orderText = implode(' ', array_map(
            fn($kw, $qty) => "{$qty} {$kw}",
            array_keys($cart),
            $cart
        ));

        $order = Order::create([
            'phone'      => $phone,
            'order_text' => $orderText,
            'total'      => $total,
            'status'     => $status,
        ]);

        $convo->update(['state' => 'completed', 'cart' => json_encode([]), 'order_text' => (string)$order->id]);

        $this->notifyAdmin($order, $isPickup, $cart);

        $details      = $isPickup ? "📍 Pickup ready in *20–30 mins*" : "🚗 Delivery ETA *30–45 mins*";
        $fullSummary  = $this->cartSummaryFull($cart);
        $deliveryLine = $delivery > 0 ? "🚗 Delivery:  \$" . number_format($delivery, 2) . "\n" : "";

        return $this->sendList(
            $phone,
            "✅ *Order Placed!*\n\n" .
                "🔖 Order *#{$orderNum}*\n\n" .
                "{$fullSummary}\n" .
                "━━━━━━━━━━━━━━━━━\n" .
                "🛍️ Subtotal:  \${$subtotal}\n" .
                $deliveryLine .
                "💵 *Total:    \${$total}*\n" .
                "━━━━━━━━━━━━━━━━━\n\n" .
                "{$details}\n\n" .
                "Thank you for choosing *Savanna Bites!* 🙏",
            "Tap below to manage your order",
            "What's Next?",
            [
                [
                    'title' => '📦 Your Order',
                    'rows'  => [
                        ['id' => 'view_order', 'title' => '🔍 View My Order', 'description' => "Order #{$orderNum} — \${$total}"],
                    ],
                ],
                [
                    'title' => '🍽️ Continue',
                    'rows'  => [
                        ['id' => 'place_order', 'title' => '🛒 Order Again',  'description' => 'Place another order'],
                        ['id' => 'view_menu',   'title' => '📋 Browse Menu',  'description' => 'See what we offer'],
                    ],
                ],
                [
                    'title' => '💬 Support',
                    'rows'  => [
                        ['id' => 'contact_us', 'title' => '📞 Contact Us', 'description' => 'Get help from our team'],
                    ],
                ],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  CONTACT
    // ══════════════════════════════════════════
    private function sendContact(string $phone, ConversationState $convo)
    {
        $convo->update(['state' => 'idle']);

        return $this->sendButtons(
            $phone,
            "📞 *Contact Savanna Bites*\n\n" .
                "📱 Phone: +263 77 247 6989\n" .
                "🕐 Hours: Mon–Sat 8am–9pm\n\n" .
                "_Our team will assist you shortly!_",
            "Anything else?",
            [
                ['id' => 'place_order', 'title' => '🛒 Place Order'],
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
            ]
        );
    }

    private function sendFallback(string $phone, ConversationState $convo)
    {
        $convo->update(['state' => 'idle']);
        return $this->sendWelcome($phone, $convo);
    }

    private function handleIdle(string $phone, string $text, ConversationState $convo)
    {
        // Handle buttons from post-order confirmation screen
        return match ($text) {
            'place_order' => $this->sendOrderList($phone, $convo),
            'view_menu'   => $this->sendMenu($phone),
            'contact_us'  => $this->sendContact($phone, $convo),
            default       => $this->sendWelcome($phone, $convo),
        };
    }

    // ══════════════════════════════════════════
    //  VIEW ORDER (completed state)
    // ══════════════════════════════════════════
    private function sendViewOrder(string $phone, ConversationState $convo)
    {
        $order = $convo->order_text ? Order::find((int)$convo->order_text) : null;

        if (!$order) {
            return $this->sendCompletedMenu($phone);
        }

        $typeIcon    = $order->status === 'delivery' ? '🚗 Delivery' : '🏃 Pickup';
        $statusEmoji = '🟡';
        $placedAt    = $order->created_at->format('H:i, d M Y');

        return $this->sendButtons(
            $phone,
            "🔍 *Order Details*\n\n" .
                "🆔 Reference: *#{$order->id}*\n" .
                "🕐 Placed: {$placedAt}\n" .
                "📦 Type: {$typeIcon}\n" .
                "━━━━━━━━━━━━━━━━━\n" .
                "{$statusEmoji} Status: *" . ucfirst($order->status) . "*\n" .
                "💵 *Total: \${$order->total}*\n" .
                "━━━━━━━━━━━━━━━━━\n\n" .
                "_For updates, contact our team below._",
            "Need anything else?",
            [
                ['id' => 'place_order', 'title' => '🛒 Order Again'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
                ['id' => 'view_menu',   'title' => '📋 Browse Menu'],
            ]
        );
    }

    private function sendCompletedMenu(string $phone)
    {
        return $this->sendList(
            $phone,
            "✅ *Your order has been placed!*\n\nWhat would you like to do next?",
            "Tap an option below",
            "What's Next?",
            [
                [
                    'title' => '📦 Your Order',
                    'rows'  => [
                        ['id' => 'view_order', 'title' => '🔍 View My Order', 'description' => 'Check your order details'],
                    ],
                ],
                [
                    'title' => '🍽️ Continue',
                    'rows'  => [
                        ['id' => 'place_order', 'title' => '🛒 Order Again',  'description' => 'Place another order'],
                        ['id' => 'view_menu',   'title' => '📋 Browse Menu',  'description' => 'See what we offer'],
                    ],
                ],
                [
                    'title' => '💬 Support',
                    'rows'  => [
                        ['id' => 'contact_us', 'title' => '📞 Contact Us', 'description' => 'Get help from our team'],
                    ],
                ],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  ADMIN NOTIFICATION
    // ══════════════════════════════════════════
    private function notifyAdmin(Order $order, bool $isPickup, array $cart): void
    {
        $adminPhone = env('ADMIN_WHATSAPP');
        if (!$adminPhone) return;

        $type      = $isPickup ? '🏃 Pickup' : '🚗 Delivery';
        $menu = $this->getMenu();
        $itemsList = implode("\n", array_map(
            fn($kw, $qty) => "  • {$qty}x {$menu[$kw]['name']} — \$" . round($qty * $menu[$kw]['price'], 2),
            array_keys($cart),
            $cart
        ));

        $this->sendText(
            $adminPhone,
            "🔔 *New Order Alert!*\n" .
                "━━━━━━━━━━━━━━━━━━━━\n\n" .
                "🆔 Order: #{$order->id}\n" .
                "📱 Customer: +{$order->phone}\n" .
                "🕐 Time: " . now()->format('H:i') . "\n\n" .
                "🛒 *Items:*\n{$itemsList}\n\n" .
                "━━━━━━━━━━━━━━━━━━━━\n" .
                "💵 *Total: \${$order->total}*\n" .
                "{$type}\n" .
                "━━━━━━━━━━━━━━━━━━━━"
        );
    }

    // ══════════════════════════════════════════
    //  CART HELPERS
    // ══════════════════════════════════════════
    private function getCart(ConversationState $convo): array
    {
        return json_decode($convo->cart ?? '[]', true) ?? [];
    }

    private function saveCart(ConversationState $convo, array $cart): void
    {
        $convo->update(['cart' => json_encode($cart)]);
    }

    /** One-liner e.g. "🍗×2  🍔×1" */
    private function cartSummaryLine(array $cart): string
    {
        if (empty($cart)) return '_empty_';
        $menu = $this->getMenu();
        return implode('  ', array_map(
            fn($kw, $qty) => "{$menu[$kw]['emoji']}×{$qty}",
            array_keys($cart),
            $cart
        ));
    }

    /** Multi-line e.g. "  ✅ 2x Burger Combo — $10.00" */
    private function cartSummaryFull(array $cart): string
    {
        $menu = $this->getMenu();
        return implode("\n", array_map(
            fn($kw, $qty) => "  ✅ {$qty}x {$menu[$kw]['name']} — \$" . number_format($qty * $menu[$kw]['price'], 2),
            array_keys($cart),
            $cart
        ));
    }

    private function cartTotal(array $cart): float
    {
        $menu = $this->getMenu();
        return round(array_sum(array_map(
            fn($kw, $qty) => $qty * $menu[$kw]['price'],
            array_keys($cart),
            $cart
        )), 2);
    }

    // ══════════════════════════════════════════
    //  HELPERS
    // ══════════════════════════════════════════
    private function isGreeting(string $text): bool
    {
        return in_array($text, ['hi', 'hello', 'hey', 'start', 'menu', 'home', '0', 'restart']);
    }

    // ══════════════════════════════════════════
    //  WHATSAPP API SENDERS
    // ══════════════════════════════════════════
    private function sendText(string $phone, string $message)
    {
        return $this->call($phone, [
            'type' => 'text',
            'text' => ['body' => $message, 'preview_url' => false],
        ]);
    }

    private function sendButtons(string $phone, string $body, string $footer, array $buttons)
    {
        return $this->call($phone, [
            'type' => 'interactive',
            'interactive' => [
                'type'   => 'button',
                'body'   => ['text' => $body],
                'footer' => ['text' => $footer],
                'action' => [
                    'buttons' => array_map(fn($b) => [
                        'type'  => 'reply',
                        'reply' => ['id' => $b['id'], 'title' => mb_substr($b['title'], 0, 20)],
                    ], array_slice($buttons, 0, 3)),
                ],
            ],
        ]);
    }

    private function sendList(string $phone, string $body, string $footer, string $buttonLabel, array $sections)
    {
        return $this->call($phone, [
            'type' => 'interactive',
            'interactive' => [
                'type'   => 'list',
                'body'   => ['text' => $body],
                'footer' => ['text' => $footer],
                'action' => [
                    'button'   => mb_substr($buttonLabel, 0, 20),
                    'sections' => array_map(fn($s) => [
                        'title' => mb_substr($s['title'], 0, 24),
                        'rows'  => array_map(fn($r) => [
                            'id'          => $r['id'],
                            'title'       => mb_substr($r['title'], 0, 24),
                            'description' => mb_substr($r['description'] ?? '', 0, 72),
                        ], $s['rows']),
                    ], $sections),
                ],
            ],
        ]);
    }

    private function call(string $phone, array $payload)
    {
        $response = Http::withToken(env('WHATSAPP_TOKEN'))
            ->post(
                "https://graph.facebook.com/v19.0/" . env('WHATSAPP_PHONE_ID') . "/messages",
                array_merge(['messaging_product' => 'whatsapp', 'to' => $phone], $payload)
            );

        if (!$response->successful()) {
            Log::error('WhatsApp API error', [
                'to'     => $phone,
                'status' => $response->status(),
                'body'   => $response->json(),
            ]);
        }

        return response()->json(['status' => 'sent']);
    }
}
