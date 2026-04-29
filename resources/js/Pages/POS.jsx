import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "../Components/Sidebar";
import { useTheme } from "../Context/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById("pos-fonts")) return;
  const l = document.createElement("link");
  l.id = "pos-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
}

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const STATUS_FLOW_DELIVERY_CASH    = ["pending", "preparing", "out_for_delivery"];
const STATUS_FLOW_PICKUP_CASH      = ["pending", "preparing", "ready"];
const STATUS_FLOW_DELIVERY_ECOCASH = ["pending", "preparing", "out_for_delivery", "completed"];
const STATUS_FLOW_PICKUP_ECOCASH   = ["pending", "preparing", "ready", "completed"];

const getFlow = (order) => {
  const isCash   = order?.payment_method === "cash";
  const isPickup = order?.order_type     === "pickup";
  if (isCash) return isPickup ? STATUS_FLOW_PICKUP_CASH      : STATUS_FLOW_DELIVERY_CASH;
  return            isPickup ? STATUS_FLOW_PICKUP_ECOCASH   : STATUS_FLOW_DELIVERY_ECOCASH;
};

const nextSt = (s, order) => {
  if (s === "pickup" || s === "delivery") return "preparing";
  const flow = getFlow(order);
  const i    = flow.indexOf(s);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
};

const STATUS = {
  pending:          { label: "Pending",           short: "Pending",  color: "#f59e0b" },
  pickup:           { label: "Pickup Order",       short: "Pickup",   color: "#f59e0b" },
  delivery:         { label: "Delivery Order",     short: "Delivery", color: "#38bdf8" },
  preparing:        { label: "Preparing",          short: "Prep",     color: "#3b82f6" },
  ready:            { label: "Ready to Collect",   short: "Ready",    color: "#10b981" },
  out_for_delivery: { label: "Out for Delivery",   short: "On Way",   color: "#a78bfa" },
  completed:        { label: "Completed",          short: "Done",     color: "#6b7280" },
};

const PAY = {
  cash:    { label: "Cash",    color: "#f59e0b" },
  ecocash: { label: "EcoCash", color: "#a78bfa" },
};

const ECO = {
  pending: { label: "Awaiting payment", color: "#f59e0b" },
  manual:  { label: "Manual — verify",  color: "#38bdf8" },
  paid:    { label: "Confirmed paid",   color: "#10b981" },
  failed:  { label: "Failed",           color: "#ef4444" },
};

const PALETTE = ["#f59e0b","#3b82f6","#10b981","#a78bfa","#ef4444","#06b6d4","#f97316","#ec4899"];

/* ─────────────────────────────────────────────────────────────
   CHROME HELPER
───────────────────────────────────────────────────────────── */
function chrome(t) {
  const dark = t.isDark ?? (typeof t.bg === "string" && (t.bg.startsWith("#0") || t.bg === "#0a0a0a"));
  return {
    dark,
    cardBg:   t.cardBg   ?? (dark ? "rgba(255,255,255,.025)" : "#fff"),
    subBg:    t.subBg    ?? (dark ? "rgba(255,255,255,.04)"  : "#f5f5f3"),
    inputBg:  t.inputBg  ?? (dark ? "rgba(255,255,255,.05)"  : "#fff"),
    rowHover: t.rowHover ?? (dark ? "rgba(255,255,255,.04)"  : "rgba(0,0,0,.035)"),
    border:   t.border   ?? (dark ? "rgba(255,255,255,.08)"  : "rgba(0,0,0,.09)"),
    dimSep:               dark ? "rgba(255,255,255,.05)"  : "rgba(0,0,0,.06)",
    text:     t.text     ?? (dark ? "rgba(255,255,255,.88)"  : "#111"),
    muted:    t.muted    ?? (dark ? "rgba(255,255,255,.32)"  : "#888"),
    faint:                dark ? "rgba(255,255,255,.1)"   : "rgba(0,0,0,.1)",
    hlText:   t.hlText   ?? "#4ade80",
    queueBg:              dark ? "rgba(0,0,0,.25)"        : "rgba(0,0,0,.03)",
  };
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const csrf   = () => document.querySelector('meta[name="csrf-token"]')?.content ?? "";
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf(), Accept: "application/json", ...opts.headers },
    ...opts,
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

