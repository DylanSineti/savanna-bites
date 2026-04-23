import { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import { useTheme } from "../Context/ThemeContext";

const PAYMENT_METHODS = ["Cash", "EcoCash", "Card", "ZiG"];

const DEMO_ITEMS = [
    {
        id: 1,
        name: "Chicken & Chips",
        category: "Mains",
        price: 4.5,
        available: true,
        emoji: "🍗",
    },
    {
        id: 2,
        name: "Burger Combo",
        category: "Mains",
        price: 5.0,
        available: true,
        emoji: "🍔",
    },
    {
        id: 3,
        name: "Mazoe",
        category: "Drinks",
        price: 0.5,
        available: true,
        emoji: "🥤",
    },
    {
        id: 4,
        name: "Water",
        category: "Drinks",
        price: 0.3,
        available: true,
        emoji: "💧",
    },
];

export default function POS() {
    const { theme: t } = useTheme();
    const [menuItems, setMenuItems] = useState(DEMO_ITEMS);
    const [cart, setCart] = useState([]);
    const [category, setCategory] = useState("All");
    const [payMethod, setPayMethod] = useState("Cash");
    const [amountGiven, setAmountGiven] = useState("");
    const [note, setNote] = useState("");
    const [placing, setPlacing] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/menu-items", { headers: { Accept: "application/json" } })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                if (Array.isArray(data) && data.length) setMenuItems(data);
            })
            .catch(() => {});
    }, []);

    const addToCart = (item) => {
        setCart((prev) => {
            const ex = prev.find((i) => i.id === item.id);
            if (ex)
                return prev.map((i) =>
                    i.id === item.id ? { ...i, qty: i.qty + 1 } : i,
                );
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const removeOne = (id) => {
        setCart((prev) => {
            const ex = prev.find((i) => i.id === id);
            if (!ex) return prev;
            if (ex.qty === 1) return prev.filter((i) => i.id !== id);
            return prev.map((i) =>
                i.id === id ? { ...i, qty: i.qty - 1 } : i,
            );
        });
    };

    const clearCart = () => {
        setCart([]);
        setAmountGiven("");
        setNote("");
    };

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const change = parseFloat(amountGiven || 0) - subtotal;
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);

    const categories = [
        "All",
        ...new Set(menuItems.map((i) => i.category).filter(Boolean)),
    ];
    const filtered = menuItems.filter((item) => {
        const matchCat = category === "All" || item.category === category;
        const matchSearch = item.name
            .toLowerCase()
            .includes(search.toLowerCase());
        return matchCat && matchSearch && item.available !== false;
    });

    const placeOrder = async () => {
        if (!cart.length) return;
        setPlacing(true);
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const orderText = cart.map((i) => `${i.qty}x ${i.name}`).join(", ");
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf,
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    phone: "POS",
                    order_text: orderText,
                    total: subtotal.toFixed(2),
                    status: "pos",
                    note,
                    payment_method: payMethod,
                }),
            });
            const order = await res.json();
            setReceipt({
                id: order.id ?? Math.floor(Math.random() * 9999),
                items: [...cart],
                subtotal,
                payMethod,
                amountGiven: parseFloat(amountGiven || subtotal),
                change: Math.max(0, change),
                note,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            });
        } catch {
            setReceipt({
                id: Math.floor(Math.random() * 9999),
                items: [...cart],
                subtotal,
                payMethod,
                amountGiven: parseFloat(amountGiven || subtotal),
                change: Math.max(0, change),
                note,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            });
        }
        clearCart();
        setPlacing(false);
    };

    const quickAmounts = [5, 10, 20, 50].filter((a) => a >= subtotal - 0.01);

    return (
        <div
            className="flex min-h-screen"
            style={{
                background: t.bg,
                color: t.text,
                fontFamily: "'DM Sans', sans-serif",
                transition: "all .2s",
            }}
        >
            <Sidebar />

            <main
                className="flex flex-1 overflow-hidden"
                style={{ height: "100vh" }}
            >
                {/* ── LEFT: Menu Grid ── */}
                <div
                    className="flex flex-col flex-1 overflow-hidden"
                    style={{ borderRight: `1px solid ${t.border}` }}
                >
                    {/* Header — identical spacing to other pages */}
                    <div
                        className="flex items-start justify-between p-8 pb-4 mb-0"
                        style={{ borderBottom: `1px solid ${t.border}` }}
                    >
                        <div>
                            <h1 className="text-xl font-medium tracking-tight">
                                Point of Sale
                            </h1>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: t.muted }}
                            >
                                Tap items to add to the current order
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                                style={{
                                    background: t.cardBg,
                                    border: `1px solid ${t.border}`,
                                    color: t.muted,
                                }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {cartCount > 0
                                    ? `${cartCount} in cart`
                                    : "Ready"}
                            </div>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search items…"
                                className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-44"
                                style={{
                                    background: t.cardBg,
                                    border: `1px solid ${t.border}`,
                                    color: t.text,
                                }}
                            />
                        </div>
                    </div>

                    {/* Category tabs */}
                    <div
                        className="flex gap-2 px-8 py-3"
                        style={{ borderBottom: `1px solid ${t.border}` }}
                    >
                        {categories.map((c) => (
                            <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className="px-3 py-1 text-xs capitalize transition-all rounded-md"
                                style={{
                                    background:
                                        category === c
                                            ? t.navActive
                                            : "transparent",
                                    color: category === c ? t.text : t.muted,
                                    border: `1px solid ${category === c ? (t.isDark ? "#333" : "#ccc") : t.border}`,
                                }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    {/* Item grid */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div
                                className="flex items-center justify-center h-40 text-sm"
                                style={{ color: t.muted }}
                            >
                                No items found
                            </div>
                        ) : (
                            <div
                                className="grid gap-4"
                                style={{
                                    gridTemplateColumns:
                                        "repeat(auto-fill, minmax(140px, 1fr))",
                                }}
                            >
                                {filtered.map((item) => {
                                    const inCart = cart.find(
                                        (i) => i.id === item.id,
                                    );
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => addToCart(item)}
                                            className="relative p-4 text-left transition-all rounded-xl active:scale-95"
                                            style={{
                                                background: inCart
                                                    ? t.highlight
                                                    : t.cardBg,
                                                border: `1px solid ${inCart ? t.hlBorder : t.cardBorder}`,
                                            }}
                                        >
                                            <div className="mb-2 text-3xl">
                                                {item.emoji || "🍽️"}
                                            </div>
                                            <div
                                                className="mb-1 text-xs font-medium leading-tight"
                                                style={{ color: t.text }}
                                            >
                                                {item.name}
                                            </div>
                                            <div
                                                className="text-[10px] tracking-widest uppercase"
                                                style={{
                                                    color: t.muted,
                                                    fontFamily:
                                                        "DM Mono, monospace",
                                                }}
                                            >
                                                {item.category}
                                            </div>
                                            <div
                                                className="mt-1 text-sm font-medium"
                                                style={{
                                                    color: t.hlText,
                                                    fontFamily:
                                                        "DM Mono, monospace",
                                                }}
                                            >
                                                ${Number(item.price).toFixed(2)}
                                            </div>
                                            {inCart && (
                                                <div
                                                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                    style={{
                                                        background: t.hlText,
                                                        color: "#0a0a0a",
                                                    }}
                                                >
                                                    {inCart.qty}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Order Panel ── */}
                <div
                    className="flex flex-col shrink-0"
                    style={{ width: "320px", background: t.cardBg }}
                >
                    {/* Header */}
                    <div
                        className="flex items-start justify-between p-8 pb-4"
                        style={{ borderBottom: `1px solid ${t.border}` }}
                    >
                        <div>
                            <h1 className="text-xl font-medium tracking-tight">
                                Order
                            </h1>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: t.muted }}
                            >
                                {cartCount > 0
                                    ? `${cartCount} item${cartCount !== 1 ? "s" : ""} · $${subtotal.toFixed(2)}`
                                    : "Empty"}
                            </p>
                        </div>
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                    background: "transparent",
                                    border: `1px solid ${t.border}`,
                                    color: t.muted,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "#f87171";
                                    e.currentTarget.style.borderColor =
                                        "#7f1d1d";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = t.muted;
                                    e.currentTarget.style.borderColor =
                                        t.border;
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Spacer to align with category tabs */}
                    <div
                        style={{
                            height: "41px",
                            borderBottom: `1px solid ${t.border}`,
                        }}
                    />

                    {/* Cart items */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center h-full gap-2"
                                style={{ color: t.muted }}
                            >
                                <div className="text-4xl opacity-20">🛒</div>
                                <div className="text-sm">Tap items to add</div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                                        style={{ background: t.subBg }}
                                    >
                                        <div className="text-xl">
                                            {item.emoji || "🍽️"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="text-xs font-medium truncate"
                                                style={{ color: t.text }}
                                            >
                                                {item.name}
                                            </div>
                                            <div
                                                className="text-[10px] mt-0.5"
                                                style={{
                                                    color: t.muted,
                                                    fontFamily:
                                                        "DM Mono, monospace",
                                                }}
                                            >
                                                ${Number(item.price).toFixed(2)}{" "}
                                                × {item.qty}
                                            </div>
                                        </div>
                                        <div
                                            className="text-xs font-medium"
                                            style={{
                                                color: t.hlText,
                                                fontFamily:
                                                    "DM Mono, monospace",
                                            }}
                                        >
                                            $
                                            {(item.price * item.qty).toFixed(2)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() =>
                                                    removeOne(item.id)
                                                }
                                                className="flex items-center justify-center w-5 h-5 text-xs rounded"
                                                style={{
                                                    background: t.border,
                                                    color: t.muted,
                                                }}
                                            >
                                                −
                                            </button>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="flex items-center justify-center w-5 h-5 text-xs rounded"
                                                style={{
                                                    background: t.hlText,
                                                    color: "#0a0a0a",
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {cart.length > 0 && (
                        <div
                            className="p-4 space-y-3"
                            style={{ borderTop: `1px solid ${t.border}` }}
                        >
                            <div className="flex items-center justify-between px-1">
                                <span
                                    className="text-sm"
                                    style={{ color: t.muted }}
                                >
                                    Subtotal
                                </span>
                                <span
                                    className="text-2xl font-medium tracking-tight"
                                    style={{
                                        color: t.hlText,
                                        fontFamily: "DM Mono, monospace",
                                    }}
                                >
                                    ${subtotal.toFixed(2)}
                                </span>
                            </div>

                            <input
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Order note (optional)…"
                                className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                                style={{
                                    background: t.inputBg,
                                    border: `1px solid ${t.border}`,
                                    color: t.text,
                                }}
                            />

                            <div>
                                <div
                                    className="text-[10px] tracking-widest uppercase mb-2"
                                    style={{
                                        color: t.muted,
                                        fontFamily: "DM Mono, monospace",
                                    }}
                                >
                                    Payment
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PAYMENT_METHODS.map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setPayMethod(m)}
                                            className="py-1.5 rounded-lg text-xs font-medium transition-all"
                                            style={{
                                                background:
                                                    payMethod === m
                                                        ? t.hlText
                                                        : t.subBg,
                                                color:
                                                    payMethod === m
                                                        ? "#0a0a0a"
                                                        : t.muted,
                                                border: `1px solid ${payMethod === m ? t.hlText : t.border}`,
                                            }}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {payMethod === "Cash" && (
                                <div>
                                    <div
                                        className="text-[10px] tracking-widest uppercase mb-2"
                                        style={{
                                            color: t.muted,
                                            fontFamily: "DM Mono, monospace",
                                        }}
                                    >
                                        Amount Given
                                    </div>
                                    <input
                                        value={amountGiven}
                                        onChange={(e) =>
                                            setAmountGiven(e.target.value)
                                        }
                                        placeholder={`$${subtotal.toFixed(2)}`}
                                        type="number"
                                        step="0.01"
                                        className="w-full px-3 py-2 mb-2 text-sm rounded-lg focus:outline-none"
                                        style={{
                                            background: t.inputBg,
                                            border: `1px solid ${t.border}`,
                                            color: t.text,
                                            fontFamily: "DM Mono, monospace",
                                        }}
                                    />
                                    <div className="flex gap-1.5 flex-wrap">
                                        {quickAmounts.map((a) => (
                                            <button
                                                key={a}
                                                onClick={() =>
                                                    setAmountGiven(String(a))
                                                }
                                                className="px-2 py-1 text-xs transition-all rounded-lg"
                                                style={{
                                                    background: t.subBg,
                                                    color: t.muted,
                                                    border: `1px solid ${t.border}`,
                                                }}
                                            >
                                                ${a}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() =>
                                                setAmountGiven(
                                                    subtotal.toFixed(2),
                                                )
                                            }
                                            className="px-2 py-1 text-xs transition-all rounded-lg"
                                            style={{
                                                background: t.subBg,
                                                color: t.muted,
                                                border: `1px solid ${t.border}`,
                                            }}
                                        >
                                            Exact
                                        </button>
                                    </div>
                                    {amountGiven && change >= 0 && (
                                        <div
                                            className="flex justify-between px-3 py-2 mt-2 rounded-lg"
                                            style={{
                                                background: t.highlight,
                                                border: `1px solid ${t.hlBorder}`,
                                            }}
                                        >
                                            <span
                                                className="text-xs"
                                                style={{ color: t.hlText }}
                                            >
                                                Change
                                            </span>
                                            <span
                                                className="text-sm font-medium"
                                                style={{
                                                    color: t.hlText,
                                                    fontFamily:
                                                        "DM Mono, monospace",
                                                }}
                                            >
                                                ${change.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={placeOrder}
                                disabled={placing}
                                className="w-full py-3 text-sm font-semibold transition-all rounded-xl disabled:opacity-50"
                                style={{
                                    background: t.hlText,
                                    color: "#0a0a0a",
                                }}
                            >
                                {placing
                                    ? "Placing Order…"
                                    : `Place Order · $${subtotal.toFixed(2)}`}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Receipt Modal */}
            {receipt && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                    }}
                >
                    <div
                        style={{
                            background: t.cardBg,
                            borderRadius: "20px",
                            border: `1px solid ${t.border}`,
                            width: "300px",
                            overflow: "hidden",
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                background: "#0a0a0a",
                                padding: "20px 20px 16px",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    background: t.hlText,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    color: "#0a0a0a",
                                    margin: "0 auto 10px",
                                    letterSpacing: "-0.3px",
                                }}
                            >
                                SB
                            </div>
                            <div
                                style={{
                                    color: "#f0ede6",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                }}
                            >
                                Savanna Bites Express
                            </div>
                            <div
                                style={{
                                    color: "#555",
                                    fontSize: "11px",
                                    marginTop: "3px",
                                    fontFamily: "DM Mono, monospace",
                                }}
                            >
                                Order #{String(receipt.id).padStart(4, "0")} ·{" "}
                                {receipt.time}
                            </div>
                        </div>

                        {/* Dashed divider */}
                        <div
                            style={{
                                borderTop: `1.5px dashed ${t.border}`,
                                margin: "0 16px",
                            }}
                        />

                        {/* Items */}
                        <div style={{ padding: "14px 20px 10px" }}>
                            <div
                                style={{
                                    fontSize: "10px",
                                    letterSpacing: "1.5px",
                                    textTransform: "uppercase",
                                    color: t.muted,
                                    fontFamily: "DM Mono, monospace",
                                    marginBottom: "10px",
                                }}
                            >
                                Items
                            </div>
                            {receipt.items.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "baseline",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <div>
                                        <span
                                            style={{
                                                fontSize: "13px",
                                                color: t.text,
                                            }}
                                        >
                                            {item.qty}× {item.name}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                marginLeft: "6px",
                                            }}
                                        >
                                            {item.emoji}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "13px",
                                            fontFamily: "DM Mono, monospace",
                                            color: t.text,
                                        }}
                                    >
                                        ${(item.price * item.qty).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Dashed divider */}
                        <div
                            style={{
                                borderTop: `1.5px dashed ${t.border}`,
                                margin: "0 16px",
                            }}
                        />

                        {/* Totals */}
                        <div style={{ padding: "12px 20px" }}>
                            {[
                                ["Subtotal", `$${receipt.subtotal.toFixed(2)}`],
                                ["Payment", receipt.payMethod],
                                ...(receipt.payMethod === "Cash"
                                    ? [
                                          [
                                              "Given",
                                              `$${receipt.amountGiven.toFixed(2)}`,
                                          ],
                                      ]
                                    : []),
                                ...(receipt.note
                                    ? [["Note", receipt.note]]
                                    : []),
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "6px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: t.muted,
                                        }}
                                    >
                                        {label}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: t.muted,
                                            fontFamily: "DM Mono, monospace",
                                        }}
                                    >
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Change highlight */}
                        {receipt.payMethod === "Cash" && (
                            <div
                                style={{
                                    margin: "0 16px 16px",
                                    background: t.highlight,
                                    border: `1px solid ${t.hlBorder}`,
                                    borderRadius: "10px",
                                    padding: "12px 16px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: t.hlText,
                                        letterSpacing: "1px",
                                        textTransform: "uppercase",
                                        fontFamily: "DM Mono, monospace",
                                    }}
                                >
                                    Change
                                </span>
                                <span
                                    style={{
                                        fontSize: "22px",
                                        fontWeight: 500,
                                        fontFamily: "DM Mono, monospace",
                                        color: t.hlText,
                                    }}
                                >
                                    ${receipt.change.toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* Dashed divider */}
                        <div
                            style={{
                                borderTop: `1.5px dashed ${t.border}`,
                                margin: "0 16px",
                            }}
                        />

                        {/* Footer */}
                        <div
                            style={{
                                padding: "14px 20px",
                                textAlign: "center",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: t.muted,
                                    marginBottom: "4px",
                                }}
                            >
                                Thank you for your order!
                            </div>
                            <div
                                style={{
                                    fontSize: "11px",
                                    color: t.muted,
                                    opacity: 0.6,
                                }}
                            >
                                +263 77 247 6989 · savannabites.co.zw
                            </div>
                        </div>

                        {/* Buttons */}
                        <div
                            style={{
                                display: "flex",
                                gap: "8px",
                                padding: "0 16px 16px",
                            }}
                        >
                            <button
                                onClick={() => setReceipt(null)}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "10px",
                                    background: t.hlText,
                                    color: "#0a0a0a",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                New Order
                            </button>
                            <button
                                onClick={() => window.print()}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    background: "transparent",
                                    color: t.muted,
                                    fontSize: "13px",
                                    border: `1px solid ${t.border}`,
                                    cursor: "pointer",
                                }}
                            >
                                🖨️
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
