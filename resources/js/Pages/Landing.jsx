import { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import { useIsMobile } from '../hooks/useIsMobile';

const T = {
  bg:       '#060810',
  text:     '#f0ece4',
  muted:    'rgba(240,236,228,.5)',
  dim:      'rgba(240,236,228,.22)',
  border:   'rgba(240,236,228,.08)',
  surface:  'rgba(240,236,228,.04)',
  gold:     '#e9b96e',
  goldDim:  'rgba(233,185,110,.12)',
  goldGlow: 'rgba(233,185,110,.35)',
  red:      '#e85d3a',
  green:    '#3ecf8e',
  teal:     '#2dd4bf',
};

/* ── Animated counter ─────────────────────────────────────────────── */
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = () => {
        start += to / 60;
        setVal(Math.min(Math.round(start), to));
        if (start < to) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Floating orb background ──────────────────────────────────────── */
function Orbs() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'-20%', left:'60%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle, rgba(233,185,110,.07) 0%, transparent 65%)', animation:'orbFloat1 18s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'40%', left:'-15%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(62,207,142,.05) 0%, transparent 65%)', animation:'orbFloat2 22s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:'-10%', right:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,93,58,.06) 0%, transparent 65%)', animation:'orbFloat3 16s ease-in-out infinite' }}/>
      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-40px)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,20px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { from{background-position:200% center} to{background-position:-200% center} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} 99%{opacity:0} }
      `}</style>
    </div>
  );
}

/* ── Nav ──────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  // Close mobile menu on scroll
  useEffect(() => { if (scrolled) setMenuOpen(false); }, [scrolled]);
  return (
    <>
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, display:'flex', justifyContent:'center', padding: scrolled ? '12px 24px' : '0 24px', transition:'padding .4s', pointerEvents:'none' }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          width:'100%', maxWidth:1100,
          padding: scrolled ? '10px 20px' : '16px 20px',
          borderRadius: scrolled ? 999 : 0,
          background: scrolled ? 'rgba(6,8,16,.88)' : 'transparent',
          border: scrolled ? `1px solid ${T.border}` : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          boxShadow: scrolled ? '0 4px 40px rgba(0,0,0,.45)' : 'none',
          transition:'all .4s cubic-bezier(.4,0,.2,1)',
          pointerEvents:'auto',
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:`linear-gradient(135deg, ${T.gold}, #c8873a)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, boxShadow:`0 0 20px ${T.goldGlow}` }}>🌿</div>
            <span style={{ fontWeight:800, fontSize:15, color:T.text, letterSpacing:'-0.03em', fontFamily:'Georgia, serif' }}>
              Savanna<span style={{ color:T.gold }}>Bites</span>
            </span>
          </div>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              {[['Features','#features'],['Pricing','#pricing'],['How it works','#how']].map(([l, h]) => (
                <a key={l} href={h} style={{ padding:'7px 14px', fontSize:13, color:T.muted, textDecoration:'none', borderRadius:8, transition:'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.surface; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.background = 'transparent'; }}>
                  {l}
                </a>
              ))}
            </div>
          )}

          {/* Desktop CTA */}
          {!isMobile ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Link href="/login" style={{ padding:'8px 16px', fontSize:13, color:T.muted, textDecoration:'none', borderRadius:8, transition:'all .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = T.text}
                onMouseLeave={e => e.currentTarget.style.color = T.muted}>
                Sign in
              </Link>
              <Link href="/register" style={{
                padding:'9px 20px', fontSize:13, fontWeight:700, color:'#060810', textDecoration:'none',
                background:`linear-gradient(135deg, ${T.gold}, #d4943e)`,
                borderRadius:999, transition:'all .2s',
                boxShadow:`0 0 28px ${T.goldGlow}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = `0 0 44px ${T.goldGlow}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 28px ${T.goldGlow}`; }}>
                Get started →
              </Link>
            </div>
          ) : (
            /* Mobile hamburger */
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:T.text, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobile && menuOpen && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:199,
          background:'rgba(6,8,16,.97)', backdropFilter:'blur(12px)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8,
          animation:'fadeUp .2s ease',
        }}>
          {[['Features','#features'],['Pricing','#pricing'],['How it works','#how']].map(([l, h]) => (
            <a key={l} href={h} onClick={() => setMenuOpen(false)}
              style={{ fontSize:22, fontWeight:700, color:T.text, textDecoration:'none', padding:'12px 0', letterSpacing:'-0.02em', fontFamily:'Georgia, serif' }}>
              {l}
            </a>
          ))}
          <div style={{ height:1, width:120, background:T.border, margin:'8px 0' }}/>
          <Link href="/login" onClick={() => setMenuOpen(false)}
            style={{ fontSize:16, color:T.muted, textDecoration:'none', padding:'8px 0' }}>
            Sign in
          </Link>
          <Link href="/register" onClick={() => setMenuOpen(false)}
            style={{
              marginTop:8, padding:'14px 40px', fontSize:15, fontWeight:700, color:'#060810', textDecoration:'none',
              background:`linear-gradient(135deg, ${T.gold}, #d4943e)`,
              borderRadius:999, boxShadow:`0 0 36px ${T.goldGlow}`,
            }}>
            Get started →
          </Link>
        </div>
      )}
    </>
  );
}

/* ── Live order ticker ────────────────────────────────────────────── */
function LiveTicker() {
  const orders = [
    { name:'Chipo M.', item:'Chicken & Chips', time:'2m ago', emoji:'🍗' },
    { name:'Farai K.', item:'Burger Combo × 2', time:'4m ago', emoji:'🍔' },
    { name:'Rudo N.',  item:'Mazoe × 3',        time:'6m ago', emoji:'🥤' },
    { name:'Tinashe', item:'Chicken & Chips',   time:'9m ago', emoji:'🍗' },
    { name:'Nkosi B.', item:'Burger Combo',     time:'11m ago', emoji:'🍔' },
  ];
  const items = [...orders, ...orders];
  return (
    <div style={{ overflow:'hidden', padding:'12px 0', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, background:'rgba(233,185,110,.025)', position:'relative' }}>
      <div style={{ display:'flex', animation:'ticker 28s linear infinite', width:'max-content' }}>
        {items.map((o, i) => (
          <div key={i} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'0 32px', whiteSpace:'nowrap' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:T.green, animation:'pulse 2s infinite', flexShrink:0 }}/>
            <span style={{ fontSize:12, color:T.muted }}>{o.name} just ordered</span>
            <span style={{ fontSize:12, color:T.text, fontWeight:600 }}>{o.emoji} {o.item}</span>
            <span style={{ fontSize:11, color:T.dim }}>{o.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Hero phone mockup ────────────────────────────────────────────── */
/* ── Feature section ──────────────────────────────────────────────── */
function Feature({ icon, title, desc, accent, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'28px', borderRadius:20, cursor:'default', transition:'all .3s',
        background: hov ? 'rgba(240,236,228,.06)' : 'rgba(240,236,228,.03)',
        border: `1px solid ${hov ? `${accent}40` : T.border}`,
        boxShadow: hov ? `0 8px 40px rgba(0,0,0,.4), 0 0 0 1px ${accent}15` : 'none',
        animation: `fadeUp .6s ${delay}s both`,
        transform: hov ? 'translateY(-3px)' : 'none',
      }}>
      <div style={{
        width:48, height:48, borderRadius:14, marginBottom:20, fontSize:22,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: `${accent}15`, border:`1px solid ${accent}25`,
        transition:'all .25s',
        boxShadow: hov ? `0 0 24px ${accent}30` : 'none',
      }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:8, letterSpacing:'-0.02em', fontFamily:'Georgia, serif' }}>{title}</div>
      <div style={{ fontSize:13.5, color:T.muted, lineHeight:1.7 }}>{desc}</div>
    </div>
  );
}

/* ── Pricing card ─────────────────────────────────────────────────── */
function PricingCard({ name, price, per, desc, features, cta, href, highlight }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius:24, padding:36, position:'relative', transition:'all .3s',
        background: highlight
          ? `linear-gradient(160deg, rgba(233,185,110,.12), rgba(233,185,110,.04))`
          : 'rgba(240,236,228,.03)',
        border: `1px solid ${highlight ? `${T.gold}50` : T.border}`,
        boxShadow: highlight && hov ? `0 20px 60px rgba(0,0,0,.5), 0 0 80px ${T.goldGlow}` : hov ? '0 20px 60px rgba(0,0,0,.4)' : 'none',
        transform: hov ? 'translateY(-4px)' : 'none',
      }}>
      {highlight && (
        <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg, ${T.gold}, #c8873a)`, color:'#060810', fontSize:10.5, fontWeight:800, padding:'4px 16px', borderRadius:'0 0 10px 10px', letterSpacing:'.08em', textTransform:'uppercase' }}>
          Most popular
        </div>
      )}
      <div style={{ fontSize:11, fontWeight:700, color:highlight ? T.gold : T.muted, marginBottom:10, letterSpacing:'.1em', textTransform:'uppercase' }}>{name}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:8 }}>
        <span style={{ fontSize:54, fontWeight:800, letterSpacing:'-0.04em', color:T.text, fontFamily:'Georgia, serif' }}>{price}</span>
        {per && <span style={{ fontSize:14, color:T.dim }}>{per}</span>}
      </div>
      <div style={{ fontSize:13.5, color:T.muted, marginBottom:28, lineHeight:1.5 }}>{desc}</div>
      <div style={{ height:'1px', background:T.border, marginBottom:24 }}/>
      <ul style={{ listStyle:'none', padding:0, margin:'0 0 28px', display:'flex', flexDirection:'column', gap:12 }}>
        {features.map(f => (
          <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:13.5, color:'rgba(240,236,228,.75)' }}>
            <span style={{ color:highlight ? T.gold : T.green, fontWeight:700, fontSize:14, flexShrink:0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link href={href} style={{
        display:'block', textAlign:'center', padding:'14px 0', borderRadius:14,
        background: highlight ? `linear-gradient(135deg, ${T.gold}, #c8873a)` : 'rgba(240,236,228,.08)',
        color: highlight ? '#060810' : T.text,
        fontSize:14, fontWeight:700, textDecoration:'none', transition:'all .2s',
        border: highlight ? 'none' : `1px solid ${T.border}`,
        boxShadow: highlight ? `0 0 32px ${T.goldGlow}` : 'none',
      }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '.88'; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}>
        {cta}
      </Link>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export default function Welcome() {
  const isMobile = useIsMobile();
  return (
    <>
      <Head title="Savanna Bites — Restaurant Management Platform" />
      <div style={{ background:T.bg, minHeight:'100vh', fontFamily:'"DM Sans", system-ui, sans-serif', color:T.text, overflowX:'hidden', position:'relative' }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
        <Orbs/>
        <Nav/>

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '100px 20px 60px' : '120px 24px 80px', textAlign:'center' }}>

          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28, padding:'5px 6px 5px 5px', borderRadius:999, background:`${T.goldDim}`, border:`1px solid ${T.gold}30`, animation:'fadeUp .5s .1s both' }}>
            <span style={{ background:`linear-gradient(135deg, ${T.gold}, #c8873a)`, color:'#060810', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:999, letterSpacing:'.06em', textTransform:'uppercase' }}>New</span>
            <span style={{ fontSize:12.5, color:T.gold, paddingRight:6 }}>WhatsApp POS + heatmap analytics now live</span>
            <span style={{ fontSize:13, color:T.gold }}>→</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'clamp(38px,7.5vw,88px)', fontWeight:800, lineHeight:1.03,
            letterSpacing:'-0.045em', margin:'0 0 24px', maxWidth:800,
            fontFamily:'Georgia, "Times New Roman", serif',
            animation:'fadeUp .6s .2s both',
          }}>
            Your restaurant,<br/>
            <span style={{
              background:`linear-gradient(100deg, ${T.gold} 0%, #d4943e 40%, ${T.red} 80%)`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              backgroundSize:'200% auto', animation:'shimmer 4s linear infinite',
            }}>
              on autopilot.
            </span>
          </h1>

          <p style={{ fontSize:'clamp(15px,2vw,18px)', color:T.muted, maxWidth:520, margin:'0 auto 44px', lineHeight:1.75, fontWeight:400, animation:'fadeUp .6s .3s both' }}>
            Take WhatsApp orders 24/7, track live revenue, manage your team, and run your walk-in POS — all from one beautifully designed dashboard.
          </p>

          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'center', animation:'fadeUp .6s .4s both' }}>
            <Link href="/register" style={{
              display:'inline-flex', alignItems:'center', gap:8, padding:'15px 32px',
              borderRadius:14, fontSize:15, fontWeight:700, textDecoration:'none',
              color:'#060810', background:`linear-gradient(135deg, ${T.gold}, #c8873a)`,
              boxShadow:`0 0 48px ${T.goldGlow}, 0 4px 20px rgba(0,0,0,.4)`,
              transition:'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04) translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 72px ${T.goldGlow}, 0 8px 32px rgba(0,0,0,.5)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 48px ${T.goldGlow}, 0 4px 20px rgba(0,0,0,.4)`; }}>
              Start free today
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
            <Link href="/login" style={{
              padding:'15px 28px', borderRadius:14, fontSize:15, fontWeight:600,
              color:T.text, textDecoration:'none',
              background:'rgba(240,236,228,.06)', border:`1px solid ${T.border}`,
              transition:'all .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,236,228,.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,236,228,.06)'}>
              Sign in
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:40, animation:'fadeUp .6s .5s both' }}>
            <div style={{ display:'flex' }}>
              {['🧑🏾','👩🏽','🧑🏿','👩🏾','🧑🏽'].map((em, i) => (
                <div key={i} style={{ width:34, height:34, borderRadius:'50%', background:`hsl(${20+i*15},45%,18%)`, border:`2px solid ${T.bg}`, marginLeft:i>0?-10:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, zIndex:5-i, position:'relative' }}>{em}</div>
              ))}
            </div>
            <div>
              <div style={{ display:'flex', gap:1, marginBottom:2 }}>
                {[...Array(5)].map((_, i) => <span key={i} style={{ color:T.gold, fontSize:12 }}>★</span>)}
              </div>
              <span style={{ fontSize:12.5, color:T.muted }}><span style={{ color:T.text, fontWeight:600 }}>200+ restaurants</span> already live</span>
            </div>
          </div>


        </section>

        {/* ── LIVE TICKER ───────────────────────────────────────── */}
        <div style={{ position:'relative', zIndex:1 }}>
          <LiveTicker/>
        </div>

        {/* ── STATS ─────────────────────────────────────────────── */}
        <section style={{ position:'relative', zIndex:1, padding: isMobile ? '48px 16px' : '80px 24px', borderBottom:`1px solid ${T.border}` }}>
          <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:2 }}>
            {[
              { val:200, suffix:'+', label:'Restaurants live', color:T.gold },
              { val:2,   suffix:'M+', label:'Dollars processed/mo', color:T.green },
              { val:99,  suffix:'%',  label:'Uptime guaranteed', color:T.teal },
              { val:4,   suffix:'.9★', label:'Average customer rating', color:T.gold },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'center', padding: isMobile ? '24px 16px' : '32px 24px', borderRight:`1px solid ${(!isMobile && i<3) || (isMobile && i%2===0) ? T.border : 'transparent'}`, borderBottom: isMobile && i < 2 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ fontSize: isMobile ? 40 : 52, fontWeight:800, letterSpacing:'-0.04em', color:s.color, fontFamily:'Georgia, serif', lineHeight:1 }}>
                  <Counter to={s.val} suffix={s.suffix}/>
                </div>
                <div style={{ fontSize:13, color:T.muted, marginTop:8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────── */}
        <section id="features" style={{ position:'relative', zIndex:1, padding: isMobile ? '64px 16px' : '100px 24px', maxWidth:1060, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:isMobile ? 40 : 64 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:14 }}>Features</div>
            <h2 style={{ fontSize:'clamp(24px,4vw,50px)', fontWeight:800, letterSpacing:'-0.035em', margin:'0 0 16px', fontFamily:'Georgia, serif' }}>
              Everything your restaurant needs
            </h2>
            <p style={{ fontSize:16, color:T.muted, maxWidth:460, margin:'0 auto', lineHeight:1.65 }}>
              One platform that handles orders, analytics, staff, and payments — so you can focus on the food.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:14 }}>
            <Feature delay={0}   icon="💬" accent={T.green} title="WhatsApp Ordering Bot"     desc="Customers order directly in WhatsApp — no app download, no login. The bot handles the full flow 24/7 and fires orders straight to your kitchen." />
            <Feature delay={0.1} icon="📊" accent={T.teal}  title="Live Revenue Charts"       desc="Watch revenue update in real time. Daily, weekly, and monthly views with beautiful bar and line charts that actually look good." />
            <Feature delay={0.2} icon="🔥" accent={T.red}   title="Peak-Hour Heatmap"         desc="A colour-coded grid shows exactly which hours and days drive the most orders. Know when to staff up before the rush hits." />
            <Feature delay={0.3} icon="🖥️" accent={T.gold}  title="Walk-in POS Terminal"      desc="Handle dine-in customers from the same dashboard. Tap items, apply discounts, accept EcoCash or cash — all in sync with your WhatsApp orders." />
            <Feature delay={0.4} icon="💳" accent={T.green} title="EcoCash & Paynow"          desc="Customers pay at checkout. Receipts auto-send and every transaction reconciles in your dashboard — no manual entry." />
            <Feature delay={0.5} icon="📣" accent={T.gold}  title="Broadcast Campaigns"       desc="Push today's specials or new dishes to your entire customer list in seconds. Track opens and replies in analytics." />
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────── */}
        <section id="how" style={{ position:'relative', zIndex:1, padding: isMobile ? '64px 16px' : '100px 24px', borderTop:`1px solid ${T.border}` }}>
          <div style={{ maxWidth:700, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:isMobile ? 48 : 72 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.teal, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:14 }}>Setup</div>
              <h2 style={{ fontSize:'clamp(24px,4vw,50px)', fontWeight:800, letterSpacing:'-0.035em', margin:0, fontFamily:'Georgia, serif' }}>
                Live in under 10 minutes
              </h2>
            </div>
            {[
              { n:'01', title:'Create your account',  desc:'Sign up free. Add your restaurant name, logo, and hours in 2 minutes flat.', color:T.gold },
              { n:'02', title:'Build your menu',       desc:'Add dishes, prices, and photos. Your menu goes live on WhatsApp the moment you save.', color:T.teal },
              { n:'03', title:'Connect WhatsApp',      desc:'Link your business number. The ordering bot activates instantly — no code, no phone calls.', color:T.green },
              { n:'04', title:'Start taking orders',   desc:'Customers message you, the bot handles everything, and orders land in your dashboard in real time.', color:T.red },
            ].map((s, i, arr) => (
              <div key={s.n} style={{ display:'flex', gap:24, paddingBottom: i < arr.length - 1 ? 44 : 0 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                  <div style={{
                    width:52, height:52, borderRadius:'50%',
                    background:`${s.color}14`, border:`1.5px solid ${s.color}35`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:14, fontWeight:800, color:s.color, flexShrink:0,
                    fontFamily:'Georgia, serif',
                  }}>{s.n}</div>
                  {i < arr.length - 1 && (
                    <div style={{ width:1.5, flex:1, marginTop:8, background:`linear-gradient(to bottom, ${s.color}40, transparent)` }}/>
                  )}
                </div>
                <div style={{ paddingTop:12 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:8, letterSpacing:'-0.02em', fontFamily:'Georgia, serif' }}>{s.title}</div>
                  <div style={{ fontSize:14.5, color:T.muted, lineHeight:1.7 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────── */}
        <section style={{ position:'relative', zIndex:1, padding: isMobile ? '64px 16px' : '100px 24px', borderTop:`1px solid ${T.border}` }}>
          <div style={{ maxWidth:1060, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom: isMobile ? 36 : 56 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.gold, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:14 }}>Testimonials</div>
              <h2 style={{ fontSize:'clamp(24px,4vw,48px)', fontWeight:800, letterSpacing:'-0.035em', margin:0, fontFamily:'Georgia, serif' }}>
                Loved by restaurant owners
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:16 }}>
              {[
                { q:'The heatmap showed me I was understaffed on Friday evenings. Fixed it in a week and revenue jumped 35%.', name:'Tendai Moyo', role:'Owner, Moyo\'s Kitchen — Harare', em:'🧑🏾' },
                { q:'My customers love ordering on WhatsApp. No app downloads and every order lands in my dashboard instantly.', name:'Farai Ncube', role:'Manager, Afrikan Flavours — Bulawayo', em:'👩🏽' },
                { q:'The broadcast feature alone pays for itself. One Friday special last month sold out in 90 minutes.', name:'Rutendo Chikwanda', role:'Owner, Mambwe Grill — Mutare', em:'🧑🏿' },
              ].map(t => (
                <div key={t.name} style={{ background:'rgba(240,236,228,.03)', border:`1px solid ${T.border}`, borderRadius:20, padding:'28px' }}>
                  <div style={{ display:'flex', gap:2, marginBottom:16 }}>
                    {[...Array(5)].map((_, i) => <span key={i} style={{ color:T.gold, fontSize:13 }}>★</span>)}
                  </div>
                  <p style={{ fontSize:14, color:'rgba(240,236,228,.72)', lineHeight:1.78, marginBottom:20 }}>"{t.q}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:`${T.goldDim}`, border:`1px solid ${T.gold}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}>{t.em}</div>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:700, color:T.text }}>{t.name}</div>
                      <div style={{ fontSize:11.5, color:T.dim, marginTop:2 }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────── */}
        <section id="pricing" style={{ position:'relative', zIndex:1, padding: isMobile ? '64px 16px' : '100px 24px', borderTop:`1px solid ${T.border}` }}>
          <div style={{ maxWidth:860, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom: isMobile ? 36 : 60 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.green, letterSpacing:'.14em', textTransform:'uppercase', marginBottom:14 }}>Pricing</div>
              <h2 style={{ fontSize:'clamp(24px,4vw,50px)', fontWeight:800, letterSpacing:'-0.035em', margin:'0 0 14px', fontFamily:'Georgia, serif' }}>Simple, honest pricing</h2>
              <p style={{ fontSize:15, color:T.muted }}>Start free. No credit card required.</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20 }}>
              <PricingCard
                name="Starter" price="Free" desc="Perfect for getting started"
                features={['WhatsApp ordering bot','Up to 50 orders/month','Revenue & order charts','Digital invoices','1 team member']}
                cta="Get started free" href="/register" highlight={false}
              />
              <PricingCard
                name="Pro" price="$29" per="/mo" desc="For growing restaurants"
                features={['Everything in Starter','Unlimited orders','Peak-hour heatmap','Broadcast campaigns','Unlimited team members','Walk-in POS','Priority support']}
                cta="Start free trial" href="/register" highlight={true}
              />
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────── */}
        <section style={{ position:'relative', zIndex:1, padding: isMobile ? '64px 16px' : '100px 24px', borderTop:`1px solid ${T.border}` }}>
          <div style={{
            maxWidth:760, margin:'0 auto', textAlign:'center',
            padding: isMobile ? '48px 24px' : '80px 48px', borderRadius:32,
            background:`radial-gradient(ellipse at 50% 0%, rgba(233,185,110,.12) 0%, transparent 65%), rgba(240,236,228,.025)`,
            border:`1px solid ${T.gold}22`,
            boxShadow:`0 0 120px rgba(233,185,110,.08), inset 0 1px 0 rgba(233,185,110,.1)`,
          }}>
            <div style={{ fontSize:56, marginBottom:24 }}>🌿</div>
            <h2 style={{ fontSize:'clamp(24px,4.5vw,52px)', fontWeight:800, letterSpacing:'-0.04em', margin:'0 0 18px', fontFamily:'Georgia, serif' }}>
              Ready to transform<br/>your restaurant?
            </h2>
            <p style={{ fontSize:16, color:T.muted, lineHeight:1.7, maxWidth:460, margin:'0 auto 44px' }}>
              Join 200+ restaurants already using Savanna Bites. Get live in under 10 minutes. No credit card needed.
            </p>
            <Link href="/register" style={{
              display:'inline-flex', alignItems:'center', gap:10, padding:'17px 38px',
              borderRadius:14, background:`linear-gradient(135deg, ${T.gold}, #c8873a)`,
              color:'#060810', fontSize:16, fontWeight:800, textDecoration:'none',
              boxShadow:`0 0 64px ${T.goldGlow}`, transition:'all .2s',
              fontFamily:'Georgia, serif', letterSpacing:'-0.01em',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 96px ${T.goldGlow}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 64px ${T.goldGlow}`; }}>
              Create your free account
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <footer style={{ position:'relative', zIndex:1, borderTop:`1px solid ${T.border}`, padding: isMobile ? '24px 16px' : '32px 24px' }}>
          <div style={{ maxWidth:1060, margin:'0 auto', display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg, ${T.gold}, #c8873a)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🌿</div>
              <span style={{ fontWeight:800, fontSize:15, letterSpacing:'-0.03em', fontFamily:'Georgia, serif' }}>Savanna<span style={{ color:T.gold }}>Bites</span></span>
            </div>
            <p style={{ fontSize:12.5, color:T.dim }}>© {new Date().getFullYear()} Savanna Bites. All rights reserved.</p>
            <div style={{ display:'flex', gap:24 }}>
              {[['Sign in','/login'],['Register','/register']].map(([l, h]) => (
                <Link key={l} href={h} style={{ fontSize:13, color:T.dim, textDecoration:'none', transition:'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = T.gold}
                  onMouseLeave={e => e.currentTarget.style.color = T.dim}>{l}</Link>
              ))}
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}