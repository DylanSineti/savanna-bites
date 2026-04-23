<?php

namespace App\Http\Controllers;

use App\Models\ConversationState;
use App\Models\MenuItem;
use App\Models\Order;
use App\Services\PaynowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    private ?array $menu    = null;
    private ?array $itemMap = null;

    // ─────────────────────────────────────────
    //  CONSTANTS
    // ─────────────────────────────────────────
    private const DIV  = "──────────────────────";
    private const DIV2 = "━━━━━━━━━━━━━━━━━";

    private const PAYNOW_POLL_TIMEOUT  = 90;
    private const PAYNOW_POLL_INTERVAL = 6;

    // ══════════════════════════════════════════
    //  MENU LOADER
    // ══════════════════════════════════════════
    private function getMenu(): array
    {
        if ($this->menu !== null) {
            return $this->menu;
        }

        $baseUrl = rtrim(config('app.public_url', config('app.url')), '/');

        $this->menu    = [];
        $this->itemMap = [];

        MenuItem::where('available', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->each(function ($row) use ($baseUrl) {
                $this->menu[$row->slug] = [
                    'name'        => $row->name,
                    'price'       => (float) $row->price,
                    'emoji'       => $row->emoji,
                    'description' => $row->description ?? '',
                    'category'    => $row->category ?? 'Mains',
                    'image_url'   => $row->image_path
                        ? "{$baseUrl}/storage/{$row->image_path}"
                        : null,
                ];
                $this->itemMap['order_' . $row->slug] = $row->slug;
            });

        return $this->menu;
    }

    private function getItemMap(): array
    {
        $this->getMenu();
        return $this->itemMap;
    }

    // ══════════════════════════════════════════
    //  WEBHOOK VERIFICATION
    // ══════════════════════════════════════════
    public function verify(Request $request)
    {
        $mode      = $request->query('hub.mode') ?? $request->query('hub_mode');
        $token     = $request->query('hub.verify_token') ?? $request->query('hub_verify_token');
        $challenge = $request->query('hub.challenge') ?? $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.whatsapp.verify_token')) {
            return response($challenge, 200);
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

        // Lowercased — used for button IDs and keyword matching
        $text = match ($type) {
            'text'        => strtolower(trim($msg['text']['body'] ?? '')),
            'interactive' => strtolower(trim(
                $msg['interactive']['button_reply']['id']
                    ?? $msg['interactive']['list_reply']['id']
                    ?? ''
            )),
            default => '',
        };

        // Raw (preserves digits/capitalisation) — used for phone number capture
        $rawText = match ($type) {
            'text'        => trim($msg['text']['body'] ?? ''),
            'interactive' => trim(
                $msg['interactive']['button_reply']['id']
                    ?? $msg['interactive']['list_reply']['id']
                    ?? ''
            ),
            default => '',
        };

        $convo = ConversationState::firstOrCreate(
            ['phone' => $phone],
            ['state' => 'idle', 'cart' => '[]', 'order_text' => null]
        );

        // ── Always allow restart ──
        if ($this->isGreeting($text)) {
            return $this->sendWelcome($phone, $convo);
        }

        // ── Review replies ──
        if (preg_match('/^review_(good|ok|bad)_(\d+)$/', $text, $m)) {
            return $this->handleReview($phone, $m[1], (int) $m[2], $convo);
        }

        // ── EcoCash number capture — intercept before any global routing ──
        if ($convo->state === 'awaiting_ecocash_number') {
            return $this->handleEcocashNumber($phone, $rawText, $convo);
        }

        // ── Awaiting EcoCash payment (USSD sent, polling in background) ──
        // The user may tap "Switch to Cash" during polling, or send random text.
        // This must be caught BEFORE global interceptors so pay_cash/pay_ecocash
        // don't hit handlePaymentChoice() with a stale/empty convo state.
        if ($convo->state === 'awaiting_ecocash_payment') {
            return $this->handleAwaitingEcocashPayment($phone, $text, $convo);
        }

        // ── Completed state ──
        if ($convo->state === 'completed') {
            if (!isset($this->getItemMap()[$text]) && $text !== 'reorder') {
                return match ($text) {
                    'place_order' => $this->sendOrderList($phone, $convo),
                    'view_menu'   => $this->sendMenu($phone),
                    'contact_us'  => $this->sendContact($phone),
                    'view_order'  => $this->sendViewOrder($phone, $convo),
                    default       => $this->sendCompletedMenu($phone),
                };
            }
        }

        // ── Global interceptors ──
        if ($text === 'reorder') {
            return $this->handleReorder($phone, $convo);
        }
        if ($text === 'checkout') {
            return $this->handleCartAction($phone, $text, $convo);
        }
        if (in_array($text, ['pickup', 'delivery'])) {
            return $this->handleDeliveryChoice($phone, $text, $convo);
        }
        if (in_array($text, ['pay_cash', 'pay_ecocash'])) {
            return $this->handlePaymentChoice($phone, $text, $convo);
        }
        if ($text === 'cash_amt_exact' || str_starts_with($text, 'cash_amt_')) {
            return $this->handleCashAmount($phone, $text, $convo);
        }
        if (in_array($text, ['qty_1', 'qty_2', 'qty_3'])) {
            return $this->handleQuantity($phone, $text, $convo);
        }
        if (isset($this->getItemMap()[$text])) {
            return $this->handleOrdering($phone, $text, $convo);
        }

        // ── State machine ──
        return match ($convo->state) {
            'idle'                    => $this->handleIdle($phone, $text, $convo),
            'main_menu'               => $this->handleMainMenu($phone, $text, $convo),
            'ordering'                => $this->handleOrdering($phone, $text, $convo),
            'awaiting_qty'            => $this->handleQuantity($phone, $text, $convo),
            'cart_action'             => $this->handleCartAction($phone, $text, $convo),
            'delivery_choice'         => $this->handleDeliveryChoice($phone, $text, $convo),
            'payment_choice'          => $this->handlePaymentChoice($phone, $text, $convo),
            'awaiting_cash_amount'    => $this->handleCashAmount($phone, $text, $convo),
            'awaiting_ecocash_number' => $this->handleEcocashNumber($phone, $rawText, $convo),
            'awaiting_feedback'       => $this->handleBadFeedback($phone, $rawText, $convo),
            default                   => $this->sendFallback($phone, $convo),
        };
    }

    // ══════════════════════════════════════════
    //  AWAITING ECOCASH PAYMENT
    //  Handles any message received while the Paynow poll is running
    //  in the background. order_text holds the Order ID at this point.
    // ══════════════════════════════════════════
    private function handleAwaitingEcocashPayment(string $phone, string $text, ConversationState $convo)
    {
        // Load the pending order so we can recover delivery type and cart
        $order = $convo->order_text
            ? Order::find((int) $convo->order_text, ['id', 'status', 'total', 'order_text', 'payment_status'])
            : null;

        // If somehow already paid (race condition), just show confirmation menu
        if ($order && $order->payment_status === 'paid') {
            $convo->update(['state' => 'completed']);
            return $this->sendCompletedMenu($phone);
        }

        // User tapped "Switch to Cash" — abort the EcoCash attempt
        if ($text === 'pay_cash') {
            if ($order) {
                // Mark the pending EcoCash order as abandoned
                $order->update(['payment_status' => 'failed']);

                // Rebuild cart from the order_text ("1 burger 2 chips" format)
                $cart     = $this->rebuildCartFromOrderText($order->order_text);
                $isPickup = $order->status === 'pickup';

                // Restore conversation to payment_choice with cart intact
                $convo->update([
                    'state'      => 'awaiting_cash_amount',
                    'cart'       => json_encode($cart),
                    'order_text' => $isPickup ? 'pickup' : 'delivery',
                ]);

                $total = round($this->cartTotal($cart) + ($isPickup ? 0.0 : 1.50), 2);
                return $this->sendCashAmountPicker($phone, $total, $isPickup);
            }

            // Fallback if order is missing — restart cleanly
            $convo->update(['state' => 'idle', 'cart' => '[]', 'order_text' => null]);
            return $this->sendWelcome($phone, $convo);
        }

        // User tapped "Retry EcoCash" or sent anything else — remind them to wait
        $orderNum = $order ? 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT) : '—';
        $total    = $order?->total ?? '?';

        return $this->sendButtons(
            $phone,
            "⏳ *Waiting for EcoCash confirmation...*\n\n"
                . self::DIV . "\n"
                . "🔖 Order *#{$orderNum}*   💵 *\${$total}*\n\n"
                . "Please check your phone and enter your EcoCash PIN to complete payment.\n\n"
                . "_We'll notify you here automatically once confirmed._\n\n"
                . self::DIV . "\n"
                . "If you'd like to cancel and pay with cash instead, tap below:",
            "Powered by Paynow  •  Secure & Instant",
            [
                ['id' => 'pay_cash', 'title' => '💵 Switch to Cash'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  WELCOME
    // ══════════════════════════════════════════
    private function sendWelcome(string $phone, ConversationState $convo)
    {
        $convo->update(['state' => 'main_menu', 'cart' => '[]', 'order_text' => null]);

        /** @var Order|null $lastOrder */
        $lastOrder = Order::where('phone', $phone)
            ->where('phone', '!=', 'POS')
            ->latest('id')
            ->first(['id', 'total']);

        if ($lastOrder) {
            return $this->sendButtons(
                $phone,
                "👋 *Welcome back to Savanna Bites!*\n\nGreat to see you again 🔥",
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
            "👋 *Welcome to Savanna Bites Express!*\n\nZimbabwe's favourite fast food 🔥\nFresh, fast & delivered to you!",
            "What would you like to do?",
            [
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
                ['id' => 'place_order', 'title' => '🛒 Place Order'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  IDLE / MAIN MENU
    // ══════════════════════════════════════════
    private function handleIdle(string $phone, string $text, ConversationState $convo)
    {
        return match ($text) {
            'place_order' => $this->sendOrderList($phone, $convo),
            'view_menu'   => $this->sendMenu($phone),
            'contact_us'  => $this->sendContact($phone),
            default       => $this->sendWelcome($phone, $convo),
        };
    }

    private function handleMainMenu(string $phone, string $text, ConversationState $convo)
    {
        return match ($text) {
            'view_menu',   '1' => $this->sendMenu($phone),
            'place_order', '2' => $this->sendOrderList($phone, $convo),
            'contact_us',  '3' => $this->sendContact($phone),
            'reorder'          => $this->handleReorder($phone, $convo),
            default            => $this->sendWelcome($phone, $convo),
        };
    }

    // ══════════════════════════════════════════
    //  STATIC MENU
    // ══════════════════════════════════════════
    private function sendMenu(string $phone)
    {
        $menu = $this->getMenu();

        if (empty($menu)) {
            return $this->sendText($phone, "⚠️ Our menu is unavailable right now. Please try again shortly.");
        }

        $last = null;
        foreach ($menu as $slug => $item) {
            $price    = number_format($item['price'], 2);
            $desc     = $item['description'];
            $bodyText = "*{$item['emoji']} {$item['name']}*"
                . ($desc ? "\n_{$desc}_" : '')
                . "\n\n💵 *\${$price}*";
            $btnTitle = mb_substr("🛒 Order {$item['name']}", 0, 20);

            $payload = [
                'type' => 'interactive',
                'interactive' => [
                    'type'   => 'button',
                    'header' => !empty($item['image_url'])
                        ? ['type' => 'image', 'image' => ['link' => $item['image_url']]]
                        : ['type' => 'text',  'text'  => "{$item['emoji']} {$item['name']}"],
                    'body'   => ['text' => $bodyText],
                    'footer' => ['text' => 'Savanna Bites Express'],
                    'action' => [
                        'buttons' => [
                            ['type' => 'reply', 'reply' => ['id' => "order_{$slug}", 'title' => $btnTitle]],
                        ],
                    ],
                ],
            ];

            $last = $this->call($phone, $payload);
        }

        return $last;
    }

    // ══════════════════════════════════════════
    //  ORDER LIST
    // ══════════════════════════════════════════
    private function sendOrderList(string $phone, ConversationState $convo, string $notice = '')
    {
        $convo->update(['state' => 'ordering']);
        $cart = $this->getCart($convo);
        $menu = $this->getMenu();

        $grouped = [];
        foreach ($menu as $slug => $item) {
            $grouped[$item['category']][] = [
                'id'          => "order_{$slug}",
                'title'       => $item['name'],
                'description' => '$' . number_format($item['price'], 2)
                    . ($item['description'] ? '  —  ' . $item['description'] : ''),
            ];
        }

        if (empty($cart)) {
            $sections = array_values(array_map(
                fn($cat, $rows) => ['title' => $cat, 'rows' => $rows],
                array_keys($grouped),
                $grouped
            ));

            return $this->sendList(
                $phone,
                "🛒 *What would you like to order?*\n\nBrowse our menu below and tap any item to add it to your cart.",
                "Savanna Bites Express",
                "Browse Menu",
                $sections
            );
        }

        $itemCount = array_sum($cart);
        $subtotal  = $this->cartTotal($cart);
        $itemWord  = $itemCount === 1 ? 'item' : 'items';

        $lines = [];
        foreach ($cart as $kw => $qty) {
            if (!isset($menu[$kw])) continue;
            $item    = $menu[$kw];
            $lines[] = "{$item['emoji']} *{$item['name']}*  ×{$qty}  →  \$"
                . number_format($qty * $item['price'], 2);
        }

        $noticeBlock = $notice ? "\n⚠️ {$notice}\n" : '';

        $body = "🛒 *Your Cart*  ({$itemCount} {$itemWord})"
            . $noticeBlock . "\n"
            . self::DIV . "\n"
            . implode("\n", $lines) . "\n"
            . self::DIV . "\n"
            . "💵 *Subtotal: \${$subtotal}*\n\n"
            . "➕ *Tap an item to add it, or checkout:*";

        $checkoutSection = [
            'title' => '✅ Ready?',
            'rows'  => [[
                'id'          => 'checkout',
                'title'       => '✅ Checkout',
                'description' => "{$itemCount} {$itemWord}  •  Subtotal \${$subtotal}",
            ]],
        ];

        $menuSections = array_values(array_map(
            fn($cat, $rows) => ['title' => $cat, 'rows' => $rows],
            array_keys($grouped),
            $grouped
        ));

        return $this->sendList(
            $phone,
            $body,
            "Tap checkout or pick another item",
            "View Cart & Menu",
            array_merge([$checkoutSection], $menuSections)
        );
    }

    // ══════════════════════════════════════════
    //  ITEM SELECTED → ASK QUANTITY
    // ══════════════════════════════════════════
    private function handleOrdering(string $phone, string $text, ConversationState $convo)
    {
        $itemMap = $this->getItemMap();

        if (!isset($itemMap[$text])) {
            return $this->sendOrderList($phone, $convo);
        }

        $keyword = $itemMap[$text];
        $item    = $this->getMenu()[$keyword];

        $convo->update(['state' => 'awaiting_qty', 'order_text' => $keyword]);

        $bodyText = "{$item['emoji']} *{$item['name']}*\n\${$item['price']} each\n\nHow many would you like?\n_(Or type any number, e.g. 5)_";

        $buttons = [
            ['id' => 'qty_1', 'title' => '1️⃣  1'],
            ['id' => 'qty_2', 'title' => '2️⃣  2'],
            ['id' => 'qty_3', 'title' => '3️⃣  3'],
        ];

        if (!empty($item['image_url'])) {
            return $this->call($phone, [
                'type' => 'interactive',
                'interactive' => [
                    'type'   => 'button',
                    'header' => ['type' => 'image', 'image' => ['link' => $item['image_url']]],
                    'body'   => ['text' => $bodyText],
                    'footer' => ['text' => 'Savanna Bites Express'],
                    'action' => ['buttons' => array_map(fn($b) => ['type' => 'reply', 'reply' => $b], $buttons)],
                ],
            ]);
        }

        return $this->sendButtons($phone, $bodyText, "Choose a quantity", $buttons);
    }

    // ══════════════════════════════════════════
    //  QUANTITY → ADD TO CART
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
                "⚠️ Please enter a number between 1 and 20, or tap a button:",
                "How many would you like?",
                [
                    ['id' => 'qty_1', 'title' => '1️⃣  1'],
                    ['id' => 'qty_2', 'title' => '2️⃣  2'],
                    ['id' => 'qty_3', 'title' => '3️⃣  3'],
                ]
            );
        }

        $keyword = $convo->order_text;
        $menu    = $this->getMenu();

        if (!isset($menu[$keyword])) {
            return $this->sendOrderList($phone, $convo);
        }

        $cart           = $this->getCart($convo);
        $cart[$keyword] = ($cart[$keyword] ?? 0) + $qty;

        $convo->update(['order_text' => null, 'cart' => json_encode($cart)]);

        return $this->sendCartReview($phone, $convo);
    }

    // ══════════════════════════════════════════
    //  CART REVIEW
    // ══════════════════════════════════════════
    private function sendCartReview(string $phone, ConversationState $convo): mixed
    {
        $cart = $this->getCart($convo);
        $menu = $this->getMenu();

        $itemCount = array_sum($cart);
        $subtotal  = $this->cartTotal($cart);
        $itemWord  = $itemCount === 1 ? 'item' : 'items';

        $lines = [];
        foreach ($cart as $kw => $qty) {
            if (!isset($menu[$kw])) continue;
            $item    = $menu[$kw];
            $lines[] = "  {$item['emoji']} *{$item['name']}*  ×{$qty}  →  \$"
                . number_format($qty * $item['price'], 2);
        }

        $body = "🛒 *Your Cart*  ({$itemCount} {$itemWord})\n"
            . self::DIV . "\n"
            . implode("\n", $lines) . "\n"
            . self::DIV . "\n"
            . "💵 *Subtotal: \${$subtotal}*\n\n"
            . "Ready to checkout or want to add more items?";

        $convo->update(['state' => 'cart_action']);

        return $this->sendButtons(
            $phone,
            $body,
            "Savanna Bites Express",
            [
                ['id' => 'checkout', 'title' => '✅ Checkout'],
                ['id' => 'add_more', 'title' => '➕ Add More'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  BROWSE MENU
    // ══════════════════════════════════════════
    private function sendBrowseMenu(string $phone): mixed
    {
        $menu = $this->getMenu();

        if (empty($menu)) {
            return $this->sendText($phone, "⚠️ Our menu is unavailable right now. Please try again shortly.");
        }

        $grouped = [];
        foreach ($menu as $slug => $item) {
            $grouped[$item['category']][] = [
                'id'          => "order_{$slug}",
                'title'       => $item['name'],
                'description' => '$' . number_format($item['price'], 2)
                    . ($item['description'] ? '  —  ' . $item['description'] : ''),
            ];
        }

        $sections = array_values(array_map(
            fn($cat, $rows) => ['title' => $cat, 'rows' => $rows],
            array_keys($grouped),
            $grouped
        ));

        return $this->sendList(
            $phone,
            "➕ *Add more items*\n\nTap any item below to add it to your cart:",
            "Savanna Bites Express",
            "Browse Menu",
            $sections
        );
    }

    // ══════════════════════════════════════════
    //  CART ACTION
    // ══════════════════════════════════════════
    private function handleCartAction(string $phone, string $text, ConversationState $convo)
    {
        if ($text === 'add_more') {
            $convo->update(['state' => 'ordering']);
            return $this->sendBrowseMenu($phone);
        }

        if ($text === 'checkout') {
            $cart = $this->getCart($convo);

            if (empty($cart)) {
                return $this->sendOrderList($phone, $convo, 'Your cart is empty. Please add an item first.');
            }

            $cartTotal = $this->cartTotal($cart);
            $summary   = $this->cartSummaryFull($cart);
            $count     = array_sum($cart);
            $word      = $count === 1 ? 'item' : 'items';

            $convo->update(['state' => 'delivery_choice', 'order_text' => null]);

            return $this->sendButtons(
                $phone,
                "🧾 *Order Summary*\n"
                    . self::DIV . "\n"
                    . "{$summary}\n"
                    . self::DIV . "\n"
                    . "📦 *{$count} {$word}*   💵 *Subtotal: \${$cartTotal}*\n\n"
                    . "How would you like to receive your order?",
                "Choose delivery method",
                [
                    ['id' => 'pickup',   'title' => '🏃 Pickup'],
                    ['id' => 'delivery', 'title' => '🚗 Delivery (+$1.50)'],
                ]
            );
        }

        return $this->sendCartReview($phone, $convo);
    }

    // ══════════════════════════════════════════
    //  DELIVERY CHOICE → PAYMENT METHOD
    // ══════════════════════════════════════════
    private function handleDeliveryChoice(string $phone, string $text, ConversationState $convo)
    {
        if (!in_array($text, ['pickup', 'delivery'])) {
            return $this->sendButtons(
                $phone,
                "⚠️ Please choose how you'd like to receive your order:",
                "Choose delivery method",
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

        $isPickup     = $text === 'pickup';
        $delivery     = $isPickup ? 0.0 : 1.50;
        $subtotal     = $this->cartTotal($cart);
        $total        = round($subtotal + $delivery, 2);
        $summary      = $this->cartSummaryFull($cart);
        $deliveryLine = !$isPickup ? "\n🚗 Delivery:  \$" . number_format($delivery, 2) : '';
        $typeLabel    = $isPickup ? '🏃 Pickup' : '🚗 Delivery';
        $cashLabel    = $isPickup ? '💵 Cash on Pickup' : '💵 Cash on Delivery';

        $convo->update(['state' => 'payment_choice', 'order_text' => $isPickup ? 'pickup' : 'delivery']);

        return $this->sendButtons(
            $phone,
            "💳 *How would you like to pay?*\n\n"
                . "{$summary}\n"
                . self::DIV2 . "\n"
                . "🛍️ Subtotal:  \${$subtotal}"
                . $deliveryLine . "\n"
                . "💵 *Total:    \${$total}*\n"
                . self::DIV2 . "\n"
                . "📦 {$typeLabel}",
            "Select your payment method",
            [
                ['id' => 'pay_cash',    'title' => mb_substr($cashLabel, 0, 20)],
                ['id' => 'pay_ecocash', 'title' => '📱 EcoCash (Paynow)'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  PAYMENT CHOICE
    // ══════════════════════════════════════════
    private function handlePaymentChoice(string $phone, string $text, ConversationState $convo)
    {
        if (!in_array($text, ['pay_cash', 'pay_ecocash'])) {
            $cart     = $this->getCart($convo);
            $isPickup = $convo->order_text === 'pickup';
            $total    = round($this->cartTotal($cart) + ($isPickup ? 0 : 1.50), 2);

            return $this->sendButtons(
                $phone,
                "⚠️ Please select a payment method:\n\n💵 *Total: \${$total}*",
                "Choose how to pay",
                [
                    ['id' => 'pay_cash',    'title' => '💵 Cash'],
                    ['id' => 'pay_ecocash', 'title' => '📱 EcoCash (Paynow)'],
                ]
            );
        }

        $convo->refresh();
        $cart = $this->getCart($convo);

        if (empty($cart)) {
            $convo->update(['state' => 'idle']);
            return $this->sendWelcome($phone, $convo);
        }

        $isPickup = $convo->order_text === 'pickup';
        $delivery = $isPickup ? 0.0 : 1.50;
        $total    = round($this->cartTotal($cart) + $delivery, 2);

        if ($text === 'pay_ecocash') {
            $convo->update([
                'state'      => 'awaiting_ecocash_number',
                'order_text' => 'ecocash_' . ($isPickup ? 'pickup' : 'delivery'),
            ]);

            return $this->sendButtons(
                $phone,
                "📱 *Pay \${$total} via EcoCash*\n\n"
                    . self::DIV . "\n"
                    . "💡 How it works:\n"
                    . "  1️⃣  Reply with your EcoCash number\n"
                    . "  2️⃣  You'll get a USSD prompt on your phone\n"
                    . "  3️⃣  Enter your PIN to confirm payment\n"
                    . "  4️⃣  We'll send your order confirmation here\n"
                    . self::DIV . "\n\n"
                    . "📲 *Type your EcoCash number now:*\n"
                    . "_e.g. 0771234567_",
                "Powered by Paynow  •  Secure & Instant",
                [
                    ['id' => 'pay_cash', 'title' => '💵 Switch to Cash'],
                ]
            );
        }

        // Cash path
        $convo->update(['state' => 'awaiting_cash_amount']);
        return $this->sendCashAmountPicker($phone, $total, $isPickup);
    }

    // ══════════════════════════════════════════
    //  ECOCASH — collect number → initiate USSD push → poll
    // ══════════════════════════════════════════
    private function handleEcocashNumber(string $phone, string $rawText, ConversationState $convo)
    {
        $convo->refresh();
        $cart = $this->getCart($convo);

        if (empty($cart)) {
            $convo->update(['state' => 'idle']);
            return $this->sendWelcome($phone, $convo);
        }

        $isPickup = str_ends_with((string) $convo->order_text, 'pickup');
        $delivery = $isPickup ? 0.0 : 1.50;
        $total    = round($this->cartTotal($cart) + $delivery, 2);

        // Handle "Switch to Cash" button tapped from the EcoCash number prompt
        if (strtolower($rawText) === 'pay_cash') {
            $convo->update(['state' => 'awaiting_cash_amount', 'order_text' => $isPickup ? 'pickup' : 'delivery']);
            return $this->sendCashAmountPicker($phone, $total, $isPickup);
        }

        // ── Number validation ──
        $digits = preg_replace('/\D/', '', $rawText);
        if (str_starts_with($digits, '263') && strlen($digits) === 12) {
            $digits = '0' . substr($digits, 3);
        }
        $validFormat = (bool) preg_match('/^07[1-9]\d{7}$/', $digits);

        if (!$validFormat) {
            return $this->sendButtons(
                $phone,
                "❌ *Invalid EcoCash Number*\n\n"
                    . self::DIV . "\n"
                    . "The number *{$rawText}* doesn't look right.\n\n"
                    . "Please enter a valid Zimbabwe EcoCash number:\n"
                    . "  • Format: *07X XXX XXXX*\n"
                    . "  • Example: *0771234567*\n"
                    . "  • Or with code: *+263771234567*\n"
                    . self::DIV . "\n\n"
                    . "💵 *Amount due: \${$total}*\n\n"
                    . "Type your number to try again, or switch to cash:",
                "Savanna Bites Express",
                [
                    ['id' => 'pay_cash', 'title' => '💵 Switch to Cash'],
                ]
            );
        }

        // ── Create order ──
        $orderText = implode(' ', array_map(
            fn($kw, $qty) => "{$qty} {$kw}",
            array_keys($cart),
            $cart
        ));

        $order = Order::create([
            'phone'          => $phone,
            'order_text'     => $orderText,
            'total'          => $total,
            'status'         => $isPickup ? 'pickup' : 'delivery',
            'order_type'     => $isPickup ? 'pickup' : 'delivery',
            'payment_method' => 'ecocash',
            'payment_status' => 'pending',
        ]);

        $orderNum = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);

        // Lock conversation — order_text now holds the Order ID
        $convo->update([
            'state'      => 'awaiting_ecocash_payment',
            'cart'       => '[]',
            'order_text' => (string) $order->id,
        ]);

        $this->sendText(
            $phone,
            "⏳ *Sending EcoCash prompt to {$digits}...*\n\n"
                . "Please keep your phone nearby — a USSD prompt will appear in a few seconds.\n\n"
                . "🔖 *Order #{$orderNum}*   💵 *\${$total}*"
        );

        // ── Initiate Paynow USSD push ──
        $paynow = new PaynowService();
        $result = $paynow->initiateEcocash($order, $digits);

        if (!$result['success']) {
            $order->update(['payment_status' => 'failed']);
            // Restore cart and delivery type so they can retry cleanly
            $convo->update([
                'state'      => 'payment_choice',
                'cart'       => json_encode($cart),
                'order_text' => $isPickup ? 'pickup' : 'delivery',
            ]);

            return $this->sendButtons(
                $phone,
                "❌ *EcoCash Payment Failed*\n\n"
                    . self::DIV . "\n"
                    . "We couldn't send the USSD prompt to *{$digits}*.\n\n"
                    . "_Reason: " . ($result['error'] ?? 'Unable to reach Paynow') . "_\n\n"
                    . "Common fixes:\n"
                    . "  • Check the number is EcoCash-registered\n"
                    . "  • Make sure your EcoCash wallet is active\n"
                    . "  • Try again in a moment\n"
                    . self::DIV . "\n\n"
                    . "💵 *Total: \${$total}*  •  Your cart is saved:",
                "Choose how to pay",
                [
                    ['id' => 'pay_ecocash', 'title' => '📱 Retry EcoCash'],
                    ['id' => 'pay_cash',    'title' => '💵 Pay with Cash'],
                ]
            );
        }

        $pollUrl   = $result['pollUrl'];
        $reference = $result['reference'] ?? $orderNum;

        $notifyOrder    = $order;
        $notifyIsPickup = $isPickup;
        $notifyCart     = $cart;
        $notifyPhone    = $phone;
        $controller     = $this;

        dispatch(static function () use (
            $controller, $notifyOrder, $notifyIsPickup, $notifyCart, $pollUrl, $notifyPhone
        ) {
            $controller->pollAndFinalise(
                $notifyOrder, $notifyIsPickup, $notifyCart, $pollUrl, $notifyPhone
            );
        })->afterResponse();

        return $this->sendButtons(
            $phone,
            "✅ *USSD Prompt Sent!*\n\n"
                . self::DIV . "\n"
                . "📱 *{$digits}* — check your phone now\n\n"
                . "To complete payment:\n"
                . "  1️⃣  Open the USSD prompt on your phone\n"
                . "  2️⃣  Enter your *EcoCash PIN*\n"
                . "  3️⃣  Confirm the amount of *\${$total}*\n\n"
                . self::DIV . "\n"
                . "🔖 Ref: *{$reference}*   💵 *\${$total}*\n\n"
                . "_Confirmation will arrive here within 30 seconds._",
            "Powered by Paynow  •  Secure & Instant",
            [
                ['id' => 'pay_cash', 'title' => '💵 Switch to Cash'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  PAYNOW POLL LOOP — runs after HTTP response is sent
    // ══════════════════════════════════════════
    public function pollAndFinalise(
        Order $order,
        bool $isPickup,
        array $cart,
        string $pollUrl,
        string $phone
    ): void {
        $paynow  = new PaynowService();
        $elapsed = 0;
        $paid    = false;

        while ($elapsed < self::PAYNOW_POLL_TIMEOUT) {
            sleep(self::PAYNOW_POLL_INTERVAL);
            $elapsed += self::PAYNOW_POLL_INTERVAL;

            try {
                $status = $paynow->checkPaymentStatus($pollUrl);

                Log::info('Paynow poll', [
                    'order_id' => $order->id,
                    'status'   => $status['status'] ?? 'unknown',
                    'elapsed'  => $elapsed,
                ]);

                if (($status['paid'] ?? false) === true) {
                    $paid = true;
                    break;
                }

                if (in_array(strtolower($status['status'] ?? ''), ['cancelled', 'failed', 'disputed'])) {
                    break;
                }
            } catch (\Throwable $e) {
                Log::error('Paynow poll exception', [
                    'order_id' => $order->id,
                    'message'  => $e->getMessage(),
                ]);
            }
        }

        // Re-check if user already switched to cash mid-poll (payment_status = 'failed'
        // set by handleAwaitingEcocashPayment). Don't overwrite or re-notify in that case.
        $order->refresh();
        if ($order->payment_status === 'failed' && !$paid) {
            // User already handled this via "Switch to Cash" — do nothing
            return;
        }

        if ($paid) {
            $order->update(['payment_status' => 'paid']);
            $this->sendEcocashConfirmation($phone, $order, $isPickup, $cart);
            $this->notifyAdmin($order, $isPickup, $cart, 'ecocash', null);
        } else {
            $order->update(['payment_status' => 'failed']);

            $orderNum = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);

            /** @var ConversationState|null $convo */
            $convo = ConversationState::where('phone', $phone)->first();

            // Only restore cart if the user hasn't already moved on
            // (e.g. they switched to cash or restarted the convo)
            if ($convo && $convo->state === 'awaiting_ecocash_payment') {
                $convo->update([
                    'state'      => 'payment_choice',
                    'cart'       => json_encode($cart),
                    'order_text' => $isPickup ? 'pickup' : 'delivery',
                ]);

                $this->sendButtons(
                    $phone,
                    "⏰ *Payment Timed Out*\n\n"
                        . self::DIV . "\n"
                        . "🔖 Order *#{$orderNum}*   💵 *\${$order->total}*\n\n"
                        . "We didn't receive EcoCash confirmation in time.\n\n"
                        . "This usually happens when:\n"
                        . "  • The USSD prompt wasn't answered in time\n"
                        . "  • An incorrect PIN was entered\n"
                        . "  • Insufficient EcoCash balance\n"
                        . "  • No network at time of payment\n\n"
                        . self::DIV . "\n"
                        . "✅ Your cart has been restored. Try again:",
                    "Choose how to pay",
                    [
                        ['id' => 'pay_ecocash', 'title' => '📱 Retry EcoCash'],
                        ['id' => 'pay_cash',    'title' => '💵 Pay with Cash'],
                    ]
                );
            }
        }
    }

    // ══════════════════════════════════════════
    //  ECOCASH CONFIRMATION — sent after successful poll
    // ══════════════════════════════════════════
    private function sendEcocashConfirmation(
        string $phone,
        Order $order,
        bool $isPickup,
        array $cart
    ): void {
        $delivery    = $isPickup ? 0.0 : 1.50;
        $subtotal    = $this->cartTotal($cart);
        $total       = round($subtotal + $delivery, 2);
        $summary     = $this->cartSummaryFull($cart);
        $deliverLine = !$isPickup ? "🚗 Delivery:  \$" . number_format($delivery, 2) . "\n" : "";
        $etaLine     = $isPickup ? "📍 Pickup ready in *20–30 mins*" : "🚗 Delivery ETA *30–45 mins*";
        $orderNum    = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);

        /** @var ConversationState|null $convo */
        $convo = ConversationState::where('phone', $phone)->first();
        if ($convo) {
            $convo->update([
                'state'      => 'completed',
                'order_text' => (string) $order->id,
            ]);
        }

        $this->sendList(
            $phone,
            "🎉 *Payment Confirmed!*\n\n"
                . "🔖 Order *#{$orderNum}*\n\n"
                . "{$summary}\n"
                . self::DIV2 . "\n"
                . "🛍️ Subtotal:  \${$subtotal}\n"
                . $deliverLine
                . "💵 *Total:    \${$total}*\n"
                . self::DIV2 . "\n\n"
                . "📱 *EcoCash:* ✅ *Payment Received*\n"
                . "_Powered by Paynow_\n\n"
                . "{$etaLine}\n\n"
                . "Thank you for choosing *Savanna Bites!* 🙏",
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
    //  CASH AMOUNT PICKER
    // ══════════════════════════════════════════
    private function sendCashAmountPicker(string $phone, float $total, bool $isPickup): mixed
    {
        $typeLabel = $isPickup ? 'Pickup' : 'Delivery';

        $denominations = [1, 2, 5, 10, 20, 50, 100];
        $suggestions   = [];
        foreach ($denominations as $d) {
            if ($d >= $total) {
                $suggestions[] = $d;
                if (count($suggestions) === 3) break;
            }
        }
        $pad = 100;
        while (count($suggestions) < 3) {
            $pad += 50;
            if (!in_array($pad, $suggestions)) $suggestions[] = $pad;
        }

        $rows = [[
            'id'          => 'cash_amt_exact',
            'title'       => '✅ Exact — $' . number_format($total, 2),
            'description' => 'No change needed',
        ]];

        foreach ($suggestions as $d) {
            if ((float) $d === $total) continue;
            $rows[] = [
                'id'          => 'cash_amt_' . $d,
                'title'       => '$' . number_format($d, 2),
                'description' => '🔄 Change: $' . number_format(round($d - $total, 2), 2),
            ];
        }

        return $this->sendList(
            $phone,
            "💵 *Cash on {$typeLabel}*\n\nYour total is *\${$total}*.\n\nSelect the note you'll be paying with so we can prepare your change:",
            "Savanna Bites Express",
            "Choose Amount",
            [['title' => '💵 Select Amount', 'rows' => $rows]]
        );
    }

    // ══════════════════════════════════════════
    //  CASH AMOUNT SELECTED → CONFIRM ORDER
    // ══════════════════════════════════════════
    private function handleCashAmount(string $phone, string $text, ConversationState $convo)
    {
        $convo->refresh();
        $cart     = $this->getCart($convo);
        $isPickup = $convo->order_text === 'pickup';
        $delivery = $isPickup ? 0.0 : 1.50;
        $total    = round($this->cartTotal($cart) + $delivery, 2);

        if ($text === 'cash_amt_exact') {
            $amount = $total;
        } elseif (str_starts_with($text, 'cash_amt_')) {
            $amount = (float) substr($text, 9);
        } elseif (is_numeric($text)) {
            $amount = (float) $text;
        } else {
            return $this->sendCashAmountPicker($phone, $total, $isPickup);
        }

        if ($amount < $total) {
            return $this->sendCashAmountPicker($phone, $total, $isPickup);
        }

        return $this->confirmCashOrder($phone, $convo, $cart, $isPickup, [
            'tendered' => $amount,
            'change'   => round($amount - $total, 2),
        ]);
    }

    // ══════════════════════════════════════════
    //  CONFIRM CASH ORDER
    // ══════════════════════════════════════════
    private function confirmCashOrder(
        string $phone,
        ConversationState $convo,
        array $cart,
        bool $isPickup,
        array $cashInfo
    ) {
        $delivery    = $isPickup ? 0.0 : 1.50;
        $subtotal    = $this->cartTotal($cart);
        $total       = round($subtotal + $delivery, 2);
        $status      = $isPickup ? 'pickup' : 'delivery';
        $summary     = $this->cartSummaryFull($cart);
        $deliverLine = !$isPickup ? "🚗 Delivery:  \$" . number_format($delivery, 2) . "\n" : "";
        $etaLine     = $isPickup ? "📍 Pickup ready in *20–30 mins*" : "🚗 Delivery ETA *30–45 mins*";
        $typeLabel   = $isPickup ? 'Pickup' : 'Delivery';
        $tendered    = number_format($cashInfo['tendered'] ?? $total, 2);
        $change      = $cashInfo['change'] ?? 0;
        $changeNote  = $change > 0
            ? "   🔄 *Change due: \$" . number_format($change, 2) . "*"
            : "   ✅ Exact amount — no change needed";

        $orderText = implode(' ', array_map(
            fn($kw, $qty) => "{$qty} {$kw}",
            array_keys($cart),
            $cart
        ));

        $order = Order::create([
            'phone'          => $phone,
            'order_text'     => $orderText,
            'total'          => $total,
            'status'         => $status,
            'order_type'     => $status,
            'payment_method' => 'cash',
            'payment_status' => 'pending',
        ]);

        $orderNum = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);

        $convo->update([
            'state'      => 'completed',
            'cart'       => '[]',
            'order_text' => (string) $order->id,
        ]);

        $notifyOrder    = $order;
        $notifyIsPickup = $isPickup;
        $notifyCart     = $cart;
        $notifyCash     = $cashInfo;
        $controller     = $this;

        dispatch(static function () use ($controller, $notifyOrder, $notifyIsPickup, $notifyCart, $notifyCash) {
            $controller->notifyAdmin($notifyOrder, $notifyIsPickup, $notifyCart, 'cash', $notifyCash);
        })->afterResponse();

        $paymentNote =
            "💵 *Payment:* Cash on {$typeLabel}\n"
            . "   Paying with: *\${$tendered}*\n"
            . $changeNote;

        return $this->sendList(
            $phone,
            "✅ *Order Confirmed!*\n\n"
                . "🔖 Order *#{$orderNum}*\n\n"
                . "{$summary}\n"
                . self::DIV2 . "\n"
                . "🛍️ Subtotal:  \${$subtotal}\n"
                . $deliverLine
                . "💵 *Total:    \${$total}*\n"
                . self::DIV2 . "\n\n"
                . "{$paymentNote}\n\n"
                . "{$etaLine}\n\n"
                . "Thank you for choosing *Savanna Bites!* 🙏",
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
    //  REORDER
    // ══════════════════════════════════════════
    private function handleReorder(string $phone, ConversationState $convo)
    {
        /** @var Order|null $lastOrder */
        $lastOrder = Order::where('phone', $phone)
            ->where('phone', '!=', 'POS')
            ->whereNotNull('order_text')
            ->latest('id')
            ->first(['order_text']);

        if (!$lastOrder) {
            return $this->sendOrderList($phone, $convo);
        }

        $cart = $this->rebuildCartFromOrderText($lastOrder->order_text);
        $menu = $this->getMenu();
        $cart = array_filter($cart, fn($kw) => isset($menu[$kw]), ARRAY_FILTER_USE_KEY);

        if (empty($cart)) {
            $this->sendText($phone, "⚠️ Some items from your last order are no longer available. Let's start fresh!");
            return $this->sendOrderList($phone, $convo);
        }

        $convo->update(['state' => 'delivery_choice', 'order_text' => null, 'cart' => json_encode($cart)]);

        $summary   = $this->cartSummaryFull($cart);
        $cartTotal = $this->cartTotal($cart);

        return $this->sendButtons(
            $phone,
            "🔁 *Reorder from last time:*\n\n{$summary}\n"
                . self::DIV2 . "\n"
                . "💵 *Subtotal: \${$cartTotal}*\n"
                . self::DIV2 . "\n\n"
                . "How would you like to receive your order?",
            "Choose delivery method",
            [
                ['id' => 'pickup',   'title' => '🏃 Pickup'],
                ['id' => 'delivery', 'title' => '🚗 Delivery (+$1.50)'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  REVIEW HANDLER
    // ══════════════════════════════════════════
    private function handleReview(string $phone, string $sentiment, int $orderId, ConversationState $convo): mixed
    {
        /** @var Order|null $order */
        $order = Order::find($orderId, ['id', 'phone', 'rating']);

        if ($order && $order->phone === $phone) {
            $order->update(['rating' => match ($sentiment) {
                'good'  => 5,
                'ok'    => 3,
                default => 1,
            }]);
        }

        if ($sentiment === 'bad') {
            $convo->update(['state' => 'awaiting_feedback', 'order_text' => (string) $orderId]);
            return $this->sendText(
                $phone,
                "😔 *We're really sorry to hear that!*\n\nYour experience matters to us. Could you tell us what went wrong so we can fix it? ✍️"
            );
        }

        $msg = $sentiment === 'good'
            ? "🎉 *Thank you so much!*\n\nWe're thrilled you loved it! ⭐⭐⭐⭐⭐\n\nSee you next time at *Savanna Bites!* 😊"
            : "🙏 *Thanks for the feedback!*\n\nWe'll keep working to make every order amazing. ⭐⭐⭐\n\nHope to see you again soon!";

        return $this->sendButtons($phone, $msg, "Anything else?", [
            ['id' => 'place_order', 'title' => '🛒 Order Again'],
            ['id' => 'view_menu',   'title' => '📋 View Menu'],
            ['id' => 'contact_us',  'title' => '📞 Contact Us'],
        ]);
    }

    // ══════════════════════════════════════════
    //  BAD FEEDBACK
    // ══════════════════════════════════════════
    private function handleBadFeedback(string $phone, string $text, ConversationState $convo): mixed
    {
        $orderId = (int) $convo->order_text;

        /** @var Order|null $order */
        $order = Order::find($orderId, ['id', 'phone']);

        if ($order && $order->phone === $phone) {
            $order->update(['review' => $text]);
        }

        $convo->update(['state' => 'completed']);

        return $this->sendButtons(
            $phone,
            "🙏 *Thank you for letting us know.*\n\nWe've noted your feedback and our team will look into this right away.\n\nFor immediate help: 📞 +263 77 247 6989",
            "What would you like to do next?",
            [
                ['id' => 'place_order', 'title' => '🛒 Order Again'],
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  CONTACT
    // ══════════════════════════════════════════
    private function sendContact(string $phone)
    {
        return $this->sendButtons(
            $phone,
            "📞 *Contact Savanna Bites*\n\n📱 Phone: +263 77 247 6989\n🕐 Hours: Mon–Sat 8am–9pm\n\n_Our team will assist you shortly!_",
            "Anything else?",
            [
                ['id' => 'place_order', 'title' => '🛒 Place Order'],
                ['id' => 'view_menu',   'title' => '📋 View Menu'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  VIEW ORDER
    // ══════════════════════════════════════════
    private function sendViewOrder(string $phone, ConversationState $convo)
    {
        /** @var Order|null $order */
        $order = $convo->order_text
            ? Order::find(
                (int) $convo->order_text,
                ['id', 'phone', 'status', 'payment_method', 'payment_status', 'total', 'created_at']
              )
            : null;

        if (!$order) {
            return $this->sendCompletedMenu($phone);
        }

        $typeIcon  = $order->status === 'delivery' ? '🚗 Delivery' : '🏃 Pickup';
        $payIcon   = ($order->payment_method ?? 'cash') === 'ecocash' ? '📱 EcoCash' : '💵 Cash';
        $payStatus = match ($order->payment_status ?? 'pending') {
            'paid'   => '✅ Paid',
            'failed' => '❌ Failed',
            default  => '⏳ Pending',
        };
        $placedAt  = $order->created_at->format('H:i, d M Y');

        return $this->sendButtons(
            $phone,
            "🔍 *Order Details*\n\n"
                . "🆔 Reference: *#SB" . str_pad($order->id, 5, '0', STR_PAD_LEFT) . "*\n"
                . "🕐 Placed: {$placedAt}\n"
                . "📦 Type: {$typeIcon}\n"
                . "💳 Payment: {$payIcon} — {$payStatus}\n"
                . self::DIV2 . "\n"
                . "🟡 Status: *" . ucfirst($order->status) . "*\n"
                . "💵 *Total: \${$order->total}*\n"
                . self::DIV2 . "\n\n"
                . "_For updates, contact our team below._",
            "Need anything else?",
            [
                ['id' => 'place_order', 'title' => '🛒 Order Again'],
                ['id' => 'contact_us',  'title' => '📞 Contact Us'],
                ['id' => 'view_menu',   'title' => '📋 Browse Menu'],
            ]
        );
    }

    // ══════════════════════════════════════════
    //  COMPLETED MENU
    // ══════════════════════════════════════════
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
    //  FALLBACK
    // ══════════════════════════════════════════
    private function sendFallback(string $phone, ConversationState $convo)
    {
        $convo->update(['state' => 'idle']);
        return $this->sendWelcome($phone, $convo);
    }

    // ══════════════════════════════════════════
    //  ADMIN NOTIFICATION
    // ══════════════════════════════════════════
    public function notifyAdmin(Order $order, bool $isPickup, array $cart, string $payMethod, ?array $cashInfo): void
    {
        $adminPhone = config('services.whatsapp.admin_phone');
        if (!$adminPhone) return;

        $type = $isPickup ? '🏃 Pickup' : '🚗 Delivery';
        $menu = $this->getMenu();

        $itemsList = implode("\n", array_map(
            fn($kw, $qty) => "  • {$qty}x {$menu[$kw]['name']} — \$" . number_format($qty * $menu[$kw]['price'], 2),
            array_keys($cart),
            $cart
        ));

        if ($payMethod === 'ecocash') {
            $payLine = '📱 EcoCash (Paynow) ✅ Paid';
        } else {
            $typeLabel = $isPickup ? 'Pickup' : 'Delivery';
            $tendered  = number_format($cashInfo['tendered'] ?? $order->total, 2);
            $change    = number_format($cashInfo['change'] ?? 0, 2);
            $payLine   = "💵 Cash on {$typeLabel}  |  Paying: \${$tendered}  |  Change: \${$change}";
        }

        $orderNum = 'SB' . str_pad($order->id, 5, '0', STR_PAD_LEFT);

        $this->sendText(
            $adminPhone,
            "🔔 *New Order Alert!*\n"
                . self::DIV2 . "\n\n"
                . "🔖 Order: *#{$orderNum}*\n"
                . "📱 Customer: +{$order->phone}\n"
                . "🕐 Time: " . now()->format('H:i') . "\n\n"
                . "🛒 *Items:*\n{$itemsList}\n\n"
                . self::DIV2 . "\n"
                . "💵 *Total: \${$order->total}*\n"
                . "{$type}  |  {$payLine}\n"
                . self::DIV2
        );
    }

    // ══════════════════════════════════════════
    //  CART HELPERS
    // ══════════════════════════════════════════
    private function getCart(ConversationState $convo): array
    {
        return json_decode($convo->cart ?? '[]', true) ?? [];
    }

    private function cartSummaryFull(array $cart): string
    {
        $menu = $this->getMenu();
        return implode("\n", array_map(
            fn($kw, $qty) => "  {$menu[$kw]['emoji']} *{$qty}x {$menu[$kw]['name']}*  —  \$"
                . number_format($qty * $menu[$kw]['price'], 2),
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

    /**
     * Rebuild a cart array from order_text format: "1 burger 2 chips ..."
     * Used when recovering a cart from a previously created Order record.
     */
    private function rebuildCartFromOrderText(string $orderText): array
    {
        $parts = preg_split('/\s+/', trim($orderText));
        $cart  = [];
        for ($i = 0; $i + 1 < count($parts); $i += 2) {
            $qty = (int) $parts[$i];
            $kw  = $parts[$i + 1];
            if ($qty > 0 && $kw) $cart[$kw] = $qty;
        }
        return $cart;
    }

    private function isGreeting(string $text): bool
    {
        return in_array($text, ['hi', 'hello', 'hey', 'start', 'menu', 'home', '0', 'restart'], true);
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
        $response = Http::withToken(config('services.whatsapp.token'))
            ->timeout(8)
            ->post(
                "https://graph.facebook.com/v19.0/" . config('services.whatsapp.phone_id') . "/messages",
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
