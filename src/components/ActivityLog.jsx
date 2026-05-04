// src/components/ActivityLog.jsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'
 
const TYPE_ICONS = {
  AI_CHAT:'💬', PTP_CREATED:'✅', CREDIT_HOLD_TRIGGERED:'🔒',
  COMMUNICATION_DRAFTED:'✉', AI_REVIEW:'🤖', DEFAULT:'●'
}
const TYPE_COLORS = {
  AI_CHAT:'var(--accent-blue)', PTP_CREATED:'var(--risk-low)',
  CREDIT_HOLD_TRIGGERED:'var(--risk-critical)', COMMUNICATION_DRAFTED:'var(--accent-teal)',
  AI_REVIEW:'var(--accent-purple)', DEFAULT:'var(--text-muted)'
}
 
export default function ActivityLog({ customerId, refreshKey }) {
  const [log, setLog]         = useState([])
  const [loading, setLoading] = useState(false)
 
  const load = () => {
    setLoading(true)
    api.activityLog(customerId)
      .then(r => setLog(r.log || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
 
  useEffect(() => { load() }, [customerId, refreshKey])
 
  return (
<div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
<div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
<span style={{ fontFamily:'var(--font-head)', fontSize:13 }}>SAP Activity Log</span>
<button onClick={load} className="btn btn-ghost" style={{ fontSize:10, padding:'3px 8px' }}>Refresh</button>
</div>
<div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {loading && <div style={{ padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Loading…</div>}
        {!loading && log.length === 0 && (
<div style={{ padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>No activity yet</div>
        )}
        {log.map((entry, i) => {
          const icon  = TYPE_ICONS[entry.type]  || TYPE_ICONS.DEFAULT
          const color = TYPE_COLORS[entry.type] || TYPE_COLORS.DEFAULT
          return (
<div key={i} style={{ padding:'8px 16px', borderBottom:'1px solid rgba(37,42,58,0.5)',
              display:'flex', gap:10, alignItems:'flex-start' }}>
<div style={{ fontSize:13, marginTop:1, flexShrink:0 }}>{icon}</div>
<div style={{ flex:1, minWidth:0 }}>
<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
<span style={{ fontSize:10, padding:'1px 7px', borderRadius:10,
                    background:`${color}18`, color, border:`1px solid ${color}33` }}>
                    {entry.type?.replace(/_/g, ' ')}
</span>
<span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0, marginLeft:8 }}>
                    {entry.timestamp
                      ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
                      : ''}
</span>
</div>
<div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:4,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {entry.detail}
</div>
<div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                  {entry.customer_id} · {entry.analyst}
</div>
</div>
</div>
          )
        })}
</div>
</div>
  )
}
 
 
// ─── PTP Tracker ─────────────────────────────────────────────────────────────
export function PTPTracker({ refreshKey, onSelectCustomer, onChat }) {
  const [ptps,        setPtps]        = useState([])
  const [loading,     setLoading]     = useState(false)
  const [selectedPTP, setSelectedPTP] = useState(null)
  const [filterStatus, setFilter]     = useState('all')   // all | open | broken | kept
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateForm, setUpdateForm]   = useState({ status:'kept', notes:'' })
  const [saving, setSaving]           = useState(false)
 
  const load = () => {
    setLoading(true)
    api.ptps()
      .then(r => setPtps(r.ptps || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [refreshKey])
 
  const broken  = ptps.filter(p => p.status === 'broken')
  const open    = ptps.filter(p => p.status === 'open')
  const kept    = ptps.filter(p => p.status === 'kept')
 
  const filtered = filterStatus === 'all' ? ptps
    : ptps.filter(p => p.status === filterStatus)
 
  const handleSelect = (ptp) => {
    setSelectedPTP(prev => prev?.ptp_id === ptp.ptp_id ? null : ptp)
  }
 
  const handleChatAction = (action, ptp) => {
    if (!onChat) return
    const msg = {
      analyse:  `Analyse promise-to-pay for ${ptp.customer_name} — ₹${(ptp.amount/100000).toFixed(2)}L due ${ptp.promise_date}`,
      escalate: `Escalate ${ptp.customer_name} — broken PTP of ₹${(ptp.amount/100000).toFixed(2)}L`,
      followup: `Generate follow-up call script for ${ptp.customer_name} PTP of ₹${(ptp.amount/100000).toFixed(2)}L`,
      email:    `Draft broken PTP escalation email for ${ptp.customer_name}`,
    }[action]
    if (msg) onChat(msg, ptp.customer_id)
  }
 
  const handleGoToCustomer = (ptp) => {
    if (onSelectCustomer) onSelectCustomer({ customer_id: ptp.customer_id, name: ptp.customer_name })
  }
 
  // ── Update PTP status ────────────────────────────────────────────────────
  const submitUpdate = async () => {
    if (!selectedPTP) return
    setSaving(true)
    try {
      await api.createPTP({
        customer_id:  selectedPTP.customer_id,
        amount:       selectedPTP.amount,
        promise_date: selectedPTP.promise_date,
        contact_name: selectedPTP.contact || '',
        notes:        updateForm.notes,
        mode:         selectedPTP.mode_of_payment || 'NEFT',
      })
      setShowUpdateModal(false)
      setSelectedPTP(null)
      load()
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }
 
  const statusColor = (s) =>
    s === 'broken' ? 'var(--risk-critical)'
    : s === 'kept' ? 'var(--risk-low)'
    : 'var(--accent-blue)'
 
  const statusBg = (s) =>
    s === 'broken' ? 'rgba(239,68,68,0.08)'
    : s === 'kept' ? 'rgba(34,197,94,0.08)'
    : 'rgba(79,142,247,0.08)'
 
  const statusBorder = (s) =>
    s === 'broken' ? 'rgba(239,68,68,0.3)'
    : s === 'kept' ? 'rgba(34,197,94,0.25)'
    : 'rgba(79,142,247,0.25)'
 
  return (
<div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
 
      {/* ── Header ─────────────────────────────────────────────────────── */}
<div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
<div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
<span style={{ fontFamily:'var(--font-head)', fontSize:14 }}>PTP Tracker</span>
<button onClick={load} className="btn btn-ghost" style={{ fontSize:10, padding:'3px 8px' }}>↻ Refresh</button>
</div>
 
        {/* Summary chips */}
<div style={{ display:'flex', gap:6, marginBottom:10 }}>
          {[
            { key:'all',    label:`All ${ptps.length}`,    color:'var(--text-secondary)' },
            { key:'open',   label:`Open ${open.length}`,   color:'var(--accent-blue)' },
            { key:'broken', label:`Broken ${broken.length}`,color:'var(--risk-critical)' },
            { key:'kept',   label:`Kept ${kept.length}`,   color:'var(--risk-low)' },
          ].map(f => (
<button key={f.key} onClick={() => setFilter(f.key)} style={{
              flex:1, padding:'5px 0', borderRadius:20, fontSize:10, cursor:'pointer',
              fontWeight: filterStatus === f.key ? 600 : 400,
              background: filterStatus === f.key ? `${f.color}20` : 'transparent',
              color: filterStatus === f.key ? f.color : 'var(--text-muted)',
              border: `1px solid ${filterStatus === f.key ? f.color+'55' : 'var(--border)'}`,
              transition:'all 0.15s',
            }}>
              {f.label}
</button>
          ))}
</div>
 
        {/* Broken PTP alert banner */}
        {broken.length > 0 && (
<div style={{ padding:'8px 12px', background:'rgba(239,68,68,0.08)',
            borderRadius:'var(--radius-sm)', border:'1px solid rgba(239,68,68,0.25)' }}>
<div style={{ fontSize:11, color:'var(--risk-critical)', fontWeight:600, marginBottom:4 }}>
              ⚠ {broken.length} broken promise{broken.length > 1 ? 's' : ''} — escalation required
</div>
            {broken.map(p => (
<div key={p.ptp_id} style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.8 }}>
                • {p.customer_name}: ₹{(p.amount/100000).toFixed(1)}L was due {p.promise_date}
</div>
            ))}
</div>
        )}
</div>
 
      {/* ── PTP List ────────────────────────────────────────────────────── */}
<div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
        {loading && (
<div style={{ padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Loading…</div>
        )}
        {!loading && filtered.length === 0 && (
<div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
            No {filterStatus === 'all' ? '' : filterStatus} PTP records
</div>
        )}
 
        {filtered.map((p, i) => {
          const isSelected = selectedPTP?.ptp_id === p.ptp_id
          const sColor  = statusColor(p.status)
          const sBg     = statusBg(p.status)
          const sBorder = statusBorder(p.status)
 
          return (
<div key={p.ptp_id || i}>
              {/* ── Card ─────────────────────────────────────────────── */}
<div
                onClick={() => handleSelect(p)}
                style={{
                  marginBottom: isSelected ? 0 : 8,
                  padding:'12px 14px',
                  background: isSelected ? sBg : 'var(--bg-surface)',
                  borderRadius: isSelected ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                  border: `1px solid ${isSelected ? sBorder : 'var(--border)'}`,
                  borderBottom: isSelected ? 'none' : `1px solid ${isSelected ? sBorder : 'var(--border)'}`,
                  cursor:'pointer',
                  transition:'all 0.15s',
                  userSelect:'none',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-bright)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)' }}
>
                {/* Row 1: customer + status */}
<div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
<div style={{ display:'flex', alignItems:'center', gap:6 }}>
<span style={{ fontSize:8, color: isSelected ? sColor : 'var(--text-muted)' }}>
                      {isSelected ? '▼' : '▶'}
</span>
<span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
                      {p.customer_name}
</span>
<span style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                      {p.customer_id}
</span>
</div>
<span style={{
                    fontSize:10, padding:'2px 9px', borderRadius:20, fontWeight:600,
                    background: sBg, color: sColor, border:`1px solid ${sBorder}`,
                  }}>
                    {p.status.toUpperCase()}
</span>
</div>
 
                {/* Row 2: amount + promise date */}
<div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
<span style={{ fontSize:18, fontFamily:'var(--font-mono)', fontWeight:700, color: sColor }}>
                    ₹{(p.amount / 100000).toFixed(2)}L
</span>
<div style={{ textAlign:'right' }}>
<div style={{ fontSize:10, color:'var(--text-muted)' }}>Promise date</div>
<div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-secondary)' }}>
                      {p.promise_date}
</div>
</div>
</div>
 
                {/* Row 3: meta */}
<div style={{ display:'flex', gap:12, marginTop:6 }}>
<span style={{ fontSize:10, color:'var(--text-muted)' }}>
                    Contact: <span style={{ color:'var(--text-secondary)' }}>{p.contact || '—'}</span>
</span>
<span style={{ fontSize:10, color:'var(--text-muted)' }}>
                    Mode: <span style={{ color:'var(--text-secondary)' }}>{p.mode_of_payment || 'NEFT'}</span>
</span>
<span style={{ fontSize:10, color:'var(--text-muted)' }}>
                    Created: <span style={{ color:'var(--text-secondary)' }}>{p.created_date}</span>
</span>
</div>
</div>
 
              {/* ── Expanded action drawer ────────────────────────────── */}
              {isSelected && (
<div style={{
                  marginBottom:8, padding:'10px 14px',
                  background: sBg,
                  borderRadius:'0 0 var(--radius-md) var(--radius-md)',
                  border:`1px solid ${sBorder}`, borderTop:'none',
                }}>
<div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:8, fontWeight:600,
                    textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    Actions
</div>
<div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
 
                    {/* View customer */}
<button
                      onClick={() => handleGoToCustomer(p)}
                      className="btn btn-ghost"
                      style={{ fontSize:11, padding:'5px 12px' }}>
                      View account
</button>
 
                    {/* Analyse PTP */}
<button
                      onClick={() => handleChatAction('analyse', p)}
                      className="btn btn-ghost"
                      style={{ fontSize:11, padding:'5px 12px' }}>
                      Analyse PTP
</button>
 
                    {/* Follow-up script */}
<button
                      onClick={() => handleChatAction('followup', p)}
                      className="btn btn-ghost"
                      style={{ fontSize:11, padding:'5px 12px' }}>
                      Call script
</button>
 
                    {/* Draft email */}
<button
                      onClick={() => handleChatAction('email', p)}
                      className="btn btn-ghost"
                      style={{ fontSize:11, padding:'5px 12px' }}>
                      Draft email
</button>
 
                    {/* Escalate — only for broken */}
                    {p.status === 'broken' && (
<button
                        onClick={() => handleChatAction('escalate', p)}
                        className="btn btn-danger"
                        style={{ fontSize:11, padding:'5px 12px' }}>
                        Escalate now
</button>
                    )}
 
                    {/* Record new PTP */}
<button
                      onClick={() => { setShowUpdateModal(true) }}
                      style={{
                        fontSize:11, padding:'5px 12px', borderRadius:'var(--radius-sm)',
                        background:'rgba(79,142,247,0.1)', color:'var(--accent-blue)',
                        border:'1px solid rgba(79,142,247,0.3)', cursor:'pointer',
                      }}>
                      + New PTP
</button>
</div>
 
                  {/* PTP notes */}
                  {p.notes && (
<div style={{ marginTop:8, padding:'6px 10px', background:'var(--bg-input)',
                      borderRadius:'var(--radius-sm)', fontSize:11, color:'var(--text-secondary)',
                      fontStyle:'italic' }}>
                      "{p.notes}"
</div>
                  )}
</div>
              )}
</div>
          )
        })}
</div>
 
      {/* ── New PTP Modal ───────────────────────────────────────────────── */}
      {showUpdateModal && selectedPTP && (
<div style={{
          position:'absolute', inset:0, background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:100,
        }}
        onClick={e => { if (e.target === e.currentTarget) setShowUpdateModal(false) }}>
<div style={{ width:340, background:'var(--bg-card)', borderRadius:'var(--radius-lg)',
            border:'1px solid var(--border)', padding:20, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
<div style={{ fontFamily:'var(--font-head)', fontSize:15, marginBottom:4 }}>
              Record New PTP
</div>
<div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>
              {selectedPTP.customer_name} · {selectedPTP.customer_id}
</div>
 
            {[
              { label:'Amount (INR)', key:'amount',       type:'number', placeholder:'e.g. 500000',    default: selectedPTP.amount },
              { label:'Promise Date', key:'promise_date', type:'date',   placeholder:'',               default: '' },
              { label:'Contact Name', key:'contact_name', type:'text',   placeholder:'Who committed',  default: selectedPTP.contact||'' },
              { label:'Notes',        key:'notes',        type:'text',   placeholder:'Optional notes', default: '' },
            ].map(f => (
<div key={f.key} style={{ marginBottom:10 }}>
<div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3, fontWeight:600 }}>{f.label}</div>
<input type={f.type} defaultValue={f.default} placeholder={f.placeholder}
                  onChange={e => setUpdateForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width:'100%', padding:'7px 10px', background:'var(--bg-input)',
                    border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
                    color:'var(--text-primary)', fontSize:12, outline:'none' }}/>
</div>
            ))}
 
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
<button onClick={submitUpdate} disabled={saving}
                className="btn btn-primary" style={{ flex:1, justifyContent:'center', fontSize:12 }}>
                {saving ? 'Saving to SAP…' : 'Save to SAP'}
</button>
<button onClick={() => setShowUpdateModal(false)}
                className="btn btn-ghost" style={{ flex:1, justifyContent:'center', fontSize:12 }}>
                Cancel
</button>
</div>
</div>
</div>
      )}
</div>
  )
}