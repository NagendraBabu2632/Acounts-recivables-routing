// src/components/DisputeBoard.jsx — Scenario 4 + Cash Application + Dynamic Discounting
import { useState, useEffect } from 'react'
import { api } from '../api/client'
import ReactMarkdown from 'react-markdown'

// ── Shared ──────────────────────────────────────────────────────────────────
function ValidityBar({ score }) {
  const color = score>=70?'var(--risk-critical)':score>=41?'var(--risk-high)':'var(--risk-low)'
  const label = score>=70?'Likely Valid':score>=41?'Uncertain':'Likely Invalid'
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Validity Score</span>
        <span style={{ fontSize:9, color }}>{label}</span>
      </div>
      <div style={{ height:4, background:'var(--bg-surface)', borderRadius:2 }}>
        <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:2, transition:'width 0.6s' }}/>
      </div>
    </div>
  )
}
function AIPanel({ result, loading, placeholder }) {
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:24, color:'var(--text-muted)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize:22, animation:'spin 1s linear infinite' }}>⟳</div>
      <div style={{ fontSize:12 }}>AI Agent processing…</div>
    </div>
  )
  if (!result) return <div style={{ padding:14, color:'var(--text-muted)', fontSize:12, textAlign:'center' }}>{placeholder}</div>
  return (
    <div>
      {result.agent_trace?.length>0 && (
        <div style={{ padding:'7px 10px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)', marginBottom:8 }}>
          <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>Agent trace</div>
          {result.agent_trace.map((t,i)=>(
            <div key={i} style={{ fontSize:10, color:'var(--accent-teal)', fontFamily:'var(--font-mono)', lineHeight:1.8 }}>▸ {t}</div>
          ))}
        </div>
      )}
      {result.actionable_insights?.map((ins,i)=>(
        <div key={i} style={{ marginBottom:5, padding:'6px 10px', background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.18)', borderRadius:'var(--radius-sm)', fontSize:11, color:'var(--accent-blue)' }}>→ {ins}</div>
      ))}
      <div style={{ marginTop:8, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 14px' }}>
        <div className="prose"><ReactMarkdown>{result.response}</ReactMarkdown></div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPUTE BOARD — Scenario 4
// ══════════════════════════════════════════════════════════════════════════════
export default function DisputeBoard({ onChat, onSelectCustomer }) {
  const [disputes,  setDisputes]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [resolving, setResolving] = useState(null)
  const [results,   setResults]   = useState({})

  const load = () => {
    setLoading(true)
    api.disputes('all')
      .then(r => setDisputes(r.disputes||[]))
      .catch(console.error)
      .finally(()=>setLoading(false))
  }
  useEffect(()=>{ load() },[])

  const resolveDispute = async (d) => {
    setResolving(d.dispute_id)
    try {
      const r = await api.chat(
        `Resolve dispute ${d.dispute_id} for ${d.customer_name}. Invoice: ${d.invoice_no}. Amount: INR ${(d.amount/100000).toFixed(2)}L. Type: ${d.type}. POD available: ${d.pod_available}. Claim filed: ${d.claim_filed}. Validity score: ${d.validity_score}%. Pull the proof of delivery, check claim status in SAP MM, and recommend the resolution path with SLA.`,
        { customerId: d.customer_id }
      )
      setResults(prev=>({...prev,[d.dispute_id]:r}))
    } catch(e){ console.error(e) }
    finally { setResolving(null) }
  }

  const typeColors = {
    'Short Shipment':'var(--risk-high)','Quality Issue':'var(--risk-critical)',
    'Price Discrepancy':'var(--accent-purple)','Delivery Delay':'var(--accent-blue)','Damaged Goods':'var(--risk-critical)'
  }

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Left: dispute list */}
      <div style={{ width:300, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-head)', fontSize:13 }}>Dispute Board</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:10, color:'var(--risk-critical)', padding:'2px 8px',
              background:'rgba(239,68,68,0.1)', borderRadius:10, border:'1px solid rgba(239,68,68,0.3)' }}>
              {disputes.filter(d=>d.status==='Open').length} Open
            </span>
            <button onClick={load} className="btn btn-ghost" style={{ fontSize:10, padding:'3px 8px' }}>↻</button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {loading && <div style={{ padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Loading…</div>}
          {disputes.map(d=>{
            const isOpen = d.status==='Open'
            const isSel  = selected?.dispute_id===d.dispute_id
            const tColor = typeColors[d.type]||'var(--text-secondary)'
            return (
              <div key={d.dispute_id} onClick={()=>setSelected(d)} style={{
                padding:'10px 14px', cursor:'pointer', transition:'all 0.15s',
                background: isSel ? 'var(--bg-hover)' : isOpen&&d.validity_score>=70 ? 'rgba(239,68,68,0.04)' : 'transparent',
                borderLeft:`3px solid ${isSel?'var(--accent-blue)':isOpen?'rgba(239,68,68,0.4)':'transparent'}`,
                borderBottom:'1px solid var(--border)',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{d.dispute_id}</span>
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10,
                    background:isOpen?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)',
                    color:isOpen?'var(--risk-critical)':'var(--risk-low)',
                    border:`1px solid ${isOpen?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)'}` }}>
                    {d.status}
                  </span>
                </div>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:3 }}>{d.customer_name}</div>
                <div style={{ fontSize:11, color:tColor, marginBottom:5 }}>{d.type}</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--risk-critical)', fontWeight:600 }}>
                    ₹{(d.amount/100000).toFixed(2)}L
                  </span>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{d.raised_date}</span>
                </div>
                {isOpen && <ValidityBar score={d.validity_score} />}
                {results[d.dispute_id] && (
                  <span style={{ fontSize:9, color:'var(--risk-low)', marginTop:4, display:'block' }}>AI analysis complete ✓</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selected ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32 }}>⚖</div>
            <div style={{ fontSize:13 }}>Select a dispute to resolve</div>
            <div style={{ fontSize:11, textAlign:'center', maxWidth:260, lineHeight:1.6 }}>
              The AI Dispute Agent pulls POD from SAP MM, validates short-payments, and routes to the right team with an SLA.
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginBottom:2 }}>{selected.dispute_id} · {selected.invoice_no}</div>
                  <div style={{ fontSize:15, fontWeight:600, marginBottom:2 }}>{selected.customer_name}</div>
                  <div style={{ fontSize:12, color:typeColors[selected.type]||'var(--text-secondary)' }}>{selected.type}</div>
                  <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[
                      { l:'Short-paid', v:`₹${(selected.amount/100000).toFixed(2)}L`, c:'var(--risk-critical)' },
                      { l:'POD available', v:selected.pod_available?'Yes':'No', c:selected.pod_available?'var(--risk-low)':'var(--risk-high)' },
                      { l:'Claim filed', v:selected.claim_filed?'Yes':'No', c:selected.claim_filed?'var(--risk-low)':'var(--risk-high)' },
                    ].map(s=>(
                      <div key={s.l} style={{ padding:'6px 8px', background:'var(--bg-input)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
                        <div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:2 }}>{s.l}</div>
                        <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color:s.c, fontWeight:600 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:8 }}><ValidityBar score={selected.validity_score} /></div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button onClick={()=>resolveDispute(selected)} disabled={!!resolving}
                    className="btn btn-primary" style={{ fontSize:11, padding:'6px 12px', whiteSpace:'nowrap' }}>
                    {resolving===selected.dispute_id ? 'Resolving…' : 'AI Resolve Dispute'}
                  </button>
                  <button onClick={()=>onSelectCustomer?.({customer_id:selected.customer_id,name:selected.customer_name})}
                    className="btn btn-ghost" style={{ fontSize:11, padding:'5px 10px' }}>View account</button>
                </div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
              <AIPanel result={results[selected.dispute_id]} loading={resolving===selected.dispute_id}
                placeholder="Click 'AI Resolve Dispute' to automatically pull POD, validate the short-payment, and get a resolution path with SLA." />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CASH APPLICATION — Scenario 5c
// ══════════════════════════════════════════════════════════════════════════════
export function CashApplication({ onChat }) {
  const [payments,  setPayments]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [matching,  setMatching]  = useState(null)
  const [results,   setResults]   = useState({})
  const [loading,   setLoading]   = useState(false)

  useEffect(()=>{
    setLoading(true)
    api.payments('false').then(r=>setPayments(r.payments||[])).catch(console.error).finally(()=>setLoading(false))
  },[])

  const matchPayment = async (p) => {
    setMatching(p.payment_id)
    try {
      const r = await api.chat(
        `Match this incoming payment to open SAP invoices using the remittance text. Payment ID: ${p.payment_id}. Bank ref: ${p.bank_ref}. Amount: INR ${(p.amount/100000).toFixed(2)}L. Remittance text: "${p.remittance_text}". Identify the customer, match to open invoices, and post the payment in SAP FI. Handle any unmatched remainder.`,
        { paymentId: p.payment_id }
      )
      setResults(prev=>({...prev,[p.payment_id]:r}))
      setPayments(prev=>prev.map(x=>x.payment_id===p.payment_id?{...x,match_status:'matched'}:x))
    } catch(e){ console.error(e) }
    finally { setMatching(null) }
  }

  const matchAll = async () => {
    const unmatched = payments.filter(p=>!p.matched&&p.match_status!=='matched')
    for (const p of unmatched) { await matchPayment(p) }
  }

  const confColor = (c) => !c?'var(--text-muted)':c>=0.9?'var(--risk-low)':c>=0.7?'var(--risk-medium)':'var(--risk-high)'

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      <div style={{ width:300, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontFamily:'var(--font-head)', fontSize:13 }}>Cash Application</span>
            <span style={{ fontSize:10, color:'var(--accent-amber)', padding:'2px 8px', background:'rgba(245,158,11,0.1)', borderRadius:10, border:'1px solid rgba(245,158,11,0.3)' }}>
              {payments.filter(p=>p.match_status!=='matched').length} unmatched
            </span>
          </div>
          <div style={{ marginBottom:8, padding:'8px 10px', background:'rgba(79,142,247,0.06)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(79,142,247,0.15)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>Total unmatched</div>
            <div style={{ fontSize:18, fontFamily:'var(--font-head)', fontWeight:700, color:'var(--accent-blue)' }}>
              ₹{(payments.filter(p=>p.match_status!=='matched').reduce((s,p)=>s+p.amount,0)/100000).toFixed(1)}L
            </div>
          </div>
          <button onClick={matchAll} disabled={!!matching||payments.every(p=>p.match_status==='matched')}
            className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:11, padding:'6px 0' }}>
            {matching ? '⟳ Matching…' : 'AI Match All Payments'}
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {loading && <div style={{ padding:16, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Loading…</div>}
          {payments.map(p=>{
            const matched = p.match_status==='matched'
            const isSel   = selected?.payment_id===p.payment_id
            return (
              <div key={p.payment_id} onClick={()=>setSelected(p)} style={{
                padding:'10px 14px', cursor:'pointer',
                background: isSel?'var(--bg-hover)':'transparent',
                borderLeft:`3px solid ${isSel?'var(--accent-blue)':matched?'rgba(34,197,94,0.4)':'var(--border)'}`,
                borderBottom:'1px solid var(--border)', transition:'all 0.15s',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{p.payment_id}</span>
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10,
                    background:matched?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)',
                    color:matched?'var(--risk-low)':'var(--accent-amber)',
                    border:`1px solid ${matched?'rgba(34,197,94,0.3)':'rgba(245,158,11,0.3)'}` }}>
                    {matched?'Matched':'Unmatched'}
                  </span>
                </div>
                <div style={{ fontSize:14, fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>
                  ₹{(p.amount/100000).toFixed(2)}L
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{p.bank_ref}</div>
                <div style={{ fontSize:10, color:'var(--text-secondary)', fontStyle:'italic',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  "{p.remittance_text}"
                </div>
                {results[p.payment_id] && (
                  <div style={{ fontSize:9, color:'var(--risk-low)', marginTop:4 }}>AI matched ✓</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selected ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32 }}>₹</div>
            <div style={{ fontSize:13 }}>Select a payment to match</div>
            <div style={{ fontSize:11, textAlign:'center', maxWidth:260, lineHeight:1.6 }}>
              The AI Cash App Agent matches payments to SAP invoices even with messy remittance data — 90%+ straight-through processing.
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginBottom:2 }}>
                    {selected.bank_ref} · {selected.received_date}
                  </div>
                  <div style={{ fontSize:22, fontFamily:'var(--font-head)', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>
                    ₹{(selected.amount/100000).toFixed(2)}L
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', fontStyle:'italic', marginBottom:6 }}>
                    Remittance: "{selected.remittance_text}"
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                    The AI will identify the customer, match to open invoices using fuzzy matching + ML inference, and post to SAP FI.
                  </div>
                </div>
                <button onClick={()=>matchPayment(selected)} disabled={!!matching}
                  className="btn btn-primary" style={{ fontSize:11, padding:'6px 12px', whiteSpace:'nowrap' }}>
                  {matching===selected.payment_id ? 'Matching…' : 'AI Match & Post'}
                </button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
              <AIPanel result={results[selected.payment_id]} loading={matching===selected.payment_id}
                placeholder="Click 'AI Match & Post' to automatically match this payment to open SAP invoices and generate the posting entry." />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DYNAMIC DISCOUNTING — Scenario 5b
// ══════════════════════════════════════════════════════════════════════════════
export function DynamicDiscounting({ customers, onChat }) {
  const [selected,  setSelected]  = useState(null)
  const [analyzing, setAnalyzing] = useState(null)
  const [results,   setResults]   = useState({})

  // Show customers with overdue and healthy engagement or cash-flow signals
  const targets = (customers||[]).filter(c => c.total_open_inr > 100000)

  const analyzeDiscount = async (c) => {
    setAnalyzing(c.customer_id)
    try {
      const r = await api.chat(
        `Analyse dynamic discount opportunity for ${c.name}. They have INR ${(c.total_open_inr/100000).toFixed(1)}L overdue. Credit utilisation: ${c.credit_utilization}%. WTP score: ${c.wtp_score || 50}. Payment history avg delay: ${c.avg_payment_delay} days. Engagement trend: ${c.engagement_trend || 'stable'}. Determine if a time-limited early payment discount (typically 1-2%) would be financially viable. Calculate the net cost vs write-off risk avoided. Generate a personalised discount offer.`,
        { customerId: c.customer_id }
      )
      setResults(prev=>({...prev,[c.customer_id]:r}))
    } catch(e){ console.error(e) }
    finally { setAnalyzing(null) }
  }

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      <div style={{ width:300, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:13, marginBottom:6 }}>Dynamic Discounting</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
            AI analyses cash flow + WTP to offer time-limited discounts that convert slow payers.
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {targets.map(c=>{
            const isSel    = selected?.customer_id===c.customer_id
            const hasResult= !!results[c.customer_id]
            const wtp      = c.wtp_score||50
            const wtpColor = wtp>=70?'var(--risk-low)':wtp>=40?'var(--risk-medium)':'var(--risk-high)'
            return (
              <div key={c.customer_id} onClick={()=>setSelected(c)} style={{
                padding:'10px 14px', cursor:'pointer',
                background:isSel?'var(--bg-hover)':'transparent',
                borderLeft:`3px solid ${isSel?'var(--accent-amber)':'transparent'}`,
                borderBottom:'1px solid var(--border)', transition:'all 0.15s',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:500 }}>{c.name}</span>
                  <span className={`badge badge-${c.risk_band}`}>{c.risk_band.toUpperCase()}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:5 }}>
                  <div>
                    <div style={{ fontSize:9, color:'var(--text-muted)' }}>Overdue</div>
                    <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--risk-high)' }}>₹{(c.total_open_inr/100000).toFixed(1)}L</div>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'var(--text-muted)' }}>WTP Score</div>
                    <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:wtpColor }}>{wtp}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'var(--text-muted)' }}>Avg delay</div>
                    <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-secondary)' }}>{c.avg_payment_delay}d</div>
                  </div>
                </div>
                {hasResult && <div style={{ fontSize:9, color:'var(--accent-amber)', marginTop:4 }}>Offer generated ✓</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selected ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32 }}>✦</div>
            <div style={{ fontSize:13 }}>Select a customer for discount analysis</div>
            <div style={{ fontSize:11, textAlign:'center', maxWidth:280, lineHeight:1.6 }}>
              The AI analyses a customer's cash position, WTP trend, and overdue amount to determine if a time-limited early payment discount is financially viable.
            </div>
            <div style={{ marginTop:8, padding:'10px 14px', background:'rgba(245,158,11,0.08)',
              border:'1px solid rgba(245,158,11,0.25)', borderRadius:'var(--radius-md)', maxWidth:300 }}>
              <div style={{ fontSize:11, color:'var(--accent-amber)', fontWeight:600, marginBottom:4 }}>Example scenario</div>
              <div style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.6 }}>
                Infra Build Corp: ₹3.2L overdue. AI offers 2% discount for payment in 24 hours. Net cost to business: ₹6.4K. Write-off risk avoided: ₹3.2L.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, marginBottom:2 }}>{selected.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)' }}>
                    ₹{(selected.total_open_inr/100000).toFixed(1)}L overdue · WTP {selected.wtp_score||50}/100 · Avg delay {selected.avg_payment_delay}d
                  </div>
                </div>
                <button onClick={()=>analyzeDiscount(selected)} disabled={!!analyzing}
                  className="btn" style={{ fontSize:11, padding:'6px 12px', whiteSpace:'nowrap',
                    background:'rgba(245,158,11,0.12)', color:'var(--accent-amber)',
                    border:'1px solid rgba(245,158,11,0.3)' }}>
                  {analyzing===selected.customer_id ? 'Analysing…' : 'Generate Discount Offer'}
                </button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
              <AIPanel result={results[selected.customer_id]} loading={analyzing===selected.customer_id}
                placeholder="Click 'Generate Discount Offer' to analyse if a time-limited discount would convert this customer to early payment." />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
