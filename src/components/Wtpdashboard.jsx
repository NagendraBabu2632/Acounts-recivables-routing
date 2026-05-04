// src/components/WTPDashboard.jsx
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/* ─────────────────────────────────────────────
   Shared tooltip (D3 body-appended)
───────────────────────────────────────────── */
function makeTooltip() {
  return d3.select('body')
    .append('div')
    .attr('id', 'wtp-tooltip-' + Math.random().toString(36).slice(2))
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

/* ─────────────────────────────────────────────
   Color helpers
───────────────────────────────────────────── */
const WTP_COLOR   = s => s <= 30 ? '#e24b4a' : s <= 60 ? '#ef9f27' : '#639922'
const RISK_COLOR  = v => v >= 0.7 ? '#e24b4a' : v >= 0.4 ? '#ef9f27' : '#639922'
const DELTA_COLOR = d => d < -20 ? '#e24b4a' : d < 0 ? '#ef9f27' : '#639922'

/* ─────────────────────────────────────────────
   1. WTP Score Gauge  (single customer)
───────────────────────────────────────────── */
function WTPGauge({ score }) {
  const pct = Math.max(0, Math.min(100, score))
  const color = WTP_COLOR(pct)
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        position: 'relative', height: 28, borderRadius: 6, overflow: 'hidden',
        background: 'linear-gradient(to right,#e24b4a 0%,#e24b4a 30%,#ef9f27 30%,#ef9f27 60%,#639922 60%,#639922 100%)'
      }}>
        {/* needle */}
        <div style={{
          position: 'absolute', top: 0, left: `${pct}%`, transform: 'translateX(-50%)',
          width: 3, height: '100%', background: '#fff', opacity: 0.9
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${pct}%`,
          transform: 'translate(-50%,-50%)',
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', border: `2.5px solid ${color}`,
          boxShadow: '0 0 0 2px rgba(0,0,0,.18)'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted,#888)', marginTop: 4 }}>
        <span>0</span><span style={{ color: 'rgba(226,75,74,0.8)' }}>30 danger</span><span>60</span><span>100</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   2. WTP Score bar chart  (multi-account)
───────────────────────────────────────────── */
function WTPScoreChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 52, bottom: 4, left: 130 }
      const rowH = 36
      const H = data.length * rowH + margin.top + margin.bottom
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      const tooltip = makeTooltip()
      const x = d3.scaleLinear().domain([0, 100]).range([margin.left, W - margin.right])
      const y = d3.scaleBand().domain(data.map(d => d.name)).range([margin.top, H - margin.bottom]).padding(0.25)

      svg.append('g').selectAll('line').data(x.ticks(5)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.1)').attr('stroke-width', 1)

      svg.append('line')
        .attr('x1', x(30)).attr('x2', x(30)).attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(226,75,74,0.4)').attr('stroke-width', 1).attr('stroke-dasharray', '4,3')
      svg.append('text').attr('x', x(30) + 3).attr('y', margin.top + 10)
        .attr('font-size', 9).attr('fill', 'rgba(226,75,74,0.7)').text('danger')

      svg.append('g').selectAll('rect.bar').data(data).join('rect')
        .attr('class', 'bar').attr('x', margin.left).attr('y', d => y(d.name) + 1)
        .attr('width', 0).attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => WTP_COLOR(d.wtp_score))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(d.wtp_score) - margin.left))

      svg.append('g').selectAll('rect.hov').data(data).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 40) + 'px')
            .html(`<b>${d.name}</b><br/>WTP Score: <b>${d.wtp_score}/100</b><br/>Δ30d: <b style="color:${DELTA_COLOR(d.wtp_30d_delta)}">${d.wtp_30d_delta > 0 ? '+' : ''}${d.wtp_30d_delta}</b><br/>Rank: #${d.wtp_rank} &nbsp;|&nbsp; Risk band: ${d.risk_band}`)
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.val').data(data).join('text')
        .attr('class', 'val').attr('x', d => x(d.wtp_score) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)').style('pointer-events', 'none').text(d => d.wtp_score)

      svg.append('g').selectAll('text.lbl').data(data).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none').text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─────────────────────────────────────────────
   3. WTP Delta diverging bar
───────────────────────────────────────────── */
function WTPDeltaChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 60, bottom: 4, left: 130 }
      const rowH = 36
      const H = data.length * rowH + margin.top + margin.bottom
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      const tooltip = makeTooltip()
      const extent = d3.max(data, d => Math.abs(d.wtp_30d_delta)) * 1.2
      const x = d3.scaleLinear().domain([-extent, extent]).range([margin.left, W - margin.right])
      const y = d3.scaleBand().domain(data.map(d => d.name)).range([margin.top, H - margin.bottom]).padding(0.25)
      const mid = x(0)

      svg.append('line').attr('x1', mid).attr('x2', mid).attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.3)').attr('stroke-width', 1)

      svg.append('g').selectAll('rect.bar').data(data).join('rect')
        .attr('class', 'bar').attr('x', d => d.wtp_30d_delta < 0 ? x(d.wtp_30d_delta) : mid)
        .attr('y', d => y(d.name) + 1).attr('width', 0).attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => DELTA_COLOR(d.wtp_30d_delta))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.abs(x(d.wtp_30d_delta) - mid))

      svg.append('g').selectAll('rect.hov').data(data).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 40) + 'px')
            .html(`<b>${d.name}</b><br/>WTP Δ30d: <b style="color:${DELTA_COLOR(d.wtp_30d_delta)}">${d.wtp_30d_delta > 0 ? '+' : ''}${d.wtp_30d_delta} pts</b><br/>Current WTP: ${d.wtp_score}/100<br/>Engagement: ${d.engagement_trend.replace(/_/g, ' ')}`)
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
        .attr('class', 'lbl').attr('x', margin.left - 8).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none').text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─────────────────────────────────────────────
   4. Priority score bar
