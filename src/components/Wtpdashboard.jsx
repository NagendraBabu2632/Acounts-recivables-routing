// src/components/WTPDashboard.jsx
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/* ── shared tooltip ── */
function makeTooltip() {
  d3.select('#wtp-tooltip').remove()
  return d3.select('body')
    .append('div')
    .attr('id', 'wtp-tooltip')
    .style('position', 'fixed')
    .style('pointer-events', 'none')
    .style('background', 'rgba(10,10,20,0.93)')
    .style('color', '#fff')
    .style('font-size', '12px')
    .style('line-height', '1.65')
    .style('padding', '7px 11px')
    .style('border-radius', '6px')
    .style('white-space', 'nowrap')
    .style('z-index', '99999')
    .style('opacity', 0)
    .style('transition', 'opacity 0.12s')
}

const WTP_COLOR  = s => s <= 30 ? '#e24b4a' : s <= 60 ? '#ef9f27' : '#639922'
const RISK_COLOR = v => v >= 0.7 ? '#e24b4a' : v >= 0.4 ? '#ef9f27' : '#639922'
const DELTA_COLOR = d => d < -20 ? '#e24b4a' : d < 0 ? '#ef9f27' : '#639922'

/* ── 1. WTP Score horizontal bar ── */
function WTPScoreChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W      = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 52, bottom: 4, left: 130 }
      const rowH   = 36
      const H      = data.length * rowH + margin.top + margin.bottom

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)

      const tooltip = makeTooltip()
      const x = d3.scaleLinear().domain([0, 100]).range([margin.left, W - margin.right])
      const y = d3.scaleBand().domain(data.map(d => d.name)).range([margin.top, H - margin.bottom]).padding(0.25)

      svg.append('g').selectAll('line').data(x.ticks(5)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.1)').attr('stroke-width', 1)

      svg.append('line')
        .attr('x1', x(30)).attr('x2', x(30))
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(226,75,74,0.4)').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
      svg.append('text')
        .attr('x', x(30) + 3).attr('y', margin.top + 10)
        .attr('font-size', 9).attr('fill', 'rgba(226,75,74,0.7)').text('danger')

      svg.append('g').selectAll('rect.bar').data(data).join('rect')
        .attr('class', 'bar').attr('x', margin.left)
        .attr('y', d => y(d.name) + 1).attr('width', 0)
        .attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => WTP_COLOR(d.wtp_score))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(d.wtp_score) - margin.left))

      svg.append('g').selectAll('rect.hov').data(data).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.name}</b><br/>` +
              `WTP Score: <b>${d.wtp_score}/100</b><br/>` +
              `Δ30d: <b style="color:${DELTA_COLOR(d.wtp_30d_delta)}">${d.wtp_30d_delta > 0 ? '+' : ''}${d.wtp_30d_delta}</b><br/>` +
              `Rank: #${d.wtp_rank} &nbsp;|&nbsp; Risk band: ${d.risk_band}`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.val').data(data).join('text')
        .attr('class', 'val').attr('x', d => x(d.wtp_score) + 5)
        .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)')
        .style('pointer-events', 'none').text(d => d.wtp_score)

      svg.append('g').selectAll('text.lbl').data(data).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8)
        .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none')
        .text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── 2. WTP Delta chart (diverging) ── */
function WTPDeltaChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W      = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 60, bottom: 4, left: 130 }
      const rowH   = 36
      const H      = data.length * rowH + margin.top + margin.bottom

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)

      const tooltip = makeTooltip()
      const extent = d3.max(data, d => Math.abs(d.wtp_30d_delta)) * 1.2
      const x = d3.scaleLinear().domain([-extent, extent]).range([margin.left, W - margin.right])
      const y = d3.scaleBand().domain(data.map(d => d.name)).range([margin.top, H - margin.bottom]).padding(0.25)
      const mid = x(0)

      svg.append('line')
        .attr('x1', mid).attr('x2', mid)
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.3)').attr('stroke-width', 1)

      svg.append('g').selectAll('rect.bar').data(data).join('rect')
        .attr('class', 'bar')
        .attr('x', d => d.wtp_30d_delta < 0 ? x(d.wtp_30d_delta) : mid)
        .attr('y', d => y(d.name) + 1)
        .attr('width', 0)
        .attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => DELTA_COLOR(d.wtp_30d_delta))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.abs(x(d.wtp_30d_delta) - mid))

      svg.append('g').selectAll('rect.hov').data(data).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.name}</b><br/>` +
              `WTP Δ30d: <b style="color:${DELTA_COLOR(d.wtp_30d_delta)}">${d.wtp_30d_delta > 0 ? '+' : ''}${d.wtp_30d_delta} pts</b><br/>` +
              `Current WTP: ${d.wtp_score}/100<br/>` +
              `Engagement: ${d.engagement_trend.replace(/_/g, ' ')}`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.val').data(data).join('text')
        .attr('class', 'val')
        .attr('x', d => d.wtp_30d_delta < 0 ? x(d.wtp_30d_delta) - 4 : x(d.wtp_30d_delta) + 4)
        .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', d => d.wtp_30d_delta < 0 ? 'end' : 'start')
        .attr('font-size', 11).attr('fill', d => DELTA_COLOR(d.wtp_30d_delta))
        .style('pointer-events', 'none')
        .text(d => `${d.wtp_30d_delta > 0 ? '+' : ''}${d.wtp_30d_delta}`)

      svg.append('g').selectAll('text.lbl').data(data).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8)
        .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none')
        .text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── 3. Priority score horizontal bar ── */
function PriorityChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const sorted = [...data].sort((a, b) => b.priority_score - a.priority_score)
      const W      = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 56, bottom: 4, left: 130 }
      const rowH   = 36
      const H      = sorted.length * rowH + margin.top + margin.bottom

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)

      const tooltip = makeTooltip()
      const maxP = d3.max(sorted, d => d.priority_score)
      const x = d3.scaleLinear().domain([0, maxP * 1.12]).range([margin.left, W - margin.right])
      const y = d3.scaleBand().domain(sorted.map(d => d.name)).range([margin.top, H - margin.bottom]).padding(0.25)

      svg.append('g').selectAll('line').data(x.ticks(4)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.1)').attr('stroke-width', 1)

      svg.append('g').selectAll('rect.bar').data(sorted).join('rect')
        .attr('class', 'bar').attr('x', margin.left)
        .attr('y', d => y(d.name) + 1).attr('width', 0)
        .attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => RISK_COLOR(d.delinquency_risk_30d))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(d.priority_score) - margin.left))

      svg.append('g').selectAll('rect.hov').data(sorted).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.name}</b><br/>` +
              `Priority score: <b>${d.priority_score}</b><br/>` +
              `Delinquency risk: <b>${(d.delinquency_risk_30d * 100).toFixed(0)}%</b><br/>` +
              `Action: ${d.recommended_action}`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.val').data(sorted).join('text')
        .attr('class', 'val').attr('x', d => x(d.priority_score) + 5)
        .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)')
        .style('pointer-events', 'none').text(d => d.priority_score.toFixed(1))

      svg.append('g').selectAll('text.lbl').data(sorted).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8)
        .attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none')
        .text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}


/* ── 4. WTP score trend — pure React inline SVG, always renders ── */
/* Uses the SAME fixed dummy data pattern as the screenshot:
   82 → 80 → 76 → 72 → 65 → 55 → 43 → 41  (green→amber→red) */
