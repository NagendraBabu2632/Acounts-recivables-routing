// src/components/RiskDashboard.jsx
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const RISK_COLOR  = s => s >= 80 ? '#e24b4a' : s >= 50 ? '#ef9f27' : '#639922'
const UTIL_COLOR  = v => v >= 90 ? '#e24b4a' : v >= 70 ? '#ef9f27' : '#639922'
const DELAY_COLOR = v => v >= 90 ? '#e24b4a' : v >= 30 ? '#ef9f27' : '#639922'

/* ── shared tooltip ── */
function makeTooltip() {
  d3.select('#rd-tooltip').remove()
  return d3.select('body')
    .append('div')
    .attr('id', 'rd-tooltip')
    .style('position', 'fixed')
    .style('pointer-events', 'none')
    .style('background', 'rgba(20,20,30,0.92)')
    .style('color', '#fff')
    .style('font-size', '12px')
    .style('padding', '6px 10px')
    .style('border-radius', '6px')
    .style('white-space', 'nowrap')
    .style('z-index', '9999')
    .style('opacity', 0)
}

/* ─── Horizontal bar chart ─── */
function HBar({ data, getValue, getColor, getLabel, getTooltip, formatTick, maxVal }) {
  const ref = useRef()
 
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
 
    const draw = () => {
      d3.select(el).selectAll('*').remove()
 
      const W      = el.getBoundingClientRect().width || 400
      const margin = { top: 4, right: 48, bottom: 4, left: 130 }
      const rowH   = 32
      const H      = data.length * rowH + margin.top + margin.bottom
 
      const svg = d3.select(el)
        .append('svg')
        .attr('width', '100%')
        .attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
 
      const x = d3.scaleLinear()
        .domain([0, maxVal || d3.max(data, getValue) * 1.12])
        .range([margin.left, W - margin.right])
 
      const y = d3.scaleBand()
        .domain(data.map(getLabel))
        .range([margin.top, H - margin.bottom])
        .padding(0.25)
 
      const tooltip = makeTooltip()
 
      // grid lines
      svg.append('g')
        .selectAll('line')
        .data(x.ticks(5))
        .join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.1)')
        .attr('stroke-width', 1)
 
      // bars
      svg.append('g')
        .selectAll('rect.bar')
        .data(data)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', margin.left)
        .attr('y', d => y(getLabel(d)) + 1)
        .attr('width', 0)
        .attr('height', y.bandwidth() - 2)
        .attr('rx', 3)
        .attr('fill', d => getColor(getValue(d)))
        .transition().duration(650).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(getValue(d)) - margin.left))
 
      // transparent hover overlay per row
      svg.append('g')
        .selectAll('rect.hover')
        .data(data)
        .join('rect')
        .attr('class', 'hover')
        .attr('x', 0)
        .attr('y', d => y(getLabel(d)))
        .attr('width', W)
        .attr('height', y.bandwidth())
        .attr('fill', 'transparent')
        .style('cursor', 'default')
        .on('mousemove', (event, d) => {
          tooltip
            .style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top',  (event.clientY - 36) + 'px')
            .html(getTooltip(d))
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))
 
      // value labels at end of bar
      svg.append('g')
        .selectAll('text.val')
        .data(data)
        .join('text')
        .attr('class', 'val')
        .attr('x', d => x(getValue(d)) + 5)
        .attr('y', d => y(getLabel(d)) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11)
        .attr('fill', 'var(--text-muted, #888)')
        .style('pointer-events', 'none')
        .text(d => formatTick(getValue(d)))
 
      // y-axis labels (truncated, full name in tooltip)
      svg.append('g')
        .selectAll('text.lbl')
        .data(data)
        .join('text')
        .attr('class', 'lbl')
        .attr('x', margin.left - 8)
        .attr('y', d => y(getLabel(d)) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 11)
        .attr('fill', 'var(--text-secondary, #aaa)')
        .style('pointer-events', 'none')
        .text(d => {
          const lbl = getLabel(d)
          return lbl.length > 17 ? lbl.slice(0, 16) + '…' : lbl
        })
 
      return () => tooltip.remove()
    }
 
    draw()
 
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
 
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─── Vertical bar chart ─── */
function VBar({ data, getValue, getColor, getLabel, getTooltip, formatTick }) {
  const ref = useRef()

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    d3.select(el).selectAll('*').remove()

    const W      = el.clientWidth || 500
    const margin = { top: 20, right: 12, bottom: 48, left: 42 }
    const H      = 220

    const svg = d3.select(el)
      .append('svg')
      .attr('width', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const x = d3.scaleBand()
      .domain(data.map(getLabel))
      .range([margin.left, W - margin.right])
      .padding(0.3)

    const maxV = d3.max(data, getValue)
    const y = d3.scaleLinear()
      .domain([0, maxV * 1.18])
      .range([H - margin.bottom, margin.top])

    const tooltip = makeTooltip()

    // grid
    svg.append('g')
      .selectAll('line')
      .data(y.ticks(4))
      .join('line')
      .attr('x1', margin.left).attr('x2', W - margin.right)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', 'rgba(128,128,128,0.1)')
      .attr('stroke-width', 1)

    // y-axis ticks
    svg.append('g')
      .selectAll('text.ytick')
      .data(y.ticks(4))
      .join('text')
      .attr('class', 'ytick')
      .attr('x', margin.left - 5)
      .attr('y', d => y(d) + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .attr('fill', 'var(--text-muted, #888)')
      .text(formatTick)

    // bars
    svg.append('g')
      .selectAll('rect.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(getLabel(d)))
      .attr('y', H - margin.bottom)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', d => getColor(getValue(d)))
      .transition().duration(650).ease(d3.easeCubicOut)
      .attr('y', d => y(getValue(d)))
      .attr('height', d => H - margin.bottom - y(getValue(d)))

    // invisible hover rects over bars
    svg.append('g')
      .selectAll('rect.hover')
      .data(data)
      .join('rect')
      .attr('class', 'hover')
      .attr('x', d => x(getLabel(d)))
      .attr('y', margin.top)
      .attr('width', x.bandwidth())
      .attr('height', H - margin.bottom - margin.top)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event, d) => {
        tooltip
          .style('opacity', 1)
          .style('left', (event.clientX + 12) + 'px')
          .style('top',  (event.clientY - 28) + 'px')
          .html(getTooltip(d))
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))

    // x-axis labels (two lines)
    data.forEach(d => {
      const words = getLabel(d).split(' ')
      const line1 = words[0]
      const line2 = words.slice(1).join(' ')
      const cx    = x(getLabel(d)) + x.bandwidth() / 2
      const baseY = H - margin.bottom + 14

      svg.append('text')
        .attr('x', cx).attr('y', baseY)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('fill', 'var(--text-secondary, #aaa)')
        .text(line1.length > 9 ? line1.slice(0, 8) + '…' : line1)

      if (line2) {
        svg.append('text')
          .attr('x', cx).attr('y', baseY + 13)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .attr('fill', 'var(--text-secondary, #aaa)')
          .text(line2.length > 9 ? line2.slice(0, 8) + '…' : line2)
      }
    })

    return () => tooltip.remove()
  }, [data])

  return <div ref={ref} style={{ width: '100%' }} />
}