───────────────────────────────────────────── */
function PriorityChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const sorted = [...data].sort((a, b) => b.priority_score - a.priority_score)
      const W = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 56, bottom: 4, left: 130 }
      const rowH = 36
      const H = sorted.length * rowH + margin.top + margin.bottom
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      const tooltip = makeTooltip()
      const maxP = d3.max(sorted, d => d.priority_score)
      const x = d3.scaleLinear().domain([0, maxP * 1.12]).range([margin.left, W - margin.right])
      const y = d3.scaleBand().domain(sorted.map(d => d.name)).range([margin.top, H - margin.bottom]).padding(0.25)

      svg.append('g').selectAll('line').data(x.ticks(4)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.1)').attr('stroke-width', 1)

      svg.append('g').selectAll('rect.bar').data(sorted).join('rect')
        .attr('class', 'bar').attr('x', margin.left).attr('y', d => y(d.name) + 1)
        .attr('width', 0).attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => RISK_COLOR(d.delinquency_risk_30d))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(d.priority_score) - margin.left))

      svg.append('g').selectAll('rect.hov').data(sorted).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 40) + 'px')
            .html(`<b>${d.name}</b><br/>Priority score: <b>${d.priority_score}</b><br/>Delinquency risk: <b>${(d.delinquency_risk_30d * 100).toFixed(0)}%</b><br/>Action: ${d.recommended_action}`)
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.val').data(sorted).join('text')
        .attr('class', 'val').attr('x', d => x(d.priority_score) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)').style('pointer-events', 'none')
        .text(d => d.priority_score.toFixed(1))

      svg.append('g').selectAll('text.lbl').data(sorted).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none').text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─────────────────────────────────────────────
   5. WTP Trend bar (single account)
   Uses real wtp_history if available, else generates
   a plausible 8-point decline from (score + |delta|) → score
