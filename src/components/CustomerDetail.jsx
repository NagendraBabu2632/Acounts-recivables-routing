// src/components/CustomerDetail.jsx
import { useState, useEffect } from 'react'
import { api } from '../api/client'

function Section({ title, children, accent }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, color: accent||'var(--text-muted)',
        textTransform:'uppercase', letterSpacing:'0.06em',
        marginBottom:8, paddingBottom:6, borderBottom:'1px solid var(--border)',
        fontWeight:600 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'4px 0', borderBottom:'1px solid rgba(37,42,58,0.5)' }}>
      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize:12, color: valueColor||'var(--text-primary)', fontFamily:'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  )
}

function InvoiceRow({ inv }) {
  const color = inv.days_overdue > 90 ? 'var(--risk-critical)' : inv.days_overdue > 60 ? 'var(--risk-high)' : inv.days_overdue > 30 ? 'var(--risk-medium)' : 'var(--risk-low)'
  return (
    <div style={{ padding:'8px 10px', background:'var(--bg-surface)', borderRadius:'var(--radius-sm)',
      border:'1px solid var(--border)', marginBottom:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-secondary)' }}>
          {inv.invoice_no}
        </span>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
          ₹{(inv.amount/100000).toFixed(2)}L
        </span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>Due: {inv.due_date}</span>
        <span style={{ fontSize:10, color, fontWeight:500 }}>
          {inv.days_overdue === 0 ? 'Current' : `${inv.days_overdue} days overdue`}
        </span>
      </div>
    </div>
  )
}

function HistoryRow({ h }) {
  const color = h.delay_days > 60 ? 'var(--risk-critical)' : h.delay_days > 30 ? 'var(--risk-high)' : h.delay_days > 10 ? 'var(--risk-medium)' : 'var(--risk-low)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0',
      borderBottom:'1px solid rgba(37,42,58,0.5)', fontSize:11 }}>
      <span style={{ flex:1, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{h.invoice_no}</span>
      <span style={{ color:'var(--text-secondary)' }}>{h.paid_date}</span>
      <span style={{ color, fontFamily:'var(--font-mono)', minWidth:50, textAlign:'right',
        fontWeight: h.delay_days > 30 ? 600 : 400 }}>
        +{h.delay_days}d
      </span>
    </div>
  )
}

function PTPRow({ p }) {
  const statusColor = p.status === 'broken' ? 'var(--risk-critical)' : p.status === 'kept' ? 'var(--risk-low)' : 'var(--accent-blue)'
  return (
    <div style={{ padding:'8px 10px', background:'var(--bg-surface)', borderRadius:'var(--radius-sm)',
      border:`1px solid ${p.status==='broken'?'rgba(239,68,68,0.3)':'var(--border)'}`, marginBottom:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{p.contact}</span>
        <span className={`badge badge-${p.status==='broken'?'critical':p.status==='kept'?'low':'medium'}`}>
          {p.status.toUpperCase()}
        </span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:12, fontWeight:600 }}>₹{(p.amount/100000).toFixed(2)}L</span>
        <span style={{ fontSize:10, color:'var(--text-muted)' }}>by {p.promise_date}</span>
      </div>
    </div>
  )
}