function WTPTrendChart({ account }) {
  // Fixed 8-point dummy scores matching screenshot colour pattern exactly
  const DUMMY = [82, 80, 76, 72, 65, 55, 43, 41]
  const DAYS  = ['Day 1', 'Day 7', 'Day 14', 'Day 21', 'Day 23', 'Day 25', 'Day 28', 'Day 30']

  // If real history exists use it, otherwise always use the fixed dummy
  const isRealHistory = Array.isArray(account?.wtp_history)
    && account.wtp_history.length >= 4
    && account.wtp_history[0]?.score !== undefined

  const trendData = isRealHistory
    ? account.wtp_history
    : DAYS.map((day, i) => ({ day, score: DUMMY[i] }))

  // SVG layout constants
  const W        = 500   // viewBox width — scales via width="100%"
  const H        = 220
  const padTop   = 36
  const padBot   = 28
  const padL     = 6
  const padR     = 6
  const n        = trendData.length
  const totalW   = W - padL - padR
  const barGap   = 0.20                          // 20% gap between bars
  const slotW    = totalW / n
  const barW     = slotW * (1 - barGap)
  const barOff   = slotW * barGap / 2            // centre bar in slot
  const chartH   = H - padTop - padBot
  const maxScore = 100

  const barX  = i => padL + i * slotW + barOff
  const barH  = s => (s / maxScore) * chartH
  const barY  = s => padTop + chartH - barH(s)
  const lblX  = i => padL + i * slotW + slotW / 2
  const color = s => s <= 30 ? '#e24b4a' : s <= 60 ? '#ef9f27' : '#639922'

  // grid line values
  const grids = [25, 50, 75, 100]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* grid lines */}
      {grids.map(g => (
        <line
          key={g}
          x1={padL} x2={W - padR}
          y1={padTop + chartH - (g / maxScore) * chartH}
          y2={padTop + chartH - (g / maxScore) * chartH}
          stroke="rgba(128,128,128,0.10)" strokeWidth={1}
        />
      ))}

      {/* bars + labels */}
      {trendData.map(({ day, score }, i) => (
        <g key={day}>
          {/* bar */}
          <rect
            x={barX(i)}
            y={barY(score)}
            width={barW}
            height={barH(score)}
            rx={4}
            fill={color(score)}
          />
          {/* score label above bar */}
          <text
            x={lblX(i)}
            y={barY(score) - 6}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill={color(score)}
          >
            {score}
          </text>
          {/* x-axis day label */}
          <text
            x={lblX(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#999"
          >
            {day}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ── 5. WTP vs Delinquency Risk bubble scatter ── */
function BubbleChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W      = el.getBoundingClientRect().width || 400
      const margin = { top: 20, right: 20, bottom: 44, left: 44 }
      const H      = 240

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)
        .style('overflow', 'visible')

      const tooltip = makeTooltip()

      const x = d3.scaleLinear().domain([0, 100]).range([margin.left, W - margin.right])
      const y = d3.scaleLinear().domain([0, 1]).range([H - margin.bottom, margin.top])
      const rScale = d3.scaleSqrt().domain([0, d3.max(data, d => d.total_open_inr)]).range([6, 24])

      svg.append('g').selectAll('line.xg').data(x.ticks(5)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.08)').attr('stroke-width', 1)
      svg.append('g').selectAll('line.yg').data(y.ticks(4)).join('line')
        .attr('x1', margin.left).attr('x2', W - margin.right)
        .attr('y1', d => y(d)).attr('y2', d => y(d))
        .attr('stroke', 'rgba(128,128,128,0.08)').attr('stroke-width', 1)

      svg.append('rect')
        .attr('x', margin.left).attr('y', y(1))
        .attr('width', x(30) - margin.left)
        .attr('height', y(0.6) - y(1))
        .attr('fill', 'rgba(226,75,74,0.05)')

      svg.append('text').attr('x', W / 2).attr('y', H - 4)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('fill', 'var(--text-muted,#888)').text('WTP Score →')
      svg.append('text')
        .attr('transform', `translate(11,${H / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('fill', 'var(--text-muted,#888)').text('Delinquency Risk →')

      svg.append('g').selectAll('text.xt').data(x.ticks(5)).join('text')
        .attr('class', 'xt').attr('x', d => x(d)).attr('y', H - margin.bottom + 13)
        .attr('text-anchor', 'middle').attr('font-size', 9)
        .attr('fill', 'var(--text-muted,#888)').text(d => d)
      svg.append('g').selectAll('text.yt').data(y.ticks(4)).join('text')
        .attr('class', 'yt').attr('x', margin.left - 5).attr('y', d => y(d) + 4)
        .attr('text-anchor', 'end').attr('font-size', 9)
        .attr('fill', 'var(--text-muted,#888)').text(d => `${(d * 100).toFixed(0)}%`)

      svg.append('g').selectAll('circle.bub').data(data).join('circle')
        .attr('class', 'bub')
        .attr('cx', d => x(d.wtp_score))
        .attr('cy', d => y(d.delinquency_risk_30d))
        .attr('r', d => rScale(d.total_open_inr))
        .attr('fill', d => WTP_COLOR(d.wtp_score))
        .attr('opacity', 0.75)
        .attr('stroke', '#fff').attr('stroke-width', 1)
        .style('cursor', 'crosshair')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.name}</b><br/>` +
              `WTP: <b>${d.wtp_score}</b> &nbsp;|&nbsp; Δ: <b style="color:${DELTA_COLOR(d.wtp_30d_delta)}">${d.wtp_30d_delta}</b><br/>` +
              `Delinquency: <b>${(d.delinquency_risk_30d * 100).toFixed(0)}%</b><br/>` +
              `Open AR: ₹${(d.total_open_inr / 100000).toFixed(1)}L`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.bl').data(data).join('text')
        .attr('class', 'bl')
        .attr('x', d => x(d.wtp_score))
        .attr('y', d => y(d.delinquency_risk_30d) + 4)
        .attr('text-anchor', 'middle').attr('font-size', 9)
        .attr('fill', '#fff').attr('font-weight', 600)
        .style('pointer-events', 'none')
        .text(d => d.name.split(' ')[0])

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── Main component ── */
export default function WTPDashboard({ data }) {
  if (!data?.length) return null

  const sorted = [...data].sort((a, b) => a.wtp_rank - b.wtp_rank)

  const alertCount  = data.filter(d => d.wtp_30d_delta <= -20).length
  const dropCount   = data.filter(d => d.wtp_30d_delta < 0).length
  const avgWTP      = (data.reduce((s, d) => s + d.wtp_score, 0) / data.length).toFixed(0)
  const topPriority = sorted[0]

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md, 8px)',
    padding: '14px 16px',
  }

  const secLabel = {
    fontSize: 11, color: 'var(--text-muted)',
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { label: 'Avg WTP score',     value: avgWTP,                             color: WTP_COLOR(+avgWTP) },
          { label: 'WTP alerts',        value: alertCount,                         color: '#e24b4a' },
          { label: 'Accounts dropping', value: dropCount,                          color: '#ef9f27' },
          { label: '#1 Priority',       value: topPriority?.name.split(' ')[0],    color: '#e24b4a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Top priority action banner ── */}
      <div style={{
        ...card,
        background: 'rgba(226,75,74,0.07)',
        border: '1px solid rgba(226,75,74,0.25)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#e24b4a', marginBottom: 2 }}>
            #{topPriority?.wtp_rank} — {topPriority?.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {topPriority?.recommended_action} &nbsp;·&nbsp;
            WTP: <b style={{ color: WTP_COLOR(topPriority?.wtp_score) }}>{topPriority?.wtp_score}</b> &nbsp;·&nbsp;
            Δ30d: <b style={{ color: '#e24b4a' }}>{topPriority?.wtp_30d_delta}</b> &nbsp;·&nbsp;
            Best time: <b style={{ color: 'var(--text-primary)' }}>{topPriority?.best_contact_time}</b> via <b style={{ color: 'var(--text-primary)' }}>{topPriority?.preferred_channel}</b>
          </div>
        </div>
      </div>

      {/* ── WTP Score chart ── */}
      <div style={card}>
        <div style={secLabel}>WTP score (0 = won't pay, 100 = will pay)</div>
        <WTPScoreChart data={sorted} />
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          Red zone (&lt;30) = immediate intervention needed. Hover bars for details.
        </div>
      </div>

      {/* ── WTP Delta chart ── */}
      <div style={card}>
        <div style={secLabel}>WTP Δ30d — score change over last 30 days</div>
        <WTPDeltaChart data={sorted} />
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          Negative = deteriorating willingness to pay. Hover for engagement trend.
        </div>
      </div>

      {/* ── Priority score chart ── */}
      <div style={card}>
        <div style={secLabel}>Collection priority score (higher = act first)</div>
        <PriorityChart data={data} />
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          Color = delinquency risk. Hover for recommended action.
        </div>
      </div>

      {/* ── WTP score trend — shown once for top priority account ── */}
      <div style={card}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#fff)', marginBottom: 3 }}>
            WITH WTP AGENT — What happens instead
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted,#999)', fontStyle: 'italic' }}>
            {topPriority?.name}'s WTP score — last 30 days
          </div>
        </div>

        <WTPTrendChart account={topPriority} />

        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          {topPriority?.wtp_30d_delta < -20
            ? '🔴 Sharp decline — urgent intervention needed.'
            : topPriority?.wtp_30d_delta < 0
              ? '🟡 Score declining — engage proactively.'
              : '🟢 Score stable or improving.'}
          &nbsp;Best contact: <b style={{ color: 'var(--text-secondary)' }}>{topPriority?.best_contact_time}</b> via <b style={{ color: 'var(--text-secondary)' }}>{topPriority?.preferred_channel}</b>.
        </div>
      </div>

      {/* ── Bubble scatter ── */}
      <div style={card}>
        <div style={secLabel}>WTP score vs delinquency risk (bubble = open AR size)</div>
        <BubbleChart data={data} />
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          Bottom-left = highest risk. Bubble size = open AR. Hover for full details.
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
        {[
          { color: '#e24b4a', label: 'Critical / WTP < 30' },
          { color: '#ef9f27', label: 'Warning / WTP 30–60' },
          { color: '#639922', label: 'Healthy / WTP > 60' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

    </div>
  )
}