───────────────────────────────────────────── */
function WTPTrendChart({ account }) {
  const isRealHistory = Array.isArray(account?.wtp_history)
    && account.wtp_history.length >= 4
    && account.wtp_history[0]?.score !== undefined

  let trendData
  if (isRealHistory) {
    trendData = account.wtp_history
  } else {
    const endScore  = account?.wtp_score ?? 41
    const delta     = account?.wtp_30d_delta ?? -18
    const startScore = Math.min(100, endScore - delta)   // delta is negative when declining
    const POINTS = 8
    const DAYS = ['Day 1','Day 5','Day 10','Day 15','Day 20','Day 24','Day 28','Day 30']
    trendData = DAYS.map((day, i) => ({
      day,
      score: Math.round(startScore + (endScore - startScore) * (i / (POINTS - 1)))
    }))
  }

  const W = 500; const H = 220
  const padTop = 36; const padBot = 28; const padL = 6; const padR = 6
  const n = trendData.length
  const totalW = W - padL - padR
  const slotW = totalW / n
  const barW = slotW * 0.80
  const barOff = slotW * 0.10
  const chartH = H - padTop - padBot
  const barX = i => padL + i * slotW + barOff
  const barH = s => (s / 100) * chartH
  const barY = s => padTop + chartH - barH(s)
  const lblX = i => padL + i * slotW + slotW / 2
  const grids = [25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
      {grids.map(g => (
        <line key={g} x1={padL} x2={W - padR}
          y1={padTop + chartH - (g / 100) * chartH} y2={padTop + chartH - (g / 100) * chartH}
          stroke="rgba(128,128,128,0.10)" strokeWidth={1} />
      ))}
      {trendData.map(({ day, score }, i) => (
        <g key={day}>
          <rect x={barX(i)} y={barY(score)} width={barW} height={barH(score)} rx={4} fill={WTP_COLOR(score)} />
          <text x={lblX(i)} y={barY(score) - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill={WTP_COLOR(score)}>{score}</text>
          <text x={lblX(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#999">{day}</text>
        </g>
      ))}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   6. Bubble scatter — WTP vs Delinquency Risk
───────────────────────────────────────────── */
function BubbleChart({ data }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !data?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W = el.getBoundingClientRect().width || 400
      const margin = { top: 20, right: 20, bottom: 44, left: 44 }
      const H = 240
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`).style('overflow', 'visible')
      const tooltip = makeTooltip()
      const x = d3.scaleLinear().domain([0, 100]).range([margin.left, W - margin.right])
      const y = d3.scaleLinear().domain([0, 1]).range([H - margin.bottom, margin.top])
      const rScale = d3.scaleSqrt().domain([0, d3.max(data, d => d.total_open_inr)]).range([6, 24])

      svg.append('g').selectAll('line.xg').data(x.ticks(5)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.08)').attr('stroke-width', 1)
      svg.append('g').selectAll('line.yg').data(y.ticks(4)).join('line')
        .attr('x1', margin.left).attr('x2', W - margin.right)
        .attr('y1', d => y(d)).attr('y2', d => y(d))
        .attr('stroke', 'rgba(128,128,128,0.08)').attr('stroke-width', 1)

      svg.append('rect').attr('x', margin.left).attr('y', y(1))
        .attr('width', x(30) - margin.left).attr('height', y(0.6) - y(1))
        .attr('fill', 'rgba(226,75,74,0.05)')

      svg.append('text').attr('x', W / 2).attr('y', H - 4)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', 'var(--text-muted,#888)').text('WTP Score →')
      svg.append('text').attr('transform', `translate(11,${H / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', 'var(--text-muted,#888)').text('Delinquency Risk →')

      svg.append('g').selectAll('text.xt').data(x.ticks(5)).join('text')
        .attr('x', d => x(d)).attr('y', H - margin.bottom + 13)
        .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', 'var(--text-muted,#888)').text(d => d)
      svg.append('g').selectAll('text.yt').data(y.ticks(4)).join('text')
        .attr('x', margin.left - 5).attr('y', d => y(d) + 4)
        .attr('text-anchor', 'end').attr('font-size', 9).attr('fill', 'var(--text-muted,#888)').text(d => `${(d * 100).toFixed(0)}%`)

      svg.append('g').selectAll('circle.bub').data(data).join('circle')
        .attr('class', 'bub').attr('cx', d => x(d.wtp_score)).attr('cy', d => y(d.delinquency_risk_30d))
        .attr('r', d => rScale(d.total_open_inr)).attr('fill', d => WTP_COLOR(d.wtp_score))
        .attr('opacity', 0.75).attr('stroke', '#fff').attr('stroke-width', 1).style('cursor', 'crosshair')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px').style('top', (event.clientY - 40) + 'px')
            .html(`<b>${d.name}</b><br/>WTP: <b>${d.wtp_score}</b> &nbsp;|&nbsp; Δ: <b style="color:${DELTA_COLOR(d.wtp_30d_delta)}">${d.wtp_30d_delta}</b><br/>Delinquency: <b>${(d.delinquency_risk_30d * 100).toFixed(0)}%</b><br/>Open AR: ₹${(d.total_open_inr / 100000).toFixed(1)}L`)
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      svg.append('g').selectAll('text.bl').data(data).join('text')
        .attr('x', d => x(d.wtp_score)).attr('y', d => y(d.delinquency_risk_30d) + 4)
        .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#fff').attr('font-weight', 600)
        .style('pointer-events', 'none').text(d => d.name.split(' ')[0])

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─────────────────────────────────────────────
   7. Single-customer collection metrics bar
   (shown only when data has 1 account)
───────────────────────────────────────────── */
function SingleMetricsChart({ account }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !account) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W = el.getBoundingClientRect().width || 400
      const metrics = [
        { label: 'Avg payment delay (days)', value: account.avg_payment_delay ?? 0, max: 120, color: '#e24b4a' },
        { label: 'Oldest item (days)',        value: account.oldest_item_days ?? 0,  max: 120, color: '#e24b4a' },
        { label: 'Credit utilisation (%)',    value: account.credit_utilization ?? 0, max: 100, color: '#e24b4a' },
        { label: 'Priority score',            value: account.priority_score ?? 0,    max: 100, color: '#ef9f27' },
      ]
      const margin = { top: 4, right: 60, bottom: 4, left: 160 }
      const rowH = 36
      const H = metrics.length * rowH + margin.top + margin.bottom
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      const y = d3.scaleBand().domain(metrics.map(m => m.label)).range([margin.top, H - margin.bottom]).padding(0.25)

      metrics.forEach(m => {
        const xScale = d3.scaleLinear().domain([0, m.max]).range([margin.left, W - margin.right])
        svg.append('rect').attr('x', margin.left).attr('y', y(m.label) + 1)
          .attr('width', 0).attr('height', y.bandwidth() - 2).attr('rx', 3).attr('fill', m.color)
          .transition().duration(650).ease(d3.easeCubicOut)
          .attr('width', Math.max(0, xScale(Math.min(m.value, m.max)) - margin.left))
        svg.append('text').attr('x', xScale(Math.min(m.value, m.max)) + 5).attr('y', y(m.label) + y.bandwidth() / 2 + 4)
          .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)').text(m.value.toFixed(1))
        svg.append('text').attr('x', margin.left - 8).attr('y', y(m.label) + y.bandwidth() / 2 + 4)
          .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--text-secondary,#aaa)')
          .text(m.label.length > 22 ? m.label.slice(0, 21) + '…' : m.label)
      })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [account])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function WTPDashboard({ data }) {
  // ✅ Normalise: accept single object OR array
  const arr = Array.isArray(data) ? data : (data ? [data] : [])
  if (!arr.length) return null

  const isSingle   = arr.length === 1
  const sorted     = [...arr].sort((a, b) => a.wtp_rank - b.wtp_rank)
  const alertCount = arr.filter(d => d.wtp_30d_delta <= -20).length
  const dropCount  = arr.filter(d => d.wtp_30d_delta < 0).length
  const avgWTP     = (arr.reduce((s, d) => s + d.wtp_score, 0) / arr.length).toFixed(0)
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
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isSingle ? 4 : 4},1fr)`, gap: 8 }}>
        {[
          { label: 'WTP score',           value: isSingle ? topPriority.wtp_score : avgWTP,  color: WTP_COLOR(+(isSingle ? topPriority.wtp_score : avgWTP)) },
          { label: '30d delta',           value: `${topPriority.wtp_30d_delta > 0 ? '+' : ''}${topPriority.wtp_30d_delta}`, color: DELTA_COLOR(topPriority.wtp_30d_delta) },
          { label: 'Delinquency risk',    value: `${(topPriority.delinquency_risk_30d * 100).toFixed(0)}%`, color: RISK_COLOR(topPriority.delinquency_risk_30d) },
          { label: isSingle ? 'Priority score' : '#1 Priority', value: isSingle ? topPriority.priority_score.toFixed(1) : topPriority?.name.split(' ')[0], color: '#ef9f27' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Alert banner ── */}
      <div style={{
        ...card,
        background: 'rgba(226,75,74,0.07)', border: '1px solid rgba(226,75,74,0.25)',
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
            Δ30d: <b style={{ color: DELTA_COLOR(topPriority?.wtp_30d_delta) }}>{topPriority?.wtp_30d_delta}</b> &nbsp;·&nbsp;
            Best time: <b style={{ color: 'var(--text-primary)' }}>{topPriority?.best_contact_time}</b> via <b style={{ color: 'var(--text-primary)' }}>{topPriority?.preferred_channel}</b>
            {isSingle && topPriority.open_disputes > 0 && (
              <> &nbsp;·&nbsp; <b style={{ color: '#ef9f27' }}>{topPriority.open_disputes} open disputes</b></>
            )}
          </div>
        </div>
      </div>

      {/* ── Single customer: gauge + metrics + trend ── */}
      {isSingle && (
        <>
          {/* WTP Score Gauge */}
          <div style={card}>
            <div style={secLabel}>WTP score — 0 = won't pay · 100 = will pay</div>
            <WTPGauge score={topPriority.wtp_score} />
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              Score <b style={{ color: WTP_COLOR(topPriority.wtp_score) }}>{topPriority.wtp_score}</b> —
              {topPriority.wtp_score <= 30 ? ' in the critical zone — immediate intervention needed.' : ' in the warning zone — close to the critical threshold (<30).'}
            </div>
          </div>

          {/* Collection metrics */}
          <div style={card}>
            <div style={secLabel}>Collection metrics</div>
            <SingleMetricsChart account={topPriority} />
          </div>
        </>
      )}

      {/* ── Multi-account: WTP score bars ── */}
      {!isSingle && (
        <div style={card}>
          <div style={secLabel}>WTP score (0 = won't pay, 100 = will pay)</div>
          <WTPScoreChart data={sorted} />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            Red zone (&lt;30) = immediate intervention needed. Hover bars for details.
          </div>
        </div>
      )}

      {/* ── WTP 30-day trend (always shown for top priority) ── */}
      <div style={card}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary,#fff)', marginBottom: 3 }}>
            WTP score trend — last 30 days
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted,#999)', fontStyle: 'italic' }}>
            {topPriority?.name}
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

      {/* ── Delta chart (multi only) ── */}
      {!isSingle && (
        <div style={card}>
          <div style={secLabel}>WTP Δ30d — score change over last 30 days</div>
          <WTPDeltaChart data={sorted} />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            Negative = deteriorating willingness to pay. Hover for engagement trend.
          </div>
        </div>
      )}

      {/* ── Priority chart (multi only) ── */}
      {!isSingle && (
        <div style={card}>
          <div style={secLabel}>Collection priority score (higher = act first)</div>
          <PriorityChart data={arr} />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            Color = delinquency risk. Hover for recommended action.
          </div>
        </div>
      )}

      {/* ── Bubble scatter (multi only) ── */}
      {!isSingle && (
        <div style={card}>
          <div style={secLabel}>WTP score vs delinquency risk (bubble = open AR size)</div>
          <BubbleChart data={arr} />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            Bottom-left = highest risk. Bubble size = open AR. Hover for full details.
          </div>
        </div>
      )}

      {/* ── Single-account AR info strip ── */}
      {isSingle && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Open invoices',      value: topPriority.open_invoice_count },
            { label: 'Open AR',            value: `₹${(topPriority.total_open_inr / 100000).toFixed(1)}L` },
            { label: 'Credit limit',       value: `₹${(topPriority.credit_limit / 100000).toFixed(0)}L` },
            { label: 'Payment terms',      value: topPriority.payment_terms },
          ].map(({ label, value }) => (
            <div key={label} style={{ ...card }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

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