// src/components/WTPWorklist.jsx
import { useState, useEffect } from 'react'
import { api } from '../api/client'

function TrendBadge({ trend }) {
  const map = {
    strong:       { label:'Strong',       bg:'rgba(26,135,84,0.12)',  color:'var(--risk-low)' },
    stable:       { label:'Stable',       bg:'rgba(79,142,247,0.1)',  color:'var(--accent-blue)' },
    declining:    { label:'Declining',    bg:'rgba(249,115,22,0.12)', color:'var(--risk-high)' },
    very_low:     { label:'Very Low',     bg:'rgba(239,68,68,0.1)',   color:'var(--risk-critical)' },
    critical_low: { label:'Critical',     bg:'rgba(239,68,68,0.15)',  color:'var(--risk-critical)' },
    sudden_drop:  { label:'Sudden Drop ⚡',bg:'rgba(239,68,68,0.18)', color:'var(--risk-critical)' },
  }
  const t = map[trend] || map['stable']
  return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:t.bg, color:t.color, border:`1px solid ${t.color}44` }}>{t.label}</span>
}

function WTPBar({ score, delta }) {
  const color = score >= 75 ? 'var(--risk-low)' : score >= 50 ? 'var(--accent-blue)' : score >= 30 ? 'var(--risk-high)' : 'var(--risk-critical)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'var(--bg-surface)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:2, transition:'width 0.6s' }}/>
      </div>
      <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color, minWidth:22 }}>{score}</span>
      {delta !== 0 && (
        <span style={{ fontSize:10, color: delta < 0 ? 'var(--risk-critical)' : 'var(--risk-low)', minWidth:28 }}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  )
}

function CustomerCard({ customer, selected, onClick, onChat }) {
  const isSelected = selected?.customer_id === customer.customer_id
  const isSilent   = customer.engagement_trend === 'sudden_drop'
  const delinqHigh = customer.delinquency_risk_30d > 0.6

  return (
    <div onClick={onClick} style={{
      padding:'12px 14px', cursor:'pointer',
      background: isSelected ? 'var(--bg-hover)' : isSilent ? 'rgba(239,68,68,0.04)' : 'transparent',
      borderLeft: `3px solid ${isSelected ? 'var(--accent-blue)' : isSilent ? 'var(--risk-critical)' : 'transparent'}`,
      borderBottom:'1px solid var(--border)', transition:'all 0.15s',
    }}
    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='var(--bg-surface)' }}
    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background=isSilent?'rgba(239,68,68,0.04)':'transparent' }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--accent-blue)', fontFamily:'var(--font-mono)', minWidth:20 }}>
            #{customer.wtp_rank}-{customer.customer_id.slice(-4)}
          </span>
          <span style={{ fontSize:13, fontWeight:500 }}>{customer.name}</span>
        </div>
        <TrendBadge trend={customer.engagement_trend} />
      </div>

      {/* WTP Score bar */}
      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Willingness to Pay
        </div>
        <WTPBar score={customer.wtp_score} delta={customer.wtp_30d_delta} />
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:8 }}>
        {[
          { label:'Delinquency risk', value:`${((customer.delinquency_risk_30d ?? 0)*100).toFixed(0)}%`, color: delinqHigh ? 'var(--risk-critical)' : 'var(--text-secondary)' },
{ label:'Overdue', value:`₹${((customer.total_open_inr ?? 0)/100000).toFixed(1)}L`, color:'var(--text-secondary)' },
{ label:'Channel', value: customer.preferred_channel?.toUpperCase() ?? '—', color:'var(--accent-teal)' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize:9, color:'var(--text-muted)' }}>{s.label}</div>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:s.color, fontWeight:500 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recommended action */}
      <div style={{ fontSize:10, color: isSilent ? 'var(--risk-critical)' : 'var(--text-secondary)',
        background: isSilent ? 'rgba(239,68,68,0.06)' : 'var(--bg-input)',
        padding:'4px 8px', borderRadius:4, marginBottom:8, fontStyle:'italic' }}>
        {customer.recommended_action}
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:5 }}>
        <button onClick={e=>{e.stopPropagation();onChat(`Analyse WTP signals for ${customer.name}`,customer)}}
          style={{ flex:1, padding:'4px 0', background:'var(--bg-input)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', fontSize:10, color:'var(--text-secondary)', cursor:'pointer' }}
          onMouseEnter={e=>{e.target.style.borderColor='var(--accent-blue)';e.target.style.color='var(--accent-blue)'}}
          onMouseLeave={e=>{e.target.style.borderColor='var(--border)';e.target.style.color='var(--text-secondary)'}}>
          WTP Analysis
        </button>
        <button onClick={e=>{e.stopPropagation();onChat(`What is the best way to contact ${customer.name} right now based on engagement data?`,customer)}}
          style={{ flex:1, padding:'4px 0', background:'var(--bg-input)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', fontSize:10, color:'var(--text-secondary)', cursor:'pointer' }}
          onMouseEnter={e=>{e.target.style.borderColor='var(--accent-teal)';e.target.style.color='var(--accent-teal)'}}
          onMouseLeave={e=>{e.target.style.borderColor='var(--border)';e.target.style.color='var(--text-secondary)'}}>
          Channel strategy
        </button>
        {(customer.engagement_trend==='sudden_drop'||customer.delinquency_risk_30d>0.6) && (
          <button onClick={e=>{e.stopPropagation();onChat(`${customer.name} is a reliable payer who has gone silent — create urgent outreach plan`,customer)}}
            style={{ flex:1, padding:'4px 0', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:'var(--radius-sm)', fontSize:10, color:'var(--risk-critical)', cursor:'pointer' }}>
            Intervene
          </button>
        )}
      </div>
    </div>
  )
}

