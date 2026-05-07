import { useEffect, useState } from "react"

const SOURCES = [
  { name: "SAP S/4HANA",      icon: "🔌" },
  { name: "ML Risk Engine",   icon: "🧠" },
  { name: "Email Agent",      icon: "📬" },
  { name: "Dispute Service",  icon: "⚖️" },
  { name: "Cash Application", icon: "💸" },
]

const AGENTS = [
  { name: "WTP",      icon: "⚡" },
  { name: "Email Inbox",      icon: "📬" },
  { name: "Dispute Resolver", icon: "⚖️" },
  { name: "Worklist", icon: "📋" },
  { name: "PTP Tracker", icon: "📅" },
  { name: "Activity", icon: "📜" },
]

const STATS = [
  { label: "Open Invoices", value: "1,284" },
  { label: "AR Balance",    value: "$4.7M" },
  { label: "Overdue Items", value: "312"   },
  { label: "Risk Flags",    value: "47"    },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  root: {
    position: "fixed",
    inset: 0,
    background: "#060a12",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'DM Mono', monospace",
    zIndex: 9999,
  },

  // backgrounds
  gridBg: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(79,142,247,0.06) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(79,142,247,0.06) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    animation: "gridPan 20s linear infinite",
  },
  orb: (color, size, top, left, bottom, right, delay) => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    background: color,
    filter: "blur(60px)",
    opacity: 0.15,
    top, left, bottom, right,
    animation: `orbFloat 8s ease-in-out ${delay} infinite alternate`,
  }),
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(79,142,247,0.3), transparent)",
    animation: "scan 3s linear infinite",
    zIndex: 1,
  },

  // phase wrapper
  phase: (visible) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 2,
    animation: visible ? "fadeSlideUp 0.5s cubic-bezier(.22,.68,0,1.2) both" : "none",
  }),

  // phase 0 – intro
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 22,
    background: "linear-gradient(135deg,#1e3a6e,#3b1f7a)",
    border: "1px solid rgba(79,142,247,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 22,
    fontFamily: "'Syne', sans-serif",
    animation: "logoPulse 2s ease-in-out infinite",
    position: "relative",
  },
  introTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.5px",
    margin: 0,
  },
  introSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 6,
    letterSpacing: "2px",
    textTransform: "uppercase",
  },

  // shared phase title
  phaseTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },

  // phase 1 – sources
  sourceRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    marginBottom: 8,
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    width: 320,
    animation: "rowIn 0.4s cubic-bezier(.22,.68,0,1.2) both",
  },
  sourceName: { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4ade80",
    boxShadow: "0 0 6px #4ade80",
    animation: "dotPop 0.3s cubic-bezier(.22,.68,0,1.4) both",
  },
  checkLabel: { fontSize: 11, color: "#4ade80", marginLeft: 6 },

  // phase 2 – progress
  progWrap: { width: 320 },
  progBg: {
    width: "100%",
    height: 5,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    overflow: "hidden",
    margin: "14px 0 8px",
  },
  progFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "linear-gradient(90deg,#4f8ef7,#a78bfa,#38bdf8)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s linear infinite",
    borderRadius: 10,
    transition: "width 0.2s ease",
  }),
  progPct: { fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "right" },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontSize: 12,
  },
  statLabel: { color: "rgba(255,255,255,0.35)" },
  statVal: (done) => ({
    color: done ? "#4ade80" : "rgba(255,255,255,0.7)",
    fontWeight: 500,
    transition: "color 0.4s ease",
  }),

  // phase 3 – agents
  agentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    width: 320,
  },
  agentCard: {
    padding: "12px 14px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    animation: "cardPop 0.45s cubic-bezier(.22,.68,0,1.3) both",
  },
  agentIcon: { fontSize: 18, marginBottom: 6 },
  agentName: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 },
  agentStatus: { fontSize: 10, color: "#4ade80", marginTop: 3, letterSpacing: 1 },

  // phase 4 – done
  doneCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "1.5px solid #4ade80",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    marginBottom: 18,
    boxShadow: "0 0 30px rgba(74,222,128,0.2)",
    animation: "doneCircle 0.6s cubic-bezier(.22,.68,0,1.2) both",
  },
  doneTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 6,
  },
  doneSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
}

// ─── Keyframes injected once ──────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap');

  @keyframes gridPan {
    from { transform: translate(0,0); }
    to   { transform: translate(40px,40px); }
  }
  @keyframes orbFloat {
    from { transform: scale(1) translate(0,0); }
    to   { transform: scale(1.15) translate(20px,-20px); }
  }
  @keyframes scan {
    from        { top:0%;   opacity:0; }
    10%,90%     {           opacity:1; }
    to          { top:100%; opacity:0; }
  }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(18px) scale(0.97); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  @keyframes logoPulse {
    0%,100% { box-shadow: 0 0 0  0   rgba(79,142,247,0);    }
    50%     { box-shadow: 0 0 0 12px rgba(79,142,247,0.15); }
  }
  @keyframes shimmer {
    from { background-position:  200% 0; }
    to   { background-position: -200% 0; }
  }
  @keyframes rowIn {
    from { opacity:0; transform:translateX(-12px); }
    to   { opacity:1; transform:translateX(0);     }
  }
  @keyframes dotPop {
    from { transform:scale(0); }
    to   { transform:scale(1); }
  }
  @keyframes cardPop {
    from { opacity:0; transform:scale(0.88); }
    to   { opacity:1; transform:scale(1);    }
  }
  @keyframes doneCircle {
    from { transform:scale(0) rotate(-90deg); opacity:0; }
    to   { transform:scale(1) rotate(0deg);   opacity:1; }
  }
