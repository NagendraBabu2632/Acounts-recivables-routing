// src/components/AccountDashboard.jsx
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

/* ── shared tooltip ── */
function makeTooltip() {
  // d3.select('#ad-tooltip').remove()
  return d3.select('body')
    .append('div')
    .attr('id', 'ad-tooltip')
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

/* ── 1. Credit utilization gauge (NO needle, NO dot) ── */
function GaugeChart({ value, creditUsed, creditLimit, max = 100 }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    d3.select(el).selectAll('*').remove()

    const W   = el.getBoundingClientRect().width || 260
    const H   = W * 0.55
    const cx  = W / 2
    const cy  = H * 0.92
    const r   = Math.min(W, H * 2) * 0.38

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)

    const tooltip = makeTooltip()

    const color  = value >= 90 ? '#e24b4a' : value >= 70 ? '#ef9f27' : '#639922'
    const pct    = Math.min(value, max) / max
    const endAng = -Math.PI / 2 + Math.PI * pct

    const arc = d3.arc()
      .innerRadius(r * 0.68)
      .outerRadius(r)
      .startAngle(-Math.PI / 2)

    const tooltipHtml =
      `<b>Credit Utilization</b><br/>` +
      `Used: ₹${(creditUsed / 100000).toFixed(1)}L<br/>` +
      `Limit: ₹${(creditLimit / 100000).toFixed(1)}L<br/>` +
      `Utilization: <b style="color:${color}">${value.toFixed(1)}%</b>`

    const onMove = (event) => {
      tooltip.style('opacity', 1)
        .style('left', (event.clientX + 14) + 'px')
        .style('top', (event.clientY - 40) + 'px')
        .html(tooltipHtml)
    }
    const onLeave = () => tooltip.style('opacity', 0)

    // background track — tooltip on hover
    svg.append('path')
      .datum({ endAngle: Math.PI / 2 })
      .attr('d', arc)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('fill', 'rgba(128,128,128,0.15)')
      .style('cursor', 'default')
      .on('mousemove', onMove)
      .on('mouseleave', onLeave)

    // value arc — tooltip on hover
    svg.append('path')
      .datum({ endAngle: endAng })
      .attr('d', arc)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('fill', color)
      .style('cursor', 'default')
      .on('mousemove', onMove)
      .on('mouseleave', onLeave)

    // center label — percentage
    svg.append('text')
      .attr('x', cx).attr('y', cy - r * 0.18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 22).attr('font-weight', 500)
      .attr('fill', color)
      .style('pointer-events', 'none')
      .text(`${value.toFixed(1)}%`)

    // sub label
    svg.append('text')
      .attr('x', cx).attr('y', cy - r * 0.18 + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', 'var(--text-muted,#888)')
      .style('pointer-events', 'none')
      .text('credit utilization')

    // 0% / 100% edge labels
    svg.append('text')
      .attr('x', cx - r - 2).attr('y', cy + 14)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', 'var(--text-muted,#888)')
      .style('pointer-events', 'none')
      .text('0%')

    svg.append('text')
      .attr('x', cx + r + 2).attr('y', cy + 14)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', 'var(--text-muted,#888)')
      .style('pointer-events', 'none')
      .text('100%')

    return () => tooltip.remove()
  }, [value, creditUsed, creditLimit])

  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── 2. Payment history delay bar chart ── */
function PaymentHistoryChart({ history }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !history?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W      = el.getBoundingClientRect().width || 360
      const margin = { top: 16, right: 16, bottom: 40, left: 44 }
      const H      = 200

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)

      const tooltip = makeTooltip()

      const x = d3.scaleBand()
        .domain(history.map(d => d.invoice_no))
        .range([margin.left, W - margin.right]).padding(0.3)

      const maxDelay = d3.max(history, d => d.delay_days)
      const y = d3.scaleLinear()
        .domain([0, maxDelay * 1.2])
        .range([H - margin.bottom, margin.top])

      // grid
      svg.append('g').selectAll('line').data(y.ticks(4)).join('line')
        .attr('x1', margin.left).attr('x2', W - margin.right)
        .attr('y1', d => y(d)).attr('y2', d => y(d))
        .attr('stroke', 'rgba(128,128,128,0.1)').attr('stroke-width', 1)

      // y ticks
      svg.append('g').selectAll('text.yt').data(y.ticks(4)).join('text')
        .attr('class', 'yt')
        .attr('x', margin.left - 5).attr('y', d => y(d) + 4)
        .attr('text-anchor', 'end').attr('font-size', 10)
        .attr('fill', 'var(--text-muted,#888)').text(d => `${d}d`)

      // bars
      svg.append('g').selectAll('rect.bar').data(history).join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.invoice_no))
        .attr('y', H - margin.bottom)
        .attr('width', x.bandwidth()).attr('height', 0).attr('rx', 3)
        .attr('fill', d => d.delay_days >= 60 ? '#e24b4a' : d.delay_days >= 30 ? '#ef9f27' : '#639922')
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('y', d => y(d.delay_days))
        .attr('height', d => H - margin.bottom - y(d.delay_days))

      // hover overlay — full column height for easy hover
      svg.append('g').selectAll('rect.hov').data(history).join('rect')
        .attr('class', 'hov')
        .attr('x', d => x(d.invoice_no)).attr('y', margin.top)
        .attr('width', x.bandwidth()).attr('height', H - margin.bottom - margin.top)
        .attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.invoice_no}</b><br/>` +
              `Amount: ₹${(d.amount / 100000).toFixed(1)}L<br/>` +
              `Delay: <b>${d.delay_days} days</b><br/>` +
              `Due: ${d.due_date}<br/>` +
              `Paid: ${d.paid_date}`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      // x labels
      svg.append('g').selectAll('text.xl').data(history).join('text')
        .attr('class', 'xl')
        .attr('x', d => x(d.invoice_no) + x.bandwidth() / 2)
        .attr('y', H - margin.bottom + 13)
        .attr('text-anchor', 'middle').attr('font-size', 9)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .text(d => d.invoice_no.slice(-4))

      svg.append('text').attr('x', W / 2).attr('y', H - 2)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('fill', 'var(--text-muted,#888)').text('Invoice (last 4 digits)')

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [history])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── 3. Open invoices aging horizontal bar ── */
function AgingChart({ invoices }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !invoices?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W      = el.getBoundingClientRect().width || 360
      const margin = { top: 4, right: 60, bottom: 4, left: 120 }
      const rowH   = 34
      const H      = invoices.length * rowH + margin.top + margin.bottom

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)

      const tooltip = makeTooltip()
      const maxDays = d3.max(invoices, d => d.days_overdue) * 1.15

      const x = d3.scaleLinear().domain([0, maxDays]).range([margin.left, W - margin.right])
      const y = d3.scaleBand()
        .domain(invoices.map(d => d.invoice_no))
        .range([margin.top, H - margin.bottom]).padding(0.25)

      // grid
      svg.append('g').selectAll('line').data(x.ticks(4)).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d))
        .attr('y1', margin.top).attr('y2', H - margin.bottom)
        .attr('stroke', 'rgba(128,128,128,0.1)').attr('stroke-width', 1)

      // bars
      svg.append('g').selectAll('rect.bar').data(invoices).join('rect')
        .attr('class', 'bar')
        .attr('x', margin.left).attr('y', d => y(d.invoice_no) + 1)
        .attr('width', 0).attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => d.days_overdue >= 60 ? '#e24b4a' : d.days_overdue >= 30 ? '#ef9f27' : '#639922')
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(d.days_overdue) - margin.left))

      // hover overlay — full row width
      svg.append('g').selectAll('rect.hov').data(invoices).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.invoice_no))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.invoice_no}</b><br/>` +
              `Amount: ₹${(d.amount / 100000).toFixed(2)}L<br/>` +
              `Days overdue: <b>${d.days_overdue}d</b><br/>` +
              `Due date: ${d.due_date}`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      // value labels
      svg.append('g').selectAll('text.val').data(invoices).join('text')
        .attr('class', 'val').attr('x', d => x(d.days_overdue) + 5)
        .attr('y', d => y(d.invoice_no) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)')
        .style('pointer-events', 'none')
        .text(d => `${d.days_overdue}d · ₹${(d.amount / 100000).toFixed(1)}L`)

      // y labels
      svg.append('g').selectAll('text.lbl').data(invoices).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8)
        .attr('y', d => y(d.invoice_no) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none').text(d => d.invoice_no)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [invoices])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── 4. Engagement radar ── */
function EngagementRadar({ engagement }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !engagement) return
    const el = ref.current
    d3.select(el).selectAll('*').remove()

    const W  = el.getBoundingClientRect().width || 260
    const H  = W * 0.85
    const cx = W / 2, cy = H / 2
    const r  = Math.min(W, H) * 0.32

    const axes = [
      {
        label: 'WTP score',
        value: engagement.wtp_score / 100,
        raw: `${engagement.wtp_score}/100`,
        detail: `Δ30d: ${engagement.wtp_30d_delta ?? 'N/A'}`,
      },
      {
        label: 'Email open',
        value: engagement.email_open_rate_30d,
        raw: `${(engagement.email_open_rate_30d * 100).toFixed(0)}%`,
        detail: `Last opened: ${engagement.last_email_open_daysago}d ago`,
      },
      {
        label: 'Response speed',
        value: Math.max(0, 1 - engagement.avg_response_hours / 96),
        raw: `${engagement.avg_response_hours}h avg response`,
        detail: 'Lower hours = higher score',
      },
      {
        label: 'Recency',
        value: Math.max(0, 1 - engagement.last_email_open_daysago / 30),
        raw: `${engagement.last_email_open_daysago}d since last open`,
        detail: `Link click: ${engagement.last_link_click_daysago}d ago`,
      },
    ]

    const svg = d3.select(el).append('svg')
      .attr('width', '100%').attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('overflow', 'visible')

    const tooltip = makeTooltip()

    const angle = (i) => (i / axes.length) * 2 * Math.PI - Math.PI / 2
    const ptX   = (i, v) => cx + r * v * Math.cos(angle(i))
    const ptY   = (i, v) => cy + r * v * Math.sin(angle(i))
const summaryHtml = `
  <div style="font-weight:600; margin-bottom:4px;">Engagement Summary</div>
  ${axes.map(a => `
    <div style="margin-bottom:2px;">
      <span style="color:#4f8ef7;">●</span>
      <b>${a.label}</b>: ${a.raw}<br/>
      <span style="color:#aaa; font-size:11px;">${a.detail}</span>
    </div>
  `).join('')}
`

    // rings
    ;[0.25, 0.5, 0.75, 1].forEach(ring => {
      const pts = axes.map((_, i) => `${ptX(i, ring)},${ptY(i, ring)}`).join(' ')
      svg.append('polygon').attr('points', pts)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(128,128,128,0.15)').attr('stroke-width', 1)
        .style('pointer-events', 'none')
    })

    // spokes
    axes.forEach((_, i) => {
      svg.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', ptX(i, 1)).attr('y2', ptY(i, 1))
        .attr('stroke', 'rgba(128,128,128,0.15)').attr('stroke-width', 1)
        .style('pointer-events', 'none')
    })

    // filled polygon — no pointer events (hit rect handles it)
    const pts = axes.map((d, i) => `${ptX(i, d.value)},${ptY(i, d.value)}`).join(' ')
    svg.append('polygon').attr('points', pts)
      .attr('fill', 'rgba(79,142,247,0.18)')
      .attr('stroke', '#4f8ef7').attr('stroke-width', 1.5)
      .style('pointer-events', 'none')

    // invisible full-area hit rect — always catches mouse, shows summary tooltip
    svg.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', W).attr('height', H)
      .attr('fill', 'transparent')
      .style('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        tooltip.style('opacity', 1)
          .style('left', (event.clientX + 14) + 'px')
          .style('top', (event.clientY - 40) + 'px')
          .html(summaryHtml)
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))

    // dots — large invisible hit area on top for individual axis tooltip
    axes.forEach((d, i) => {
      // invisible large hit circle
      svg.append('circle')
        .attr('cx', ptX(i, d.value)).attr('cy', ptY(i, d.value)).attr('r', 16)
        .attr('fill', 'transparent')
        .style('pointer-events', 'all')
        .style('cursor', 'crosshair')
        .on('mousemove', (event) => {
          event.stopPropagation()
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 12) + 'px')
            .style('top', (event.clientY - 36) + 'px')
            .html(`<b>${d.label}</b><br/>${d.raw}<br/><span style="color:#aaa">${d.detail}</span>`)
        })
        .on('mouseleave', (event) => {
          event.stopPropagation()
          tooltip.style('opacity', 0)
        })

      // visible dot (no pointer events — hit circle handles it)
      svg.append('circle')
        .attr('cx', ptX(i, d.value)).attr('cy', ptY(i, d.value)).attr('r', 5)
        .attr('fill', '#4f8ef7')
        .style('pointer-events', 'none')
    })

    // axis labels
    axes.forEach((d, i) => {
      const lx = cx + (r + 22) * Math.cos(angle(i))
      const ly = cy + (r + 22) * Math.sin(angle(i))
      svg.append('text')
        .attr('x', lx).attr('y', ly + 4)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none')
        .text(d.label)
    })

    return () => tooltip.remove()
  }, [engagement])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── 5. Dispute summary bars ── */