export default function WTPWorklist({ onSelectCustomer, onChat }) {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)

  const load = () => {
    setLoading(true)
    api.wtpWorklist()
      .then(r => setCustomers(r.worklist || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const silentPayers = customers.filter(c => c.engagement_trend === 'sudden_drop')
  const highDelinq   = customers.filter(c => c.delinquency_risk_30d > 0.6)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontFamily:'var(--font-head)', fontSize:13 }}>WTP Prioritisation</span>
          <button onClick={load} className="btn btn-ghost" style={{ fontSize:10, padding:'3px 8px' }}>↻</button>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {silentPayers.length > 0 && (
            <div style={{ flex:1, padding:'5px 8px', background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--radius-sm)' }}>
              <div style={{ fontSize:9, color:'var(--text-muted)' }}>Silent payers</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--risk-critical)', fontFamily:'var(--font-mono)' }}>{silentPayers.length}</div>
            </div>
          )}
          <div style={{ flex:1, padding:'5px 8px', background:'var(--bg-card)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
            <div style={{ fontSize:9, color:'var(--text-muted)' }}>High delinquency</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--risk-high)', fontFamily:'var(--font-mono)' }}>{highDelinq.length}</div>
          </div>
          <div style={{ flex:1, padding:'5px 8px', background:'var(--bg-card)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
            <div style={{ fontSize:9, color:'var(--text-muted)' }}>Ranked accounts</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{customers.length}</div>
          </div>
        </div>
        <button onClick={()=>onChat('Show me the full WTP-based prioritised worklist with delinquency predictions')}
          style={{ width:'100%', marginTop:8, padding:'6px 0', background:'rgba(79,142,247,0.08)',
            border:'1px solid rgba(79,142,247,0.2)', borderRadius:'var(--radius-sm)',
            fontSize:11, color:'var(--accent-blue)', cursor:'pointer' }}>
          AI WTP Analysis →
        </button>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading && <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Loading WTP data…</div>}
        {customers.map(c => (
          <CustomerCard key={c.customer_id} customer={c} selected={selected}
            onClick={() => { setSelected(c); onSelectCustomer?.(c) }}
            onChat={onChat} />
        ))}
      </div>
    </div>
  )
}
