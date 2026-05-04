// src/components/PTPDashboard.jsx

const DELAY_COLOR = (days) => {
  if (days <= 20) return '#378ADD'
  if (days <= 35) return '#EF9F27'
  return '#E24B4A'
}

const INR = (val) => '₹' + (val / 100000).toFixed(2) + 'L'

function MetricCard({ label, value, sub, subColor }) {
  return (
    <div style={{
      background: 'var(--bg-input)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function DelayBar({ invoice }) {
  const maxDays = 70
  const pct = Math.min((invoice.days_overdue / maxDays) * 100, 100)
  const color = DELAY_COLOR(invoice.days_overdue)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 100, flexShrink: 0 }}>
        {invoice.invoice_no.replace('INV-', '')}
      </div>
      <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 3, height: 12, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 3, transition: 'width 0.6s ease'
        }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color, width: 90, textAlign: 'right', flexShrink: 0 }}>
        {invoice.days_overdue}d · {INR(invoice.amount)}
      </div>
    </div>
  )
}

function DonutRisk({ risk }) {
  const pct = Math.round(risk * 100)
  const r = 40, cx = 50, cy = 50
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - risk)
  const color = pct < 30 ? '#1D9E75' : pct < 60 ? '#EF9F27' : '#E24B4A'
  const label = pct < 30 ? 'Low risk' : pct < 60 ? 'Watch closely' : 'Immediate action'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 100 100" style={{ width: 110, height: 110 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2a3a" strokeWidth="10" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${circ}`}
          strokeDashoffset={`${offset}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
          style={{ fill: 'var(--text-primary)' }}
        >
          {pct}%
        </text>
        <text
          x={cx} y={cy + 13}
          textAnchor="middle"
          fontSize="9"
          style={{ fill: 'var(--text-muted)' }}
        >
          delinquency
        </text>
      </svg>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function PaymentTrend({ history }) {
  if (!history?.length) return null
  const maxDelay = Math.max(...history.map(h => h.delay_days), 1)

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Payment delay trend (days overdue)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
        {history.map((h, i) => {
          const heightPct = Math.max((h.delay_days / maxDelay) * 100, 5)
          const color = DELAY_COLOR(h.delay_days)
          const label = h.paid_date
            ? h.paid_date.slice(0, 7).replace(/-(\d+)$/, "'$1")
            : ''
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: 9, color, fontWeight: 700 }}>{h.delay_days}d</div>
              <div style={{
                width: '100%', background: color,
                borderRadius: '3px 3px 0 0',
                height: `${heightPct}%`,
                minHeight: 4,
                transition: 'height 0.5s ease'
              }} />
              <div style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                {label}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
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

function WTPGauge({ score, delta }) {
  const pct = Math.min(Math.max(score, 0), 100)
  const color = pct >= 70 ? '#1D9E75' : pct >= 50 ? '#EF9F27' : '#E24B4A'
  return (
    <div style={{
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Willingness to Pay
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 11, color: delta < 0 ? '#E24B4A' : '#1D9E75', fontWeight: 600 }}>
          {delta > 0 ? '+' : ''}{delta} pts / 30d
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 3,
          transition: 'width 0.6s ease'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)' }}>
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  )
}

function CreditBar({ used, limit }) {
  const pct = Math.min((used / limit) * 100, 100)
  const color = pct >= 85 ? '#E24B4A' : pct >= 65 ? '#EF9F27' : '#1D9E75'
  return (
    <div style={{
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Credit utilization
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {INR(used)} / {INR(limit)}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 3,
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  )
}

export default function PTPDashboard({ data }) {
  // Handle both { customer: {...} } and flat shape
  const customer = data?.customer || data
  if (!customer?.ptp_records?.length) return null

  const ptp = customer.ptp_records[0]
  const isPastDue = new Date(ptp.promise_date) < new Date()
  const statusColor = ptp.status === 'open'
    ? (isPastDue ? 'var(--risk-critical)' : 'var(--risk-medium)')
    : 'var(--risk-low)'

  return (
    <div style={{
      marginTop: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      fontSize: 13
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text-primary)' }}>
            PTP Analysis — {customer.name}
          </span>
        </div>
        <span style={{
          fontSize: 10, padding: '2px 10px', borderRadius: 20,
          background: isPastDue && ptp.status === 'open' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
          color: isPastDue && ptp.status === 'open' ? 'var(--risk-critical)' : 'var(--risk-medium)',
          border: `1px solid ${isPastDue && ptp.status === 'open' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
          fontWeight: 600, letterSpacing: '0.04em'
        }}>
          {ptp.status.toUpperCase()} · {isPastDue ? 'PAST DUE' : 'PENDING'}
        </span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Row 1: 4 metric cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <MetricCard
            label="PTP Amount" value={INR(ptp.amount)}
            sub={`Due ${ptp.promise_date}`}
            subColor={isPastDue ? 'var(--risk-critical)' : 'var(--text-muted)'}
          />
          <MetricCard
            label="Total Overdue" value={INR(customer.total_open_inr)}
            sub={`${customer.open_invoices?.length || 0} open invoices`}
            subColor="var(--risk-critical)"
          />
          <MetricCard
            label="Avg Payment Delay" value={`${customer.avg_payment_delay}d`}
            sub={`Terms: ${customer.payment_terms}`}
          />
          <MetricCard
            label="Risk Class" value={customer.risk_class}
            sub={customer.account_group?.replace('_', ' ')}
            subColor="var(--text-muted)"
          />
        </div>

        {/* ── Row 2: WTP gauge + Credit bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <WTPGauge score={customer.wtp_score} delta={customer.wtp_30d_delta} />
          <CreditBar used={customer.credit_used} limit={customer.credit_limit} />
        </div>

        {/* ── Row 3: Payment trend bar chart + Donut ── */}
        <div style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 16
        }}>
          <PaymentTrend history={customer.payment_history} />
          <DonutRisk risk={customer.delinquency_risk_30d} />
        </div>

        {/* ── Row 4: Invoice aging bars ── */}
        <div style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px'
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Open invoice aging
          </div>
          {customer.open_invoices?.length
            ? customer.open_invoices.map((inv, i) => <DelayBar key={i} invoice={inv} />)
            : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No open invoices</div>
          }
        </div>

        {/* ── Row 5: PTP details + Engagement signals ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

          <div style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px'
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              PTP details
            </div>
            {[
              ['PTP ID',   ptp.ptp_id],
              ['Contact',  ptp.contact],
              ['Mode',     ptp.mode_of_payment],
              ['Created',  ptp.created_date],
              ['Due',      ptp.promise_date],
              ['Notes',    ptp.notes],
            ].map(([k, v]) => v && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px'
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Engagement signals
            </div>
            {[
              ['Preferred channel',  customer.engagement?.preferred_channel],
              ['Email open rate',    `${Math.round((customer.engagement?.email_open_rate_30d || 0) * 100)}%`],
              ['Last email opened',  `${customer.engagement?.last_email_open_daysago}d ago`],
              ['Last link click',    `${customer.engagement?.last_link_click_daysago}d ago`],
              ['Avg response',       `${customer.engagement?.avg_response_hours}h`],
              ['Best contact time',  customer.engagement?.best_contact_time],
              ['Trend',              customer.engagement?.engagement_trend],
            ].map(([k, v]) => v && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: v === 'declining' ? '#E24B4A'
                    : v === 'stable' ? '#EF9F27'
                    : 'var(--text-primary)'
                }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}