const money    = (n) => "$" + Number(n || 0).toFixed(2);
const ac       = (s = "") => { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return PALETTE[Math.abs(h) % PALETTE.length]; };
const initials = (s = "") => s.replace(/\D/g, "").slice(-4, -2) || s.replace(/\+/g, "").slice(0, 2).toUpperCase() || "?";

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return s + "s"; const m = Math.floor(s / 60);
  if (m < 60) return m + "m"; return Math.floor(m / 60) + "h " + (m % 60) + "m";
}
const ageColor = (d) => { const m = Math.floor((Date.now() - new Date(d)) / 60000); return m < 10 ? "#10b981" : m < 25 ? "#f59e0b" : "#ef4444"; };

/* ─────────────────────────────────────────────────────────────
   ATOMS
───────────────────────────────────────────────────────────── */
function Avatar({ name, sz = 36 }) {
  const col = ac(name);
  return (
    <div style={{
      width: sz, height: sz, borderRadius: 4, flexShrink: 0,
      background: col + "18", color: col,
      border: "1.5px solid " + col + "40",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "JetBrains Mono,monospace", fontWeight: 700,
      fontSize: sz * 0.32, userSelect: "none",
    }}>
      {initials(name)}
    </div>
  );
}

function Tick({ at }) {
  const [, re] = useState(0);
  useEffect(() => { const id = setInterval(() => re(n => n + 1), 20000); return () => clearInterval(id); }, []);
  return (
    <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, fontWeight: 600, color: ageColor(at), letterSpacing: "0.04em" }}>
      {timeAgo(at)}
    </span>
  );
}

function StatusChip({ status }) {
  const cfg = STATUS[status] ?? STATUS.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "JetBrains Mono,monospace", fontSize: 10,
      letterSpacing: "0.09em", textTransform: "uppercase",
      color: cfg.color, background: cfg.color + "18",
      border: "1px solid " + cfg.color + "35",
      padding: "3px 9px", borderRadius: 3, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.short}
    </span>
  );
}

function SecHead({ children, c }) {
  return (
    <div style={{
      fontFamily: "JetBrains Mono,monospace", fontSize: 9,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: c.muted, padding: "18px 24px 10px",
      borderBottom: "1px solid " + c.dimSep, marginBottom: 2,
    }}>{children}</div>
  );
}

function Skeleton({ c }) {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "16px 20px", borderBottom: "1px solid " + c.border, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 4, background: c.subBg, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 10, width: "45%", borderRadius: 3, background: c.subBg, marginBottom: 8 }} />
            <div style={{ height: 8, width: "70%", borderRadius: 3, background: c.subBg }} />
          </div>
          <div style={{ height: 20, width: 48, borderRadius: 3, background: c.subBg }} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ORDER CARD