function DisputeChart({ disputes }) {
  const ref = useRef()
  useEffect(() => {
    if (!ref.current || !disputes?.length) return
    const el = ref.current
    const draw = () => {
      d3.select(el).selectAll('*').remove()
      const W      = el.getBoundingClientRect().width || 360
      const margin = { top: 4, right: 80, bottom: 4, left: 110 }
      const rowH   = 34
      const H      = disputes.length * rowH + margin.top + margin.bottom

      const svg = d3.select(el).append('svg')
        .attr('width', '100%').attr('height', H)
        .attr('viewBox', `0 0 ${W} ${H}`)

      const tooltip = makeTooltip()

      const x = d3.scaleLinear()
        .domain([0, d3.max(disputes, d => d.validity_score) * 1.15])
        .range([margin.left, W - margin.right])

      const y = d3.scaleBand()
        .domain(disputes.map(d => d.dispute_id))
        .range([margin.top, H - margin.bottom]).padding(0.25)

      // bars
      svg.append('g').selectAll('rect.bar').data(disputes).join('rect')
        .attr('class', 'bar').attr('x', margin.left)
        .attr('y', d => y(d.dispute_id) + 1)
        .attr('width', 0).attr('height', y.bandwidth() - 2).attr('rx', 3)
        .attr('fill', d => d.validity_score >= 70 ? '#e24b4a' : '#ef9f27')
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr('width', d => Math.max(0, x(d.validity_score) - margin.left))

      // hover overlay — full row width
      svg.append('g').selectAll('rect.hov').data(disputes).join('rect')
        .attr('class', 'hov').attr('x', 0).attr('y', d => y(d.dispute_id))
        .attr('width', W).attr('height', y.bandwidth()).attr('fill', 'transparent')
        .on('mousemove', (event, d) => {
          tooltip.style('opacity', 1)
            .style('left', (event.clientX + 14) + 'px')
            .style('top', (event.clientY - 40) + 'px')
            .html(
              `<b>${d.dispute_id}</b><br/>` +
              `Type: ${d.type}<br/>` +
              `Amount: ₹${(d.amount / 1000).toFixed(0)}K<br/>` +
              `Invoice: ${d.invoice_no}<br/>` +
              `Validity score: <b>${d.validity_score}/100</b><br/>` +
              `Raised: ${d.raised_date}<br/>` +
              `Claim filed: ${d.claim_filed ? '✓ Yes' : '✗ No'} &nbsp;|&nbsp; POD: ${d.pod_available ? '✓ Yes' : '✗ No'}`
            )
        })
        .on('mouseleave', () => tooltip.style('opacity', 0))

      // value labels
      svg.append('g').selectAll('text.val').data(disputes).join('text')
        .attr('class', 'val').attr('x', d => x(d.validity_score) + 5)
        .attr('y', d => y(d.dispute_id) + y.bandwidth() / 2 + 4)
        .attr('font-size', 11).attr('fill', 'var(--text-muted,#888)')
        .style('pointer-events', 'none')
        .text(d => `${d.validity_score}/100 · ₹${(d.amount / 1000).toFixed(0)}K`)

      // y labels
      svg.append('g').selectAll('text.lbl').data(disputes).join('text')
        .attr('class', 'lbl').attr('x', margin.left - 8)
        .attr('y', d => y(d.dispute_id) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', 11)
        .attr('fill', 'var(--text-secondary,#aaa)')
        .style('pointer-events', 'none').text(d => d.dispute_id)

      return () => tooltip.remove()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [disputes])
  return <div ref={ref} style={{ width: '100%' }} />
}

/* ── Main component ── */
export default function AccountDashboard({ data }) {
  if (!data) return null

  const {
    credit_utilization, credit_used, credit_limit,
    total_open_inr, delinquency_risk_30d, wtp_score, avg_payment_delay,
    open_invoices, payment_history, disputes, engagement, risk_class,
  } = data

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

  const riskColor = delinquency_risk_30d >= 0.7 ? '#e24b4a' : delinquency_risk_30d >= 0.4 ? '#ef9f27' : '#639922'
  const wtpColor  = wtp_score <= 35 ? '#e24b4a' : wtp_score <= 60 ? '#ef9f27' : '#639922'

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[
          { label: 'Total Open AR',    value: `₹${(total_open_inr / 100000).toFixed(1)}L`,   color: '#e24b4a' },
          { label: 'Delinquency Risk', value: `${(delinquency_risk_30d * 100).toFixed(0)}%`, color: riskColor },
          { label: 'WTP Score',        value: wtp_score,                                       color: wtpColor  },
          { label: 'Avg Delay',        value: `${avg_payment_delay.toFixed(0)}d`,             color: avg_payment_delay >= 60 ? '#e24b4a' : '#ef9f27' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Credit utilization gauge ── */}
      <div style={card}>
        <div style={secLabel}>Credit utilization</div>
        <GaugeChart
          value={credit_utilization}
          creditUsed={credit_used}
          creditLimit={credit_limit}
        />
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          ₹{(credit_used / 100000).toFixed(1)}L used of ₹{(credit_limit / 100000).toFixed(1)}L limit
        </div>
      </div>

      {/* ── Engagement radar ── */}
      <div style={card}>
        <div style={secLabel}>Engagement radar</div>
        <EngagementRadar engagement={engagement} />
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Trend: <span style={{ color: '#e24b4a' }}>{engagement?.engagement_trend?.replace(/_/g, ' ')}</span>
          &nbsp;·&nbsp; Best contact: <b style={{ color: 'var(--text-primary)' }}>{engagement?.best_contact_time}</b>
          &nbsp;·&nbsp; Channel: <b style={{ color: 'var(--text-primary)' }}>{engagement?.preferred_channel}</b>
        </div>
      </div>

      {/* ── Open invoice aging ── */}
      <div style={card}>
        <div style={secLabel}>Open invoice aging</div>
        <AgingChart invoices={open_invoices} />
      </div>

      {/* ── Payment history delay ── */}
      <div style={card}>
        <div style={secLabel}>Payment history — delay (days)</div>
        <PaymentHistoryChart history={payment_history} />
      </div>

      {/* ── Disputes ── */}
      {disputes?.length > 0 && (
        <div style={card}>
          <div style={secLabel}>Open disputes — validity score</div>
          <DisputeChart disputes={disputes} />
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Higher validity score = stronger dispute claim. Hover bars for full details.
          </div>
        </div>
      )}

      {/* ── Risk badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk class</span>
        <span style={{
          padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
          background: risk_class === 'C' ? 'rgba(226,75,74,0.12)' : risk_class === 'B' ? 'rgba(239,159,39,0.12)' : 'rgba(99,153,34,0.12)',
          color: risk_class === 'C' ? '#e24b4a' : risk_class === 'B' ? '#ef9f27' : '#639922',
          border: `1px solid ${risk_class === 'C' ? 'rgba(226,75,74,0.3)' : risk_class === 'B' ? 'rgba(239,159,39,0.3)' : 'rgba(99,153,34,0.3)'}`,
        }}>
          Class {risk_class}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          · WTP Δ30d: <b style={{ color: '#e24b4a' }}>{data.wtp_30d_delta}</b>
        </span>
      </div>

    </div>
  )
}