`

// ─── Component ────────────────────────────────────────────────────────────────

export default function BootScreen({ onDone }) {
  const [phase,      setPhase]      = useState(0)
  const [sourceStep, setSourceStep] = useState(0)
  const [agentStep,  setAgentStep]  = useState(0)
  const [progress,   setProgress]   = useState(0)
  const [doneStats,  setDoneStats]  = useState([])   // indices of revealed stats
  const [fading,     setFading]     = useState(false)

  // inject global CSS once
  useEffect(() => {
    if (document.getElementById("boot-css")) return
    const tag = document.createElement("style")
    tag.id = "boot-css"
    tag.textContent = CSS
    document.head.appendChild(tag)
  }, [])

  // master flow
  useEffect(() => {
    let cancelled = false
    const go = async () => {
      await sleep(1600);  if (cancelled) return
      setPhase(1)

      await sleep(SOURCES.length * 480 + 700);  if (cancelled) return
      setPhase(2)

      await sleep(3200);  if (cancelled) return
      setPhase(3)

      await sleep(AGENTS.length * 380 + 700);  if (cancelled) return
      setPhase(4)

      await sleep(1800);  if (cancelled) return
      setFading(true)
      await sleep(600);   if (cancelled) return
      onDone?.()
    }
    go()
    return () => { cancelled = true }
  }, [onDone])

  // phase 1 – source rows
  useEffect(() => {
    if (phase !== 1) return
    let i = 0
    const iv = setInterval(() => {
      i++
      setSourceStep(i)
      if (i >= SOURCES.length) clearInterval(iv)
    }, 480)
    return () => clearInterval(iv)
  }, [phase])

  // phase 2 – progress bar + stat reveals
  useEffect(() => {
    if (phase !== 2) return
    let val = 0
    const iv = setInterval(() => {
      val += Math.random() * 9 + 2
      if (val >= 100) { val = 100; clearInterval(iv) }
      setProgress(val)
    }, 160)

    const timers = STATS.map((_, i) =>
      setTimeout(() => setDoneStats(prev => [...prev, i]), 400 + i * 500)
    )
    return () => {
      clearInterval(iv)
      timers.forEach(clearTimeout)
    }
  }, [phase])

  // phase 3 – agent cards
  useEffect(() => {
    if (phase !== 3) return
    let i = 0
    const iv = setInterval(() => {
      i++
      setAgentStep(i)
      if (i >= AGENTS.length) clearInterval(iv)
    }, 380)
    return () => clearInterval(iv)
  }, [phase])

  return (
    <div style={{ ...S.root, opacity: fading ? 0 : 1, transition: "opacity 0.6s ease" }}>
      {/* backgrounds */}
      <div style={S.gridBg} />
      <div style={S.orb("#4f8ef7", 260, -80, -60, undefined, undefined, "0s")} />
      <div style={S.orb("#a78bfa", 200, undefined, undefined, -60, -40, "2s")} />
      <div style={S.orb("#38bdf8", 140, undefined, 30, 80, undefined, "4s")} />
      <div style={S.scanLine} />

      {/* ── Phase 0 – Intro ── */}
      {phase === 0 && (
        <div style={S.phase(true)}>
          <div style={S.logoRing}>AR</div>
          <div style={S.introTitle}>Accounts Receivable</div>
          <div style={S.introSub}>Collections Co-pilot</div>
        </div>
      )}

      {/* ── Phase 1 – Sources ── */}
      {phase === 1 && (
        <div style={S.phase(true)}>
          <div style={S.phaseTitle}>
            Connecting <span style={{ color: "#4f8ef7" }}>Data Sources</span>
          </div>
          <div>
            {SOURCES.slice(0, sourceStep).map((s, i) => (
              <div key={i} style={S.sourceRow}>
                <span style={S.sourceName}>{s.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={S.sourceDot} />
                  <span style={S.checkLabel}>CONNECTED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Phase 2 – Progress ── */}
      {phase === 2 && (
        <div style={S.phase(true)}>
          <div style={S.phaseTitle}>
            Fetching <span style={{ color: "#4f8ef7" }}>Portfolio Data</span>
          </div>
          <div style={S.progWrap}>
            <div style={S.progBg}>
              <div style={S.progFill(progress)} />
            </div>
            <div style={S.progPct}>{Math.round(progress)}%</div>
            <div style={{ marginTop: 14 }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ ...S.statRow, borderBottom: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={S.statLabel}>{s.label}</span>
                  <span style={S.statVal(doneStats.includes(i))}>
                    {doneStats.includes(i) ? s.value : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Phase 3 – Agents ── */}
      {phase === 3 && (
        <div style={S.phase(true)}>
          <div style={S.phaseTitle}>
            Activating <span style={{ color: "#4f8ef7" }}>AI Agents</span>
          </div>
          <div style={S.agentGrid}>
            {AGENTS.slice(0, agentStep).map((a, i) => (
              <div key={i} style={S.agentCard}>
                <div style={S.agentIcon}>{a.icon}</div>
                <div style={S.agentName}>{a.name}</div>
                <div style={S.agentStatus}>ACTIVE</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Phase 4 – Done ── */}
      {phase === 4 && (
        <div style={S.phase(true)}>
          <div style={S.doneCircle}>✓</div>
          <div style={S.doneTitle}>All systems ready</div>
          <div style={S.doneSub}>Launching dashboard</div>
        </div>
      )}
    </div>
  )
}