───────────────────────────────────────────────────────────── */
function OrderCard({ order, selected, onClick, c }) {
  const sc   = STATUS[order.status] ?? STATUS.pending;
  const tot  = parseFloat(order.total) || 0;
  const paid = order.payment_status === "paid";
  const txt  = (order.order_text ?? "").replace(/\n+/g, " · ").trim();
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "14px 18px 13px 20px",
        borderBottom: "1px solid " + c.dimSep,
        background: selected
          ? (c.dark ? sc.color + "14" : sc.color + "09")
          : hover ? c.rowHover : "transparent",
        cursor: "pointer",
        transition: "background .12s",
        borderLeft: "3px solid " + (selected ? sc.color : "transparent"),
        animation: "posIn .25s ease both",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={order.phone} sz={36} />
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* row 1 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 12, fontWeight: 600, color: c.text, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                +{order.phone}
              </div>
              <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: c.muted, marginTop: 2, letterSpacing: "0.04em" }}>
                #{String(order.id).padStart(4, "0")}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 16, fontWeight: 700, color: c.hlText, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                {money(tot)}
              </div>
              <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, fontWeight: 600, marginTop: 2, color: paid ? "#10b981" : "#f87171" }}>
                {paid ? "✓ paid" : "unpaid"}
              </div>
            </div>
          </div>

          {/* items */}
          <p style={{ margin: "0 0 8px", fontFamily: "Manrope,sans-serif", fontSize: 12, color: c.muted, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {txt || "—"}
          </p>

          {/* chips row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusChip status={order.status} />
            <span style={{ fontFamily: "Manrope,sans-serif", fontSize: 11, color: c.muted }}>
              {PAY[order.payment_method]?.label ?? "EcoCash"}
            </span>
            {order.payment_method === "cash" && (parseFloat(order.amount_paid) || 0) > 0 && order.payment_status !== "paid" && (
              <>
                <span style={{ color: c.faint, fontSize: 10 }}>·</span>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "#38bdf8" }}>
                  {money(order.amount_paid)}
                </span>
              </>
            )}
            <span style={{ marginLeft: "auto" }}>
              <Tick at={order.created_at} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FILTER BAR
───────────────────────────────────────────────────────────── */
function FilterBar({ orders, filter, setFilter, c }) {
  const tabs = [
    { k: "all",              l: "All" },
    { k: "pending",          l: "Pending" },
    { k: "pickup",           l: "Pickup" },
    { k: "delivery",         l: "Delivery" },
    { k: "preparing",        l: "Prep" },
    { k: "ready",            l: "Ready" },
    { k: "out_for_delivery", l: "On Way" },
  ];
  return (
    <div style={{ display: "flex", gap: 2, padding: "8px 12px", borderBottom: "1px solid " + c.border, overflowX: "auto", flexShrink: 0 }}>
      {tabs.map(tab => {
        const count = tab.k === "all" ? orders.length : orders.filter(o => o.status === tab.k).length;
        const on    = filter === tab.k;
        const col   = tab.k === "all" ? c.text : (STATUS[tab.k]?.color ?? c.muted);
        return (
          <button key={tab.k} onClick={() => setFilter(tab.k)} style={{
            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 3, border: "none",
            background: on ? col + "18" : "transparent",
            color: on ? col : c.muted,
            fontFamily: "JetBrains Mono,monospace", fontSize: 10,
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all .1s",
            borderBottom: on ? "2px solid " + col : "2px solid transparent",
            marginBottom: -1,
          }}>
            {tab.l}
            <span style={{
              fontFamily: "JetBrains Mono,monospace", fontSize: 9,
              padding: "1px 5px", borderRadius: 2,
              background: on ? col + "25" : c.faint,
              color: on ? col : c.muted,
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STATUS BLOCK — timeline + advance CTA
───────────────────────────────────────────────────────────── */
function StatusBlock({ order, onAdvance, onCompleteAndPay, saving, c }) {
  const flow     = getFlow(order);
  const idx      = flow.indexOf(order.status);
  const next     = nextSt(order.status, order);
  const nCfg     = next ? STATUS[next] : null;
  const pct      = flow.length > 1 ? (idx / (flow.length - 1)) * 100 : 100;
  const isCash   = order.payment_method === "cash";

  // Cash orders: the final advance button becomes "Collected/Delivered & Paid"
  const isPreFinal = isCash && (
    (order.order_type === "pickup"   && order.status === "ready") ||
    (order.order_type === "delivery" && order.status === "out_for_delivery")
  );

  const completedAlready = order.status === "completed";

  return (
    <div style={{ padding: "0 24px 24px" }}>

      {/* progress track */}
      <div style={{ position: "relative", marginBottom: 24, paddingTop: 4 }}>
        {/* track */}
        <div style={{ position: "absolute", top: 11, left: 14, right: 14, height: 2, background: c.border, zIndex: 0 }} />
        {/* fill */}
        <div style={{
          position: "absolute", top: 11, left: 14, height: 2, zIndex: 1,
          width: "calc(" + pct + "% - 0px)",
          background: STATUS[order.status]?.color ?? "#888",
          transition: "width .4s cubic-bezier(.23,1,.32,1)",
        }} />

        {/* dots */}
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          {flow.map((s, i) => {
            const done = i <= idx;
            const cur  = i === idx;
            const cfg  = STATUS[s];
            return (
              <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: done ? cfg.color : c.subBg,
                  border: "2px solid " + (done ? cfg.color : c.border),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontFamily: "JetBrains Mono,monospace", fontWeight: 700,
                  color: done ? "#fff" : c.muted,
                  boxShadow: cur ? "0 0 0 5px " + cfg.color + "25" : "none",
                  transition: "all .25s",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{
                  fontFamily: "JetBrains Mono,monospace", fontSize: 9,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  fontWeight: cur ? 700 : 400,
                  color: done ? cfg.color : c.muted,
                  whiteSpace: "nowrap",
                }}>{cfg.short}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      {completedAlready ? (
        <div style={{
          textAlign: "center", padding: "13px 0",
          borderRadius: 5, background: "rgba(74,222,128,.08)",
          border: "1px solid rgba(74,222,128,.25)",
          fontFamily: "JetBrains Mono,monospace", fontSize: 11,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#4ade80",
        }}>
          ✓ Order Completed
        </div>
      ) : isPreFinal ? (
        // Final cash action — completes order + confirms payment in one tap
        <button onClick={onCompleteAndPay} disabled={saving} style={{
          width: "100%", padding: "14px",
          borderRadius: 5, border: "none",
          background: "#10b981", color: "#fff",
          fontFamily: "JetBrains Mono,monospace", fontSize: 12,
          letterSpacing: "0.1em", textTransform: "uppercase",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
          boxShadow: "0 4px 20px rgba(16,185,129,.4)",
          transition: "opacity .15s, box-shadow .15s",
        }}>
          {saving ? "Completing…" : order.order_type === "pickup"
            ? "✓ Collected & Paid"
            : "✓ Delivered & Paid"}
        </button>
      ) : next ? (
        // Normal advance button for all other statuses
        <button onClick={onAdvance} disabled={saving} style={{
          width: "100%", padding: "14px",
          borderRadius: 5, border: "none",
          background: nCfg.color, color: "#fff",
          fontFamily: "JetBrains Mono,monospace", fontSize: 12,
          letterSpacing: "0.1em", textTransform: "uppercase",
          fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
          boxShadow: "0 4px 20px " + nCfg.color + "40",
          transition: "opacity .15s, box-shadow .15s",
        }}>
          {saving ? "Updating…" : "→ Mark as " + nCfg.label}
        </button>
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAY BLOCK
───────────────────────────────────────────────────────────── */
function PayBlock({ order, c, amt, setAmt, saving, marking, onSave, onCashFull, onEcoPaid }) {
  const tot    = parseFloat(order.total) || 0;
  const paid   = parseFloat(order.amount_paid) || 0;
  const full   = order.payment_status === "paid";
  const stated = !full && paid > 0;
  const stChange = stated ? Math.max(0, paid - tot) : 0;
  const pct    = full ? 100 : 0;
  const ent    = parseFloat(amt);
  const chg    = !isNaN(ent) && ent > tot ? ent - tot : 0;

  if (order.payment_method === "cash") {
    return (
      <div style={{ padding: "0 24px 4px" }}>
        {/* totals row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: c.muted, marginBottom: 4 }}>Order Total</div>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 20, fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>{money(tot)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: c.muted, marginBottom: 4 }}>
              {full ? "Received" : stated ? "Cust. Stated" : "Collected"}
            </div>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 20, fontWeight: 700, color: full ? "#10b981" : stated ? "#38bdf8" : "#f59e0b", letterSpacing: "-0.02em" }}>
              {paid > 0 ? money(paid) : "—"}
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div style={{ height: 4, borderRadius: 99, background: c.border, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: "100%", width: pct + "%", borderRadius: 99, background: full ? "#10b981" : "#f59e0b", transition: "width .4s" }} />
        </div>

        {full ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 5, background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.25)" }}>
            <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 12, color: "#4ade80", letterSpacing: "0.1em" }}>✓ FULLY PAID</span>
          </div>
        ) : stated ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 4, background: "rgba(56,189,248,.07)", border: "1px solid rgba(56,189,248,.25)", marginBottom: 12, borderLeft: "3px solid #38bdf8" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#38bdf8", marginBottom: 4 }}>📱 Customer Will Pay</div>
                <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 24, fontWeight: 700, color: "#38bdf8", letterSpacing: "-0.03em" }}>{money(paid)}</div>
              </div>
              {stChange > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#fbbf24", marginBottom: 4 }}>Give Change</div>
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 24, fontWeight: 700, color: "#fbbf24", letterSpacing: "-0.03em" }}>{money(stChange)}</div>
                </div>
              )}
            </div>
            <button onClick={onCashFull} disabled={marking} style={{
              width: "100%", padding: "14px", borderRadius: 5, border: "none",
              background: "#10b981", color: "#fff",
              fontFamily: "JetBrains Mono,monospace", fontSize: 12,
              letterSpacing: "0.1em", textTransform: "uppercase",
              fontWeight: 700, cursor: marking ? "not-allowed" : "pointer",
              opacity: marking ? 0.6 : 1, boxShadow: "0 4px 20px rgba(16,185,129,.35)",
            }}>
              {marking ? "Confirming…" : "✓ Cash Collected — Mark as Paid"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: c.muted, marginBottom: 8 }}>
              Cash Received
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontFamily: "JetBrains Mono,monospace", fontSize: 15, color: c.muted, pointerEvents: "none" }}>$</span>
              <input
                type="number" step="0.01" min="0"
                value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "12px 12px 12px 28px",
                  borderRadius: 4, border: "1.5px solid " + c.border,
                  background: c.inputBg, color: c.text,
                  fontFamily: "JetBrains Mono,monospace", fontSize: 18, fontWeight: 600,
                  outline: "none", letterSpacing: "-0.01em",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(16,185,129,.5)"}
                onBlur={e => e.target.style.borderColor = c.border}
              />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              <button onClick={() => setAmt(tot.toFixed(2))} style={{ padding: "5px 11px", borderRadius: 3, background: c.subBg, border: "1px solid " + c.border, color: c.muted, fontFamily: "JetBrains Mono,monospace", fontSize: 10, cursor: "pointer" }}>
                Exact {money(tot)}
              </button>
              {[5, 10, 20, 50].filter(d => d > tot).slice(0, 3).map(d => (
                <button key={d} onClick={() => setAmt(String(d))} style={{ padding: "5px 11px", borderRadius: 3, background: c.subBg, border: "1px solid " + c.border, color: c.muted, fontFamily: "JetBrains Mono,monospace", fontSize: 10, cursor: "pointer" }}>
                  ${d}
                </button>
              ))}
            </div>
            {chg > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 4, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", marginBottom: 10, borderLeft: "3px solid #fbbf24" }}>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "#fbbf24", letterSpacing: "0.08em", textTransform: "uppercase" }}>Give Change</span>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 18, fontWeight: 700, color: "#fbbf24", letterSpacing: "-0.02em" }}>{money(chg)}</span>
              </div>
            )}
            <button
              onClick={ent >= tot ? onCashFull : onSave}
              disabled={saving || marking || isNaN(ent) || ent <= 0}
              style={{
                width: "100%", padding: "14px",
                borderRadius: 5, border: "none",
                background: (isNaN(ent) || ent <= 0) ? c.subBg : ent >= tot ? "#10b981" : "#f59e0b",
                color: (isNaN(ent) || ent <= 0) ? c.muted : "#fff",
                fontFamily: "JetBrains Mono,monospace", fontSize: 12,
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontWeight: 700,
                cursor: (saving || marking || isNaN(ent) || ent <= 0) ? "not-allowed" : "pointer",
                opacity: (saving || marking) ? 0.6 : 1,
                boxShadow: (isNaN(ent) || ent <= 0) ? "none" : ent >= tot ? "0 4px 20px rgba(16,185,129,.35)" : "0 4px 16px rgba(245,158,11,.3)",
                transition: "background .2s, box-shadow .2s",
              }}
            >
              {(saving || marking) ? "Confirming…"
                : (isNaN(ent) || ent <= 0) ? "Enter cash amount above"
                : ent >= tot ? "✓ Confirm " + money(ent) + " — Mark as Paid"
                : "Record " + money(ent) + " Partial Payment"}
            </button>
          </>
        )}
      </div>
    );
  }

  // EcoCash
  const ecoSt = ECO[order.payment_status] ?? { label: order.payment_status, color: "#6b7280" };
  return (
    <div style={{ padding: "0 24px 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 5, background: ecoSt.color + "10", border: "1px solid " + ecoSt.color + "30", borderLeft: "3px solid " + ecoSt.color, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: ecoSt.color, marginBottom: 3 }}>{ecoSt.label}</div>
          {order.payment_reference && (
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, color: c.muted }}>Ref: {order.payment_reference}</div>
          )}
        </div>
        <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 22, fontWeight: 700, color: ecoSt.color, letterSpacing: "-0.02em" }}>{money(tot)}</span>
      </div>
      {order.payment_status !== "paid" ? (
        <button onClick={onEcoPaid} disabled={marking} style={{
          width: "100%", padding: "13px", borderRadius: 5, border: "none",
          background: "#10b981", color: "#fff",
          fontFamily: "JetBrains Mono,monospace", fontSize: 11,
          letterSpacing: "0.1em", textTransform: "uppercase",
          fontWeight: 700, cursor: marking ? "not-allowed" : "pointer",
          opacity: marking ? 0.6 : 1, boxShadow: "0 4px 20px rgba(16,185,129,.35)",
        }}>
          {marking ? "Confirming…" : "✓ Confirm EcoCash Received"}
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 5, background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.25)" }}>
          <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 11, color: "#4ade80", letterSpacing: "0.1em" }}>✓ ECOCASH CONFIRMED</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ASSIGN BLOCK
───────────────────────────────────────────────────────────── */
function AssignBlock({ order, team, onAssign, c }) {
  const current = order.assigned_to;

  if (!team.length) {
    return (
      <div style={{ padding: "0 24px 20px" }}>
        <p style={{ margin: 0, fontFamily: "Manrope,sans-serif", fontSize: 12, color: c.muted }}>
          No active staff — add them in the Team page
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 24px 20px" }}>
      <div style={{ borderRadius: 8, border: "1px solid " + c.border, overflow: "hidden" }}>
        {team.map((m, i) => {
          const on     = current === m.id;
          const col    = ac(m.name);
          const isLast = i === team.length - 1;

          return (
            <button
              key={m.id}
              onClick={() => onAssign(on ? "" : String(m.id))}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "13px 16px",
                borderBottom: isLast ? "none" : "1px solid " + c.dimSep,
                background: on ? (c.dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.025)") : "transparent",
                border: "none",
                borderBottom: isLast ? "none" : "1px solid " + c.dimSep,
                cursor: "pointer", textAlign: "left",
                transition: "background .12s",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: col + "18",
                border: "1.5px solid " + col + (on ? "60" : "30"),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "JetBrains Mono,monospace", fontWeight: 700,
                fontSize: 12, color: col, letterSpacing: "0.03em",
                transition: "border-color .15s",
              }}>
                {m.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "Manrope,sans-serif", fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  color: on ? c.text : c.muted,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  transition: "color .12s",
                }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, color: c.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>
                  {m.role}
                </div>
              </div>
              {on ? (
                <div style={{
                  fontFamily: "JetBrains Mono,monospace", fontSize: 9,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "3px 8px", borderRadius: 3,
                  background: col + "18", color: col,
                  border: "1px solid " + col + "35", flexShrink: 0,
                }}>
                  Assigned
                </div>
              ) : (
                <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: "1.5px solid " + c.border, background: "transparent" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DETAIL PANEL
───────────────────────────────────────────────────────────── */
function DetailPanel({ order, team, c, amt, setAmt, saving, savingStatus, marking, onSave, onCashFull, onEcoPaid, onAssign, onAdvance, onCompleteAndPay }) {
  const tot = parseFloat(order.total) || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px 18px", borderBottom: "1px solid " + c.border, background: c.subBg, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar name={order.phone} sz={46} />
            <div>
              <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 14, fontWeight: 600, color: c.text, letterSpacing: "0.02em", lineHeight: 1.2 }}>
                +{order.phone}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: c.muted }}>#{String(order.id).padStart(4, "0")}</span>
                <span style={{ color: c.faint }}>·</span>
                <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: c.muted }}>
                  {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ color: c.faint }}>·</span>
                <Tick at={order.created_at} />
              </div>
            </div>
          </div>
          <StatusChip status={order.status} />
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", background: c.cardBg }}>

        {/* Items */}
        <SecHead c={c}>Order Items</SecHead>
        <div style={{ padding: "4px 24px 20px" }}>
          <div style={{ padding: "14px 16px", borderRadius: 5, background: c.subBg, border: "1px solid " + c.border }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "Manrope,sans-serif", fontSize: 13, lineHeight: 1.7, color: c.text }}>
              {order.order_text}
            </pre>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px dashed " + c.border }}>
              <span style={{ fontFamily: "Manrope,sans-serif", fontSize: 12, color: c.muted }}>
                via {PAY[order.payment_method]?.label ?? "EcoCash"}
                {order.order_type && <span style={{ marginLeft: 8 }}>{order.order_type === "pickup" ? "· 🏃 Pickup" : "· 🚗 Delivery"}</span>}
              </span>
              <span style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 26, fontWeight: 700, color: c.hlText, letterSpacing: "-0.03em" }}>
                {money(tot)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: c.border }} />

        {/* Payment */}
        <SecHead c={c}>{order.payment_method === "cash" ? "Cash Collection" : "EcoCash Payment"}</SecHead>
        <PayBlock order={order} c={c} amt={amt} setAmt={setAmt} saving={saving} marking={marking} onSave={onSave} onCashFull={onCashFull} onEcoPaid={onEcoPaid} />

        <div style={{ height: 1, background: c.border, margin: "16px 0 0" }} />

        {/* Assign Staff */}
        <SecHead c={c}>Assign to Staff</SecHead>
        <AssignBlock order={order} team={team} onAssign={onAssign} c={c} />

        <div style={{ height: 1, background: c.border, margin: "16px 0 0" }} />

        {/* Status */}
        <SecHead c={c}>Order Progress</SecHead>
        <StatusBlock
          order={order}
          onAdvance={onAdvance}
          onCompleteAndPay={onCompleteAndPay}
          saving={savingStatus}
          c={c}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────── */
function EmptyDetail({ orders, c }) {
  const stats = [
    { l: "Pending",   n: orders.filter(o => o.status === "pending").length,          col: "#f59e0b" },
    { l: "Preparing", n: orders.filter(o => o.status === "preparing").length,        col: "#3b82f6" },
    { l: "Ready",     n: orders.filter(o => o.status === "ready").length,            col: "#10b981" },
    { l: "On Way",    n: orders.filter(o => o.status === "out_for_delivery").length, col: "#a78bfa" },
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, background: c.cardBg, padding: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 300 }}>
        {stats.map(s => (
          <div key={s.l} style={{
            padding: "20px 16px", borderRadius: 6, textAlign: "center",
            border: "1px solid " + (s.n > 0 ? s.col + "30" : c.border),
            background: s.n > 0 ? s.col + "08" : c.subBg,
            borderLeft: s.n > 0 ? "3px solid " + s.col : "3px solid transparent",
            transition: "all .2s",
          }}>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 40, fontWeight: 700, color: s.n > 0 ? s.col : c.faint, letterSpacing: "-0.04em", lineHeight: 1 }}>
              {s.n}
            </div>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: s.n > 0 ? s.col : c.muted, marginTop: 8 }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontFamily: "Manrope,sans-serif", fontSize: 13, color: c.muted, letterSpacing: "0.02em" }}>
        Select an order to manage it
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
export default function POS() {
  const { theme: t } = useTheme();
  const c       = chrome(t);
  const isMobile = useIsMobile();

  const [orders, setOrders]             = useState([]);
  const [team, setTeam]                 = useState([]);
  const [selected, setSelected]         = useState(null);
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [amt, setAmt]                   = useState("");
  const [saving, setSaving]             = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [marking, setMarking]           = useState(false);

  useEffect(() => { injectFonts(); }, []);

  const fetchQueue = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await apiFetch("/api/orders/pos-queue");
      setOrders(data);
      setLastRefresh(new Date());
      setSelected(prev => prev ? (data.find(o => o.id === prev.id) ?? prev) : null);
    } catch { /* silent */ } finally { setLoading(false); setRefreshing(false); }
  }, []);

  const fetchTeam = useCallback(async () => {
    try { const data = await apiFetch("/api/team"); setTeam(data.filter(m => m.is_active)); }
    catch { setTeam([]); }
  }, []);

  useEffect(() => {
    fetchQueue(); fetchTeam();
    const id = setInterval(fetchQueue, 30_000);
    return () => clearInterval(id);
  }, [fetchQueue, fetchTeam]);

  useEffect(() => {
    if (selected) setAmt((parseFloat(selected.amount_paid) || 0) > 0 ? String(selected.amount_paid) : "");
  }, [selected?.id]);

  const patchOrder = async (id, body) => {
    const data = await apiFetch("/api/orders/" + id, { method: "PATCH", body: JSON.stringify(body) });
    if (data.status === "completed" || data.status === "pos") {
      setOrders(prev => prev.filter(o => o.id !== id));
      if (selected?.id === id) setSelected(null);
    } else {
      setOrders(prev => prev.map(o => o.id === id ? data : o));
      if (selected?.id === id) setSelected(data);
    }
    return data;
  };

  const handleSave = async () => {
    if (!selected) return;
    const v = parseFloat(amt);
    if (isNaN(v) || v < 0) return;
    setSaving(true);
    try {
      const p = { amount_paid: v };
      if (v >= parseFloat(selected.total)) p.payment_status = "paid";
      await patchOrder(selected.id, p);
    } finally { setSaving(false); }
  };

  const handleCashFull = async () => {
    if (!selected) return;
    setMarking(true);
    const statedAmt  = parseFloat(selected.amount_paid) || 0;
    const confirmAmt = statedAmt >= parseFloat(selected.total) ? statedAmt : parseFloat(selected.total);
    try { await patchOrder(selected.id, { payment_status: "paid", amount_paid: confirmAmt }); }
    finally { setMarking(false); }
  };

  const handleEcoPaid = async () => {
    if (!selected) return;
    setMarking(true);
    try { await patchOrder(selected.id, { payment_status: "paid" }); }
    finally { setMarking(false); }
  };

  const handleAssign = async (memberId) => {
    if (!selected) return;
    setSaving(true);
    try { await patchOrder(selected.id, { assigned_to: memberId ? parseInt(memberId) : null }); }
    finally { setSaving(false); }
  };

  const handleAdvance = async () => {
    if (!selected) return;
    const next = nextSt(selected.status, selected);
    if (!next) return;
    setSavingStatus(true);
    try {
      await patchOrder(selected.id, { status: next });
      if (next === "completed") {
        setOrders(prev => prev.filter(o => o.id !== selected.id));
        setSelected(null);
      }
    } finally { setSavingStatus(false); }
  };

  // Cash only — marks completed + paid in one action, sends single notification
  const handleCompleteAndPay = async () => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      await patchOrder(selected.id, {
        status:         "completed",
        payment_status: "paid",
        amount_paid:    parseFloat(selected.amount_paid) || parseFloat(selected.total),
      });
      setOrders(prev => prev.filter(o => o.id !== selected.id));
      setSelected(null);
    } finally { setSavingStatus(false); }
  };

  const filtered = useMemo(() => {
    let list = filter === "all" ? orders : orders.filter(o => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.phone.toLowerCase().includes(q) ||
        (o.order_text ?? "").toLowerCase().includes(q) ||
        String(o.id).includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  return (
    <>
      <style>{`
        @keyframes posIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.faint}; border-radius: 2px; }
      `}</style>

      <div style={{ display: "flex", height: isMobile ? "auto" : "100vh", minHeight: isMobile ? "100vh" : undefined, overflow: isMobile ? "auto" : "hidden", background: t.bg, color: c.text, fontFamily: "Manrope,sans-serif" }}>
        <Sidebar />

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: 1, overflow: isMobile ? "visible" : "hidden" }}>

          {/* ── LEFT: QUEUE ── */}
          <div style={{
            width: isMobile ? "100%" : 360, flexShrink: 0,
            display: "flex", flexDirection: "column",
            borderRight: isMobile ? "none" : "1px solid " + c.border,
            borderBottom: isMobile ? "1px solid " + c.border : "none",
            background: c.queueBg,
            overflow: "hidden",
            maxHeight: isMobile ? (selected ? 320 : undefined) : undefined,
          }}>
            {/* Queue header */}
            <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid " + c.border, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: c.muted, marginBottom: 6 }}>
                    Live Queue
                  </div>
                  <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: c.text, margin: 0, lineHeight: 1 }}>
                    Orders
                  </h1>
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: c.muted, marginTop: 5, letterSpacing: "0.04em" }}>
                    {orders.length} active
                    {lastRefresh && " · " + lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                </div>
                <button onClick={() => fetchQueue(true)} title="Refresh" style={{
                  width: 34, height: 34, borderRadius: 4, border: "1px solid " + c.border,
                  background: c.subBg, color: c.muted, cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transform: refreshing ? "rotate(360deg)" : "none",
                  transition: "transform .4s",
                }}>↻</button>
              </div>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontFamily: "JetBrains Mono,monospace", fontSize: 12, color: c.muted, pointerEvents: "none" }}>⌕</span>
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search phone, item, ID…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "9px 32px 9px 30px",
                    borderRadius: 4, border: "1px solid " + c.border,
                    background: c.inputBg, color: c.text,
                    fontFamily: "Manrope,sans-serif", fontSize: 12, outline: "none",
                    transition: "border-color .15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(56,189,248,.45)"}
                  onBlur={e => e.target.style.borderColor = c.border}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: c.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <FilterBar orders={orders} filter={filter} setFilter={setFilter} c={c} />

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <Skeleton c={c} />
              ) : !filtered.length ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8 }}>
                  <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 28, color: c.faint }}>◌</div>
                  <p style={{ margin: 0, fontFamily: "Manrope,sans-serif", fontSize: 13, color: c.muted }}>
                    {search ? "No results" : "No active orders"}
                  </p>
                  {search && (
                    <button onClick={() => setSearch("")} style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 10, color: "#38bdf8", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(order => (
                  <OrderCard key={order.id} order={order} selected={selected?.id === order.id} onClick={() => setSelected(order)} c={c} />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT: DETAIL ── */}
          {selected ? (
            <DetailPanel
              order={selected} team={team} c={c}
              amt={amt} setAmt={setAmt}
              saving={saving} savingStatus={savingStatus} marking={marking}
              onSave={handleSave} onCashFull={handleCashFull} onEcoPaid={handleEcoPaid}
              onAssign={handleAssign} onAdvance={handleAdvance}
              onCompleteAndPay={handleCompleteAndPay}
            />
          ) : (
            <EmptyDetail orders={orders} c={c} />
          )}
        </div>
      </div>
    </>
  );
}