export default function CustomerDetail({ customer: customerSummary, onChat }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('overview')
  const [showPTPForm, setShowPTPForm] = useState(false)
  const [ptpForm, setPtpForm] = useState({ amount:'', promise_date:'', contact_name:'', mode:'NEFT' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!customerSummary) return
    setLoading(true); setDetail(null); setTab('overview')
    api.customer(customerSummary.customer_id)
      .then(r => setDetail(r.customer))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [customerSummary?.customer_id])

  const savePTP = async () => {
    if (!ptpForm.amount || !ptpForm.promise_date || !ptpForm.contact_name) return
    setSaving(true)
    try {
      await api.createPTP({ customer_id: customerSummary.customer_id,
        amount: parseFloat(ptpForm.amount), promise_date: ptpForm.promise_date,
        contact_name: ptpForm.contact_name, mode: ptpForm.mode })
      setShowPTPForm(false)
      setPtpForm({ amount:'', promise_date:'', contact_name:'', mode:'NEFT' })
      // Refresh
      const r = await api.customer(customerSummary.customer_id)
      setDetail(r.customer)
    } catch(e) { alert('Error: '+e.message) }
    finally { setSaving(false) }
  }

  if (!customerSummary) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:8, color:'var(--text-muted)' }}>
      <div style={{ fontSize:28 }}>☰</div>
      <div style={{ fontSize:13 }}>Select a customer from the worklist</div>
    </div>
  )

  if (loading) return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      color:'var(--text-muted)', fontSize:13 }}>Loading SAP data…</div>
  )

  const c = detail || customerSummary
  const band = customerSummary.risk_band || 'low'
  const bandColor = {critical:'var(--risk-critical)',high:'var(--risk-high)',medium:'var(--risk-medium)',low:'var(--risk-low)'}[band]

  const tabs = ['overview','invoices','history','disputes','ptp']

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Customer header */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)',
        background:`linear-gradient(135deg, var(--bg-card), var(--bg-surface))`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:2 }}>
              {c.customer_id} · {c.city}
            </div>
            <div style={{ fontSize:16, fontFamily:'var(--font-head)', fontWeight:700, marginBottom:4 }}>{c.name}</div>
            <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{c.industry} · {c.payment_terms}</div>
          </div>
          <span className={`badge badge-${band}`}>{band.toUpperCase()}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:12 }}>
          {[
            { l:'Total overdue', v:`₹${((c.total_open_inr||0)/100000).toFixed(1)}L`, c:bandColor },
            { l:'Credit util', v:`${c.credit_utilization||0}%`, c:c.credit_utilization>90?'var(--risk-critical)':'var(--text-secondary)' },
            { l:'Avg delay', v:`${c.avg_payment_delay||0}d`, c:c.avg_payment_delay>30?'var(--risk-high)':'var(--risk-low)' },
          ].map(({l,v,c:col})=>(
            <div key={l} style={{ padding:'8px 10px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)',
              border:'1px solid var(--border)', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:13, fontFamily:'var(--font-mono)', color:col, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Action buttons */}
        <div style={{ display:'flex', gap:6, marginTop:10 }}>
          <button onClick={()=>onChat(`Analyse ${c.name} account`)} className="btn btn-ghost" style={{flex:1,fontSize:11,padding:'6px 0',justifyContent:'center'}}>Analyse</button>
          <button onClick={()=>onChat(`Draft collection email for ${c.name}`)} className="btn btn-ghost" style={{flex:1,fontSize:11,padding:'6px 0',justifyContent:'center'}}>Email</button>
          <button onClick={()=>onChat(`Create call script for ${c.name}`)} className="btn btn-ghost" style={{flex:1,fontSize:11,padding:'6px 0',justifyContent:'center'}}>Call script</button>
          {band==='critical' && <button onClick={()=>onChat(`Escalate ${c.name} credit hold`)} className="btn btn-danger" style={{flex:1,fontSize:11,padding:'6px 0',justifyContent:'center'}}>Escalate</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:'8px 4px', fontSize:11, cursor:'pointer', background:'none', border:'none',
            borderBottom:`2px solid ${tab===t?'var(--accent-blue)':'transparent'}`,
            color: tab===t ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontFamily:'var(--font-ui)', transition:'all 0.15s', textTransform:'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>
        {tab==='overview' && (
          <>
            <Section title="Account Info">
              <InfoRow label="Sales Rep" value={c.sales_rep||'—'} />
              <InfoRow label="Account Group" value={c.account_group||'—'} />
              <InfoRow label="Risk Class (SAP)" value={c.risk_class||'—'} />
              <InfoRow label="Credit Limit" value={`₹${((c.credit_limit||0)/100000).toFixed(1)}L`} />
              <InfoRow label="Credit Used" value={`₹${((c.credit_used||0)/100000).toFixed(1)}L`}
                valueColor={c.credit_utilization>90?'var(--risk-critical)':'var(--text-primary)'} />
            </Section>
            <Section title="Risk Indicators">
              <InfoRow label="Open Invoices" value={c.open_invoice_count || (c.open_invoices?.length||0)} />
              <InfoRow label="Open Disputes" value={c.open_dispute_count || 0}
                valueColor={(c.open_dispute_count||0)>0?'var(--accent-purple)':'var(--text-primary)'} />
              <InfoRow label="Risk Score" value={`${customerSummary.risk_score||0}/100`} valueColor={bandColor} />
              <InfoRow label="Oldest Invoice" value={`${customerSummary.oldest_item_days||0} days`}
                valueColor={customerSummary.oldest_item_days>60?'var(--risk-critical)':'var(--text-primary)'} />
            </Section>
          </>
        )}
        {tab==='invoices' && (
          <Section title="Open Invoices">
            {(c.open_invoices||[]).length===0
              ? <div style={{color:'var(--text-muted)',fontSize:12}}>No open invoices</div>
              : (c.open_invoices||[]).map(inv => <InvoiceRow key={inv.invoice_no} inv={inv}/>)}
            {(c.open_invoices||[]).length>0 && (
              <div style={{padding:'8px 10px',background:'rgba(79,142,247,0.05)',borderRadius:'var(--radius-sm)',
                border:'1px solid rgba(79,142,247,0.15)',marginTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:11,color:'var(--text-secondary)'}}>Total outstanding</span>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:'var(--font-mono)',color:'var(--accent-blue)'}}>
                    ₹{((c.open_invoices||[]).reduce((s,i)=>s+i.amount,0)/100000).toFixed(2)}L
                  </span>
                </div>
              </div>
            )}
          </Section>
        )}
        {tab==='history' && (
          <Section title="Payment History (24 months)">
            {(c.payment_history||[]).length===0
              ? <div style={{color:'var(--text-muted)',fontSize:12}}>No history available</div>
              : (c.payment_history||[]).map(h=><HistoryRow key={h.invoice_no} h={h}/>)}
          </Section>
        )}
        {tab==='disputes' && (
          <Section title="Dispute Records">
            {(c.disputes||[]).length===0
              ? <div style={{color:'var(--text-muted)',fontSize:12}}>No disputes on record</div>
              : (c.disputes||[]).map(d=>(
                <div key={d.dispute_id} style={{padding:'8px 10px',background:'var(--bg-surface)',
                  borderRadius:'var(--radius-sm)',border:`1px solid ${d.status==='Open'?'rgba(167,139,250,0.3)':'var(--border)'}`,marginBottom:6}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,fontFamily:'var(--font-mono)',color:'var(--text-muted)'}}>{d.dispute_id}</span>
                    <span style={{fontSize:10,padding:'1px 7px',borderRadius:10,
                      background:d.status==='Open'?'rgba(167,139,250,0.15)':'rgba(34,197,94,0.1)',
                      color:d.status==='Open'?'var(--accent-purple)':'var(--risk-low)'}}>
                      {d.status}
                    </span>
                  </div>
                  <div style={{fontSize:12,marginTop:4,color:'var(--text-secondary)'}}>{d.type}</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
                    <span style={{fontSize:10,color:'var(--text-muted)'}}>{d.raised_date}</span>
                    <span style={{fontSize:12,fontFamily:'var(--font-mono)',color:'var(--accent-purple)'}}>₹{(d.amount/100000).toFixed(2)}L</span>
                  </div>
                </div>
              ))}
          </Section>
        )}
        {tab==='ptp' && (
          <Section title="Promise-to-Pay">
            {(c.ptp_records||[]).map(p=><PTPRow key={p.ptp_id} p={p}/>)}
            {!showPTPForm ? (
              <button onClick={()=>setShowPTPForm(true)} className="btn btn-ghost"
                style={{width:'100%',justifyContent:'center',marginTop:8,fontSize:12}}>
                + Record New PTP
              </button>
            ) : (
              <div style={{padding:'12px',background:'var(--bg-input)',borderRadius:'var(--radius-md)',
                border:'1px solid var(--border)',marginTop:8}}>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:10,fontWeight:600}}>New Promise-to-Pay</div>
                {[
                  {label:'Amount (INR)',key:'amount',type:'number',placeholder:'e.g. 500000'},
                  {label:'Promise Date',key:'promise_date',type:'date'},
                  {label:'Contact Name',key:'contact_name',type:'text',placeholder:'Person who committed'},
                ].map(f=>(
                  <div key={f.key} style={{marginBottom:8}}>
                    <div style={{fontSize:10,color:'var(--text-muted)',marginBottom:3}}>{f.label}</div>
                    <input type={f.type} value={ptpForm[f.key]} placeholder={f.placeholder||''}
                      onChange={e=>setPtpForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:'100%',padding:'6px 9px',background:'var(--bg-surface)',
                        border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',
                        color:'var(--text-primary)',fontSize:12,outline:'none'}}/>
                  </div>
                ))}
                <div style={{display:'flex',gap:6,marginTop:10}}>
                  <button onClick={savePTP} disabled={saving} className="btn btn-primary"
                    style={{flex:1,justifyContent:'center',fontSize:12}}>
                    {saving?'Saving…':'Save to SAP'}
                  </button>
                  <button onClick={()=>setShowPTPForm(false)} className="btn btn-ghost"
                    style={{flex:1,justifyContent:'center',fontSize:12}}>Cancel</button>
                </div>
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  )
}