/* ─── Main component ─── */
export default function RiskDashboard({ data }) {
  if (!data?.length) return null

  const totalAR  = data.reduce((s, d) => s + d.total_open_inr, 0)
  const critical = data.filter(d => d.risk_band === 'critical').length
  const high     = data.filter(d => d.risk_band === 'high').length
  const healthy  = data.filter(d => d.risk_band === 'low').length

  const sortedByRisk = [...data].sort((a, b) => b.risk_score - a.risk_score)
  const sortedByAR   = [...data].sort((a, b) => b.total_open_inr - a.total_open_inr)

  const card = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md, 8px)',
    padding: '14px 16px',
  }

  const secLabel = {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Summary metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { label: 'Total AR',  value: `₹${(totalAR / 100000).toFixed(1)}L`, color: 'var(--text-primary)' },
          { label: 'Critical',  value: critical, color: '#e24b4a' },
          { label: 'High risk', value: high,     color: '#ef9f27' },
          { label: 'Healthy',   value: healthy,  color: '#639922' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Risk score ── */}
      <div style={card}>
        <div style={secLabel}>Risk score</div>
        <HBar
          data={sortedByRisk}
          getValue={d => d.risk_score}
          getColor={RISK_COLOR}
          getLabel={d => d.name}
          getTooltip={d => `<b>${d.name}</b><br/>Risk score: ${d.risk_score}/100<br/>Band: ${d.risk_band}`}
          formatTick={v => String(v)}
          maxVal={110}
        />
      </div>

      {/* ── Open AR ── */}
      <div style={card}>
        <div style={secLabel}>Open AR (₹ lakhs)</div>
        <HBar
          data={sortedByAR}
          getValue={d => +(d.total_open_inr / 100000).toFixed(1)}
          getColor={d => RISK_COLOR(d.risk_score)}
          getLabel={d => d.name}
          getTooltip={d => `<b>${d.name}</b><br/>Open AR: ₹${(d.total_open_inr/100000).toFixed(1)}L<br/>Oldest item: ${d.oldest_item_days}d`}
          formatTick={v => `₹${v}L`}
        />
      </div>

      {/* ── Credit utilization ── */}
      <div style={card}>
        <div style={secLabel}>Credit utilization %</div>
        <VBar
          data={data}
          getValue={d => +d.credit_utilization.toFixed(1)}
          getColor={UTIL_COLOR}
          getLabel={d => d.name}
          getTooltip={d => `<b>${d.name}</b><br/>Utilization: ${d.credit_utilization.toFixed(1)}%<br/>Used: ₹${(d.credit_used/100000).toFixed(1)}L / ₹${(d.credit_limit/100000).toFixed(1)}L`}
          formatTick={v => `${v}%`}
        />
      </div>

      {/* ── Avg payment delay ── */}
      <div style={card}>
        <div style={secLabel}>Avg payment delay (days)</div>
        <VBar
          data={data}
          getValue={d => +d.avg_payment_delay.toFixed(1)}
          getColor={DELAY_COLOR}
          getLabel={d => d.name}
          getTooltip={d => `<b>${d.name}</b><br/>Avg delay: ${d.avg_payment_delay.toFixed(1)} days<br/>Terms: ${d.payment_terms}`}
          formatTick={v => `${v}d`}
        />
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
        {[
          { color: '#e24b4a', label: 'Critical' },
          { color: '#ef9f27', label: 'High / Warning' },
          { color: '#639922', label: 'Healthy' },
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