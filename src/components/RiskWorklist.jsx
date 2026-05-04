// src/components/RiskWorklist.jsx
import { useState } from 'react'

const BAND_ORDER = { critical:0, high:1, medium:2, low:3 }

function RiskBar({ score }) {
  const color = score >= 75 ? 'var(--risk-critical)' : score >= 55 ? 'var(--risk-high)' : score >= 35 ? 'var(--risk-medium)' : 'var(--risk-low)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'var(--bg-surface)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:2,
          transition:'width 0.6s ease' }}/>
      </div>
      <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color, minWidth:26, textAlign:'right' }}>{score}</span>
    </div>
  )
}

function CustomerRow({ customer, selected, onClick, onChat }) {
  const band = customer.risk_band
  const isSelected = selected?.customer_id === customer.customer_id
  return (
    <div onClick={onClick} style={{
      padding:'12px 16px', cursor:'pointer',
      background: isSelected ? 'var(--bg-hover)' : 'transparent',
      borderLeft: `3px solid ${isSelected ? 'var(--accent-blue)' : 'transparent'}`,
      borderBottom:'1px solid var(--border)',
      transition:'all 0.15s',
    }}
    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='var(--bg-surface)' }}
    onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background='transparent' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
            {customer.customer_id}
          </span>
          <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>
            {customer.name}
          </span>
        </div>
        <span className={`badge badge-${band}`}>{band.toUpperCase()}</span>
      </div>
      <RiskBar score={customer.risk_score} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:8 }}>
        <Stat label="Overdue" value={`₹${(customer.total_open_inr/100000).toFixed(1)}L`}
          color={customer.total_open_inr > 1000000 ? 'var(--risk-high)' : 'var(--text-secondary)'} />
        <Stat label="Oldest" value={`${customer.oldest_item_days}d`}
          color={customer.oldest_item_days > 60 ? 'var(--risk-critical)' : 'var(--text-secondary)'} />
        <Stat label="Credit util" value={`${customer.credit_utilization}%`}
          color={customer.credit_utilization > 90 ? 'var(--risk-critical)' : 'var(--text-secondary)'} />
      </div>
      {(customer.open_disputes > 0 || customer.risk_band === 'critical') && (
        <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
          {customer.open_disputes > 0 && (
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10,
              background:'rgba(167,139,250,0.1)', color:'var(--accent-purple)',
              border:'1px solid rgba(167,139,250,0.2)' }}>
              {customer.open_disputes} dispute{customer.open_disputes>1?'s':''}
            </span>
          )}
          {customer.credit_utilization > 90 && (
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10,
              background:'rgba(239,68,68,0.1)', color:'var(--risk-critical)',
              border:'1px solid rgba(239,68,68,0.2)' }}>
              Credit limit
            </span>
          )}
        </div>
      )}
      <div style={{ marginTop:8, display:'flex', gap:6 }}>
        <button onClick={e=>{e.stopPropagation();onChat(`Analyse ${customer.name} account in detail`, customer)}}
          style={{ flex:1, padding:'5px 0', background:'var(--bg-input)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', fontSize:11, color:'var(--text-secondary)', cursor:'pointer' }}
          onMouseEnter={e=>{e.target.style.borderColor='var(--accent-blue)';e.target.style.color='var(--accent-blue)'}}
          onMouseLeave={e=>{e.target.style.borderColor='var(--border)';e.target.style.color='var(--text-secondary)'}}>
          Analyse
        </button>
        <button onClick={e=>{e.stopPropagation();onChat(`Draft collection email for ${customer.name}`, customer)}}
          style={{ flex:1, padding:'5px 0', background:'var(--bg-input)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', fontSize:11, color:'var(--text-secondary)', cursor:'pointer' }}
          onMouseEnter={e=>{e.target.style.borderColor='var(--accent-teal)';e.target.style.color='var(--accent-teal)'}}
          onMouseLeave={e=>{e.target.style.borderColor='var(--border)';e.target.style.color='var(--text-secondary)'}}>
          Draft email
        </button>
        {band === 'critical' && (
          <button onClick={e=>{e.stopPropagation();onChat(`Escalate ${customer.name} — recommend credit hold`, customer)}}
            style={{ flex:1, padding:'5px 0', background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-sm)',
              fontSize:11, color:'var(--risk-critical)', cursor:'pointer' }}>
            Escalate
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:1 }}>{label}</div>
      <div style={{ fontSize:12, fontWeight:500, color: color || 'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

export default function RiskWorklist({ customers, selected, onSelect, onChat, loading }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const sorted = [...(customers||[])]
    .sort((a,b) => BAND_ORDER[a.risk_band]-BAND_ORDER[b.risk_band] || b.risk_score-a.risk_score)
    .filter(c => filter==='all' || c.risk_band===filter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.customer_id.toLowerCase().includes(search.toLowerCase()))

  const counts = (customers||[]).reduce((a,c)=>({...a,[c.risk_band]:(a[c.risk_band]||0)+1}),{})

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontFamily:'var(--font-head)', fontSize:14 }}>Risk Worklist</span>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${(customers||[]).length} accounts`}
          </span>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search customers…"
          style={{ width:'100%', padding:'7px 10px', background:'var(--bg-input)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
            color:'var(--text-primary)', fontSize:12, outline:'none', marginBottom:8 }}/>
        <div style={{ display:'flex', gap:4 }}>
          {['all','critical','high','medium','low'].map(b => (
            <button key={b} onClick={()=>setFilter(b)}
              style={{ flex:1, padding:'4px 0', borderRadius:20, fontSize:10, cursor:'pointer',
                fontWeight: filter===b ? 600 : 400,
                background: filter===b ? (b==='all'?'var(--accent-blue)':
                  b==='critical'?'rgba(239,68,68,0.2)':b==='high'?'rgba(249,115,22,0.2)':
                  b==='medium'?'rgba(234,179,8,0.2)':'rgba(34,197,94,0.2)') : 'transparent',
                color: filter===b ? (b==='all'?'#fff':
                  b==='critical'?'var(--risk-critical)':b==='high'?'var(--risk-high)':
                  b==='medium'?'var(--risk-medium)':'var(--risk-low)') : 'var(--text-muted)',
                border:`1px solid ${filter===b?'transparent':'var(--border)'}` }}>
              {b==='all'?`All ${(counts.critical || 0) + (counts.high || 0) + (counts.medium || 0) + (counts.low || 0)}`:
                `${b[0].toUpperCase()}${b.slice(1)} ${counts[b]||0}`}
            </button>
          ))}
        </div>
      </div>
      {/* List */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {sorted.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            {loading ? 'Loading SAP data…' : 'No accounts match filter'}
          </div>
        ) : sorted.map(c => (
          <CustomerRow key={c.customer_id} customer={c}
            selected={selected} onClick={()=>onSelect(c)} onChat={onChat} />
        ))}
      </div>
      {/* Summary footer */}
      {customers?.length > 0 && (
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', flexShrink:0,
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Total exposure</div>
          <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-primary)', textAlign:'right' }}>
            ₹{((customers.reduce((s,c)=>s+c.total_open_inr,0))/10000000).toFixed(2)} Cr
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Critical + High</div>
          <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--risk-high)', textAlign:'right' }}>
            {(counts.critical||0)+(counts.high||0)} accounts
          </div>
        </div>
      )}
    </div>
  )
}
