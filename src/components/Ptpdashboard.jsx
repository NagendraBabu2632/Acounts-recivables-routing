// src/components/Ptpdashboard.jsx
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const INR = val => '₹' + (val / 100000).toFixed(1) + 'L'

const DELAY_COLOR = days => {
  if (days <= 20) return '#378ADD'
  if (days <= 35) return '#EF9F27'
  return '#E24B4A'
}

const RISK_COLOR = pct => {
  if (pct < 30) return '#1D9E75'
  if (pct < 60) return '#EF9F27'
  return '#E24B4A'
}

const WTP_COLOR = score => {
  if (score >= 70) return '#1D9E75'
  if (score >= 50) return '#EF9F27'
  return '#E24B4A'
}

/* ─────────────────────────────────────────────
   Animated Number
───────────────────────────────────────────── */
function AnimatedNumber({ value, duration = 900, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = null
    const end = parseFloat(value) || 0
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(ease * end * 10) / 10)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])
  return <>{prefix}{display}{suffix}</>
}

/* ─────────────────────────────────────────────
   Pulse Badge
───────────────────────────────────────────── */
function PulseBadge({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10,
      padding: '3px 10px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}40`,
      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color,
        boxShadow: `0 0 6px ${color}`, animation: 'ptpPulse 1.8s ease-in-out infinite' }} />
      {label}
      <style>{`@keyframes ptpPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
    </span>
  )
}

/* ─────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────── */
function KPICard({ label, value, sub, subColor, accent, icon, trend }) {
  return (
    <div style={{
      background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
      border: `1px solid ${accent ? accent + '30' : 'var(--border)'}`,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: accent || 'var(--border)', borderRadius: '2px 2px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        {icon && <span style={{ fontSize: 14, opacity: 0.6 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--text-primary)',
        fontFamily: 'var(--font-head)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || 'var(--text-muted)' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 10, color: trend < 0 ? '#E24B4A' : '#1D9E75', fontWeight: 600 }}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)} from last period
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   WTP Gauge — D3 animated half-circle gauge
   • Pure D3 SVG, no canvas, no Chart.js
   • Animated fill arc on mount / score change
   • Needle sweeps from 0 → score with easing
   • Tick marks + labels rendered via D3
   Requires d3 available as window.d3
───────────────────────────────────────────── */
function WTPGauge({ score, delta }) {
  const svgRef = useRef(null)

  const pct         = Math.min(Math.max(score, 0), 100)
  const color       = WTP_COLOR(pct)
  const trackColor  = 'rgba(128,128,128,0.18)'
  const statusLabel = pct >= 70 ? 'WILLING TO PAY' : pct >= 50 ? 'HESITANT' : 'RESISTANT'

  useEffect(() => {
    if (!svgRef.current) return

    const W = 260, H = 155
    const cx = W / 2
    const cy = H - 30        // pivot sits 30px from bottom
    const R  = 90            // outer radius
    const innerR = 68        // inner radius  → track thickness = 22px
    const needleR = R - 14

    // D3 arc generators
    // half-circle: startAngle = -π/2 (top-left), endAngle = π/2 (top-right)
    // D3 uses angles measured CW from 12 o'clock.
    // For a bottom-pivot half-circle we want: -π (left) → 0 (right)
    // shifted by -π/2 so 0 = left end, π = right end.
    const arcGen = d3.arc()
      .innerRadius(innerR)
      .outerRadius(R)
      .startAngle(-Math.PI / 2)   // will be overridden per segment

    // track arc (full 180°)
    const trackPath = d3.arc()
      .innerRadius(innerR)
      .outerRadius(R)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2)()

    // target fill angle: maps score 0→100 to -π/2 → +π/2
    const targetAngle = -Math.PI / 2 + (pct / 100) * Math.PI

    // clear previous render
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', H)

    const g = svg.append('g')
      .attr('transform', `translate(${cx},${cy})`)

    // ── track (background arc) ──
    g.append('path')
      .attr('d', trackPath)
      .attr('fill', trackColor)
      .attr('stroke', 'none')

    // ── filled arc (animated) ──
    const fillArc = d3.arc()
      .innerRadius(innerR)
      .outerRadius(R)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2)   // starts at 0, animates to target

    const fillPath = g.append('path')
      .attr('fill', color)
      .attr('stroke', 'none')
      .style('filter', `drop-shadow(0 0 5px ${color}70)`)
      .attr('d', fillArc())

    // animate arc fill
    fillPath.transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attrTween('d', () => {
        const interp = d3.interpolate(-Math.PI / 2, targetAngle)
        return t => fillArc.endAngle(interp(t))()
      })

    // ── tick marks & labels ──
    const ticks = [0, 25, 50, 75, 100]
    const labelR = R + 14

    ticks.forEach(v => {
      const angle = -Math.PI / 2 + (v / 100) * Math.PI  // same mapping
      const cos   = Math.cos(angle - Math.PI / 2)        // rotate: SVG 0° = top
      // D3 arc angles are from 12 o'clock CW; our pivot is at bottom
      // Recompute using standard trig from pivot:
      // angle spans left (−π) to right (0) relative to 3 o'clock,
      // but since pivot is at cy we use:
      const tx = labelR * Math.cos(angle - Math.PI / 2 + Math.PI / 2)
      const ty = -labelR * Math.sin(angle + Math.PI / 2 - Math.PI / 2)

      // Simpler: use the actual SVG angle directly
      // score→angle: 0→−π/2, 100→+π/2 (D3 convention, pivot at bottom)
      // x = r·sin(a), y = −r·cos(a)  (D3 arc convention)
      const lx = labelR * Math.sin(angle)
      const ly = -labelR * Math.cos(angle)

      g.append('text')
        .attr('x', lx)
        .attr('y', ly)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 9)
        .attr('fill', 'rgba(128,128,128,0.85)')
        .text(v)
    })

    // ── needle (animated sweep) ──
    const needle = g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')

    // needle endpoint from angle
    const needleEnd = (angle) => ({
      x: needleR * Math.sin(angle),
      y: -needleR * Math.cos(angle)
    })

    const startPt = needleEnd(-Math.PI / 2)
    needle.attr('x2', startPt.x).attr('y2', startPt.y)

    needle.transition()
      .duration(1100)
      .ease(d3.easeCubicOut)
      .attrTween('x2', () => {
        const interp = d3.interpolate(-Math.PI / 2, targetAngle)
        return t => needleEnd(interp(t)).x
      })
      .attrTween('y2', () => {
        const interp = d3.interpolate(-Math.PI / 2, targetAngle)
        return t => needleEnd(interp(t)).y
      })

    // pivot dot
    g.append('circle')
      .attr('r', 6)
      .attr('fill', color)
      .style('filter', `drop-shadow(0 0 4px ${color})`)

    // ── score text ──
    g.append('text')
      .attr('y', -24)
      .attr('text-anchor', 'middle')
      .attr('font-size', 26)
      .attr('font-weight', 700)
      .attr('fill', color)
      .text(score)

    g.append('text')
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('font-size', 8.5)
      .attr('letter-spacing', '0.07em')
      .attr('fill', 'rgba(128,128,128,0.8)')
      .text('WTP SCORE')

  }, [pct, color])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', maxWidth: 260 }} />

      <div style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: '0.04em', marginTop: 6 }}>
        {statusLabel}
      </div>
      <div style={{ fontSize: 10, color: delta < 0 ? '#E24B4A' : '#1D9E75', fontWeight: 600, marginTop: 2 }}>
        {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} pts over 30 days
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Credit Utilisation Ring
───────────────────────────────────────────── */
function CreditRing({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct >= 85 ? '#E24B4A' : pct >= 65 ? '#EF9F27' : '#1D9E75'
  const r = 38, cx = 50, cy = 50
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 100 100" width={90} height={90}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={700}
          fill="var(--text-primary,#fff)">{pct.toFixed(0)}%</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={8}
          fill="var(--text-muted,#888)">CREDIT USED</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color }}>
          {pct >= 85 ? '⚠ Near limit' : `Available: ${INR(limit - used)}`}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {INR(used)} of {INR(limit)}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Delinquency Radial
───────────────────────────────────────────── */
function DelinquencyRadial({ risk }) {
  const pct = Math.round(risk * 100)
  const color = RISK_COLOR(pct)
  const r = 38, cx = 50, cy = 50
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - risk)
  const label = pct < 30 ? 'LOW RISK' : pct < 60 ? 'MODERATE' : 'HIGH RISK'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 100 100" width={90} height={90}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={700}
          fill="var(--text-primary,#fff)">{pct}%</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={7}
          fill="var(--text-muted,#888)">DELINQUENCY</text>
      </svg>
      <div style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   WTP Trend Line (SVG)
───────────────────────────────────────────── */
function WTPTrendLine({ score, delta }) {
  const endScore = score
  const startScore = Math.min(100, Math.max(0, endScore - delta))
  const POINTS = 6
  const DAYS = ['Day 1', 'Day 7', 'Day 14', 'Day 20', 'Day 25', 'Day 30']
  const scores = DAYS.map((_, i) =>
    Math.round(startScore + (endScore - startScore) * (i / (POINTS - 1)) + (Math.sin(i * 0.9) * 2))
  )

  const W = 460, H = 110, padL = 14, padR = 14, padT = 24, padB = 22
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const minS = Math.min(...scores) - 8
  const maxS = Math.max(...scores) + 8

  const sx = i => padL + (i / (POINTS - 1)) * chartW
  const sy = s => padT + chartH - ((s - minS) / (maxS - minS)) * chartH

  const path = scores.map((s, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(s).toFixed(1)}`).join(' ')
  const area = path + ` L${sx(POINTS - 1)},${padT + chartH} L${padL},${padT + chartH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="wtpAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={WTP_COLOR(endScore)} stopOpacity="0.20" />
          <stop offset="100%" stopColor={WTP_COLOR(endScore)} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(v => {
        const y = padT + chartH - ((v - minS) / (maxS - minS)) * chartH
        if (y < padT || y > padT + chartH) return null
        return (
          <line key={v} x1={padL} y1={y} x2={W - padR} y2={y}
            stroke="rgba(128,128,128,0.08)" strokeWidth="1" strokeDasharray="3,3" />
        )
      })}
      <path d={area} fill="url(#wtpAreaGrad)" />
      <path d={path} fill="none" stroke={WTP_COLOR(endScore)} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {scores.map((s, i) => (
        <g key={i}>
          <circle cx={sx(i)} cy={sy(s)} r={3.5} fill={WTP_COLOR(s)}
            style={{ filter: `drop-shadow(0 0 3px ${WTP_COLOR(s)}80)` }} />
          <text x={sx(i)} y={sy(s) - 9} textAnchor="middle" fontSize={9.5}
            fill={WTP_COLOR(s)} fontWeight={700}>{s}</text>
          <text x={sx(i)} y={H - 2} textAnchor="middle" fontSize={8}
            fill="var(--text-muted,#888)">{DAYS[i]}</text>
        </g>
      ))}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Payment Delay Bars
───────────────────────────────────────────── */
function DelayTrend({ history, avgDelay }) {
  const data = history?.length
    ? history.map((h, i) => ({
        label: h.paid_date ? h.paid_date.slice(0, 7) : `M${i + 1}`,
        days: h.delay_days
      }))
    : (() => {
        const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
        const base = Math.max(avgDelay - 14, 5)
        return months.map((m, i) => ({
          label: m,
          days: Math.round(base + (avgDelay - base) * (i / 5) + (Math.sin(i) * 4))
        }))
      })()

  const maxDays = Math.max(...data.map(d => d.days), 40)

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10,
        textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Payment delay trend (days overdue)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
        {data.map((d, i) => {
          const heightPct = Math.max((d.days / maxDays) * 100, 5)
          const color = DELAY_COLOR(d.days)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 9, color, fontWeight: 700 }}>{d.days}d</div>
              <div style={{
                width: '100%', background: color, borderRadius: '3px 3px 0 0',
                height: `${heightPct}%`, minHeight: 4,
                boxShadow: `0 0 6px ${color}50`,
                transition: 'height 0.6s ease'
              }} />
              <div style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                {d.label}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {[['On track (≤20d)', '#378ADD'], ['Late (≤35d)', '#EF9F27'], ['Critical (>35d)', '#E24B4A']].map(([lbl, clr]) => (
          <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 1, background: clr, display: 'inline-block', flexShrink: 0 }} />
            {lbl}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Invoice Aging (horizontal bars)
───────────────────────────────────────────── */
function InvoiceAging({ invoices, openCount, totalOpen, oldestDays }) {
  const data = invoices?.length
    ? invoices
    : (() => {
        const shares = [0.48, 0.32, 0.20]
        return Array.from({ length: openCount || 3 }, (_, i) => ({
          invoice_no: `INV-2024-0${String(i + 1).padStart(2, '0')}`,
          days_overdue: i === 0 ? oldestDays : Math.round(oldestDays * shares[i] || 12),
          amount: Math.round((totalOpen || 1000000) * shares[i])
        }))
      })()

  const maxDays = Math.max(...data.map(d => d.days_overdue), 70)

  return (
    <div>
      {data.map((inv, i) => {
        const pct = Math.min((inv.days_overdue / maxDays) * 100, 100)
        const color = DELAY_COLOR(inv.days_overdue)
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(inv.invoice_no || '').replace('INV-', '')}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color }}>
                {inv.days_overdue}d · {INR(inv.amount)}
              </span>
            </div>
            <div style={{ background: 'rgba(128,128,128,0.12)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 4, transition: 'width 0.8s ease',
                boxShadow: `0 0 6px ${color}50`
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Risk Breakdown Bar Chart  (replaces Radar)
   Shows 5 dimensions as labelled horizontal bars
   with colour coding and a numeric score.
───────────────────────────────────────────── */
function RiskBreakdown({ c }) {
  const dims = [
    {
      label: 'WTP',
      value: Math.round((c.wtp_score || 0)),
      max: 100,
      color: WTP_COLOR(c.wtp_score || 0),
      suffix: '',
      note: c.wtp_score >= 70 ? 'Willing' : c.wtp_score >= 50 ? 'Hesitant' : 'Resistant',
    },
    {
      label: 'Payment Delay',
      // invert: lower delay = better score
      value: Math.max(0, Math.round(100 - ((c.avg_payment_delay || 0) / 60) * 100)),
      max: 100,
      color: DELAY_COLOR(c.avg_payment_delay || 0),
      suffix: '',
      note: `${c.avg_payment_delay || 0}d avg`,
    },
    {
      label: 'Credit Health',
      value: Math.max(0, Math.round(100 - (c.credit_utilization || 0))),
      max: 100,
      color: (c.credit_utilization || 0) >= 85 ? '#E24B4A' : (c.credit_utilization || 0) >= 65 ? '#EF9F27' : '#1D9E75',
      suffix: '',
      note: `${c.credit_utilization || 0}% used`,
    },
    {
      label: 'Dispute Risk',
      value: Math.max(0, Math.round((1 - Math.min((c.open_disputes || 0) / 5, 1)) * 100)),
      max: 100,
      color: (c.open_disputes || 0) > 2 ? '#E24B4A' : (c.open_disputes || 0) > 0 ? '#EF9F27' : '#1D9E75',
      suffix: '',
      note: `${c.open_disputes || 0} open`,
    },
    {
      label: 'Delinquency',
      value: Math.max(0, Math.round((1 - (c.delinquency_risk_30d || 0)) * 100)),
      max: 100,
      color: RISK_COLOR(Math.round((c.delinquency_risk_30d || 0) * 100)),
      suffix: '',
      note: `${Math.round((c.delinquency_risk_30d || 0) * 100)}% risk`,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {dims.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.note}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.color, minWidth: 28, textAlign: 'right' }}>{d.value}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(128,128,128,0.12)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${d.value}%`,
              background: d.color,
              borderRadius: 4,
              transition: 'width 0.9s ease',
              boxShadow: `0 0 5px ${d.color}60`,
            }} />
          </div>
        </div>
      ))}
      <div style={{
        marginTop: 4, fontSize: 9, color: 'var(--text-muted)',
        borderTop: '1px solid rgba(128,128,128,0.1)', paddingTop: 6,
        letterSpacing: '0.04em', textTransform: 'uppercase'
      }}>
        Score = health (higher is better)
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Score Timeline (horizontal)
───────────────────────────────────────────── */
function ScoreTimeline({ riskScore, wtpScore, creditUtil }) {
  const metrics = [
    { label: 'Risk Score', value: riskScore, max: 100, color: RISK_COLOR(riskScore) },
    { label: 'WTP Score', value: wtpScore, max: 100, color: WTP_COLOR(wtpScore) },
    { label: 'Credit Util.', value: creditUtil, max: 100, color: creditUtil >= 85 ? '#E24B4A' : creditUtil >= 65 ? '#EF9F27' : '#1D9E75' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {metrics.map(m => (
        <div key={m.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.value}%</span>
          </div>
          <div style={{ background: 'rgba(128,128,128,0.12)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${m.value}%`, background: m.color,
              borderRadius: 4, transition: 'width 0.8s ease',
              boxShadow: `0 0 6px ${m.color}50`
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Actionable Insight Row
───────────────────────────────────────────── */
function InsightRow({ type, text, priority }) {
  const styles = {
    critical: { bg: 'rgba(226,75,74,0.08)', border: 'rgba(226,75,74,0.25)', icon: '⚠', color: '#E24B4A' },
    warn:     { bg: 'rgba(239,159,39,0.08)', border: 'rgba(239,159,39,0.25)', icon: '●', color: '#EF9F27' },
    info:     { bg: 'rgba(55,138,221,0.08)', border: 'rgba(55,138,221,0.20)', icon: '→', color: '#378ADD' },
    ok:       { bg: 'rgba(29,158,117,0.08)', border: 'rgba(29,158,117,0.20)', icon: '✓', color: '#1D9E75' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 'var(--radius-sm)',
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 12, color: 'var(--text-primary)',
      display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6,
      borderLeft: `3px solid ${s.color}`
    }}>
      <span style={{ color: s.color, flexShrink: 0, fontSize: 13, marginTop: 1 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        {priority && (
          <div style={{ fontSize: 9, color: s.color, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 2 }}>{priority}</div>
        )}
        <span>{text}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function PTPDashboard({ data }) {
  console.log('PTP Dashboard dataaaaa:', data)
  const c = data?.customer || data
  if (!c) return null

  const hasPTP = c.ptp_records?.length > 0
  const ptp = hasPTP ? c.ptp_records[0] : {
    ptp_id: 'AUTO-PENDING',
    contact: c.sales_rep || '—',
    mode_of_payment: 'NEFT',
    promise_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    created_date: new Date().toISOString().slice(0, 10),
    amount: c.total_open_inr || 0,
    status: 'open',
    notes: 'Auto-generated — confirm with customer',
  }

  const isPastDue = new Date(ptp.promise_date) < new Date()
  const riskPct = Math.round((c.delinquency_risk_30d || 0) * 100)
  const creditUtilPct = c.credit_utilization || Math.round(((c.credit_used || 0) / (c.credit_limit || 1)) * 100)

  const statusColor = ptp.status === 'open'
    ? (isPastDue ? '#E24B4A' : '#EF9F27') : '#1D9E75'

  const insights = []
  if ((c.wtp_30d_delta || 0) < -10)
    insights.push({ type: 'critical', priority: 'Immediate Action',
      text: `WTP dropped ${Math.abs(c.wtp_30d_delta)} pts in 30 days — sharp decline. Contact via ${c.preferred_channel} at ${c.best_contact_time}. Risk of non-payment is escalating.` })
  if (creditUtilPct >= 84)
    insights.push({ type: 'critical', priority: 'Credit Risk',
      text: `Credit utilisation at ${creditUtilPct}% (${INR(c.credit_used)} of ${INR(c.credit_limit)}) — approaching ceiling. New orders may be blocked. Escalate to ${c.sales_rep || 'sales rep'} immediately.` })
  if ((c.avg_payment_delay || 0) > 20)
    insights.push({ type: 'warn', priority: 'Payment Behaviour',
      text: `Avg payment delay ${c.avg_payment_delay}d breaches ${c.payment_terms} terms. Oldest item is ${c.oldest_item_days}d overdue — well past Net 30.` })
  if ((c.open_disputes || 0) > 0)
    insights.push({ type: 'warn', priority: 'Open Disputes',
      text: `${c.open_disputes} open dispute${c.open_disputes > 1 ? 's' : ''} on record. Resolve before escalating to avoid relationship damage.` })
  if (c.engagement_trend === 'declining')
    insights.push({ type: 'warn', priority: 'Engagement Declining',
      text: `Customer engagement trending down. Preferred channel is ${c.preferred_channel} — best window: ${c.best_contact_time}. Consider a direct call from ${c.sales_rep || 'sales rep'}.` })
  if (c.account_group === 'KEY_ACCOUNT')
    insights.push({ type: 'info', priority: 'Key Account',
      text: 'Strategic account — escalation should be business-level. Recommend a structured payment plan before any credit hold to preserve the relationship.' })
  if (riskPct < 50)
    insights.push({ type: 'ok', priority: 'Risk Assessment',
      text: `Delinquency risk at ${riskPct}% — manageable. Standard follow-up cadence sufficient if WTP stabilises within 7 days.` })

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
  }
  const secLabel = {
    fontSize: 10, color: 'var(--text-muted)',
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em',
    display: 'flex', alignItems: 'center', gap: 6
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>

      {/* ── Header ── */}
      <div style={{
        ...card,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderLeft: `3px solid ${statusColor}`,
        background: `linear-gradient(90deg, ${statusColor}06 0%, var(--bg-card) 100%)`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor,
            boxShadow: `0 0 8px ${statusColor}` }} />
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text-primary)' }}>
            PTP Analysis — {c.name}
          </span>
          {c.account_group && (
            <PulseBadge color="#378ADD" label={c.account_group.replace('_', ' ')} />
          )}
          {c.industry && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '2px 8px',
              borderRadius: 20, border: '1px solid var(--border)' }}>{c.industry}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PulseBadge
            color={isPastDue && ptp.status === 'open' ? '#E24B4A' : '#EF9F27'}
            label={`${ptp.status.toUpperCase()} · ${isPastDue ? 'PAST DUE' : 'PENDING'}`}
          />
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        <KPICard
          label="Total Overdue" value={INR(c.total_open_inr || 0)}
          sub={`${c.open_invoice_count || 0} open invoices`}
          subColor="#E24B4A" accent="#E24B4A" icon="📋"
        />
        <KPICard
          label="Avg Payment Delay" value={`${c.avg_payment_delay || 0}d`}
          sub={`Terms: ${c.payment_terms || '—'}`}
          accent={DELAY_COLOR(c.avg_payment_delay)} icon="⏱"
        />
        <KPICard
          label="Risk Score" value={c.risk_score || '—'}
          sub={`${c.risk_class} · ${c.risk_band?.toUpperCase()}`}
          accent={RISK_COLOR(c.risk_score)} icon="📊"
        />
        <KPICard
          label="Oldest Invoice" value={`${c.oldest_item_days || 0}d`}
          sub={c.open_disputes > 0 ? `${c.open_disputes} open dispute${c.open_disputes > 1 ? 's' : ''}` : 'No disputes'}
          subColor={c.open_disputes > 0 ? '#EF9F27' : 'var(--text-muted)'}
          accent={DELAY_COLOR(c.oldest_item_days)} icon="📅"
        />
      </div>

      {/* ── Visual Gauges Row ── */}
      <div style={{
        ...card,
        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 20, alignItems: 'center'
      }}>
        {/* WTP Gauge — FIXED */}
        <div>
          <div style={secLabel}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: WTP_COLOR(c.wtp_score) }} />
            Willingness to Pay
          </div>
          <WTPGauge score={c.wtp_score || 0} delta={c.wtp_30d_delta || 0} />
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 120, background: 'var(--border)', flexShrink: 0 }} />

        {/* Ring pair */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...secLabel, justifyContent: 'center', marginBottom: 8 }}>Credit Util.</div>
            <CreditRing used={c.credit_used || 0} limit={c.credit_limit || 1} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...secLabel, justifyContent: 'center', marginBottom: 8 }}>Delinquency</div>
            <DelinquencyRadial risk={c.delinquency_risk_30d || 0} />
          </div>
        </div>
      </div>

      {/* ── Score Bars + Risk Breakdown (replaces Radar) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={card}>
          <div style={secLabel}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD' }} />
            Key Metrics Comparison
          </div>
          <ScoreTimeline
            riskScore={c.risk_score || 0}
            wtpScore={c.wtp_score || 0}
            creditUtil={creditUtilPct}
          />
        </div>
        <div style={card}>
          <div style={secLabel}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa' }} />
            Risk Dimension Breakdown
          </div>
          <RiskBreakdown c={c} />
        </div>
      </div>

      {/* ── WTP Trend Line ── */}
      <div style={card}>
        <div style={secLabel}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: WTP_COLOR(c.wtp_score) }} />
          WTP Score Trend — Last 30 Days
        </div>
        <WTPTrendLine score={c.wtp_score || 0} delta={c.wtp_30d_delta || 0} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          {(c.wtp_30d_delta || 0) < -10
            ? <><span style={{ color: '#E24B4A', fontWeight: 700 }}>🔴 Sharp decline</span> — urgent outreach recommended.</>
            : (c.wtp_30d_delta || 0) < 0
              ? <><span style={{ color: '#EF9F27', fontWeight: 700 }}>🟡 Declining</span> — engage proactively.</>
              : <><span style={{ color: '#1D9E75', fontWeight: 700 }}>🟢 Stable / improving.</span></>
          }
          &nbsp;Best contact: <b style={{ color: 'var(--text-secondary)' }}>{c.best_contact_time}</b> via{' '}
          <b style={{ color: 'var(--text-secondary)' }}>{c.preferred_channel}</b>.
        </div>
      </div>

      {/* ── Payment Trend + Delinquency ── */}
      <div style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <DelayTrend history={c.payment_history} avgDelay={c.avg_payment_delay || 20} />
        <div style={{ flexShrink: 0, width: 1, height: '100%', background: 'var(--border)' }} />
        <div style={{ flexShrink: 0 }}>
          <div style={{ ...secLabel, marginBottom: 8 }}>Delinquency Risk</div>
          <DelinquencyRadial risk={c.delinquency_risk_30d || 0} />
        </div>
      </div>

      {/* ── Invoice Aging ── */}
      <div style={card}>
        <div style={secLabel}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: DELAY_COLOR(c.oldest_item_days) }} />
          Open Invoice Aging
        </div>
        <InvoiceAging
          invoices={c.open_invoices}
          openCount={c.open_invoice_count}
          totalOpen={c.total_open_inr}
          oldestDays={c.oldest_item_days}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10,
          padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
          display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Oldest: <b style={{ color: DELAY_COLOR(c.oldest_item_days) }}>{c.oldest_item_days}d</b></span>
          <span>Terms: <b style={{ color: 'var(--text-secondary)' }}>{c.payment_terms}</b></span>
          <span>Avg Delay: <b style={{ color: DELAY_COLOR(c.avg_payment_delay) }}>{c.avg_payment_delay}d</b></span>
        </div>
      </div>

      {/* ── PTP Details + Engagement Signals ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={secLabel}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            PTP Details
          </div>
          {[
            ['PTP ID',   ptp.ptp_id],
            ['Contact',  ptp.contact],
            ['Mode',     ptp.mode_of_payment],
            ['Created',  ptp.created_date],
            ['Due Date', ptp.promise_date],
            ['Amount',   INR(ptp.amount || 0)],
            ['Notes',    ptp.notes],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 7, gap: 8,
              paddingBottom: 7, borderBottom: '1px solid rgba(128,128,128,0.07)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={secLabel}>
            <span style={{ width: 6, height: 6, borderRadius: '50%',
              background: c.engagement_trend === 'declining' ? '#E24B4A' : '#1D9E75' }} />
            Engagement Signals
          </div>
          {[
            ['Preferred Channel', c.preferred_channel],
            ['Best Contact Time', c.best_contact_time],
            ['Email Open Rate',   c.engagement?.email_open_rate_30d != null ? `${Math.round(c.engagement.email_open_rate_30d * 100)}%` : null],
            ['Last Email Opened', c.engagement?.last_email_open_daysago != null ? `${c.engagement.last_email_open_daysago}d ago` : null],
            ['Avg Response',      c.engagement?.avg_response_hours != null ? `${c.engagement.avg_response_hours}h` : null],
            ['Engagement Trend',  c.engagement_trend || c.engagement?.engagement_trend],
            ['Sales Rep',         c.sales_rep],
            ['City',              c.city],
            ['Industry',          c.industry],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 7, gap: 8,
              paddingBottom: 7, borderBottom: '1px solid rgba(128,128,128,0.07)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: v === 'declining' ? '#E24B4A'
                  : v === 'stable' ? '#EF9F27'
                  : v === 'improving' ? '#1D9E75'
                  : 'var(--text-primary)'
              }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actionable Insights ── */}
      {insights.length > 0 && (
        <div style={card}>
          <div style={secLabel}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E24B4A',
              boxShadow: '0 0 6px #E24B4A', animation: 'ptpPulse2 1.8s ease-in-out infinite' }} />
            Actionable Insights
            <style>{`@keyframes ptpPulse2{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(226,75,74,0.1)', color: '#E24B4A', border: '1px solid rgba(226,75,74,0.3)' }}>
              {insights.filter(i => i.type === 'critical').length} critical
            </span>
          </div>
          {insights.map((ins, i) => (
            <InsightRow key={i} type={ins.type} text={ins.text} priority={ins.priority} />
          ))}
        </div>
      )}

    </div>
  )
}