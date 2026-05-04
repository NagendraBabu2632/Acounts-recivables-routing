
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
// import './App.css'
// // src/App.jsx
// import { useState, useEffect, useCallback } from 'react'
// import { api } from '../src/api/client'
// import ChatInterface    from './components/ChatInterface'
// import RiskWorklist     from './components/RiskWorklist'
// import CustomerDetail   from './components/CustomerDetail'
// import AgingChart       from './components/AgingChart'
// import ActivityLog, { PTPTracker } from './components/ActivityLog'

// const NAV = [
//   { id:'dashboard', label:'Dashboard',  icon:'▦' },
//   { id:'chat',      label:'Co-pilot',   icon:'◎' },
//   { id:'worklist',  label:'Worklist',   icon:'≡' },
//   { id:'ptp',       label:'PTP Tracker',icon:'✓' },
//   { id:'log',       label:'Activity',   icon:'◷' },
// ]

// export default function App() {
//   const [view,            setView]            = useState('chat')
//   const [customers,       setCustomers]       = useState([])
//   const [agingData,       setAgingData]       = useState(null)
//   const [summary,         setSummary]         = useState(null)
//   const [selectedCustomer,setSelectedCustomer]= useState(null)
//   const [loadingPortfolio,setLoadingPortfolio]= useState(false)
//   const [chatCustomer,    setChatCustomer]    = useState(null)
//   const [chatQuery,       setChatQuery]       = useState(null)
//   const [refreshKey,      setRefreshKey]      = useState(0)
//   const [backendOk,       setBackendOk]       = useState(null)

//   // ── Load portfolio data ──────────────────────────────────────
//   const loadPortfolio = useCallback(async () => {
//     setLoadingPortfolio(true)
//     try {
//       const data = await api.portfolio()
//       setCustomers(data.customers || [])
//       setAgingData(data.aging_buckets)
//       const c = data.customers || []
//       const avgScore = c.length ? Math.round(c.reduce((s,x)=>s+x.risk_score,0)/c.length) : 0
//       setSummary({ ...data.summary, avg_score: avgScore })
//       setBackendOk(true)
//     } catch(e) {
//       console.error('Portfolio load failed:', e)
//       setBackendOk(false)
//     } finally { setLoadingPortfolio(false) }
//   }, [])

//   useEffect(() => { loadPortfolio() }, [])

//   // ── Chat query relay from worklist buttons ───────────────────
//   const handleChatQuery = useCallback((query, customer) => {
//     if (customer) setChatCustomer(customer)
//     setChatQuery(query)
//     setView('chat')
//   }, [])

//   // ── Agent data updates ───────────────────────────────────────
//   const handleDataUpdate = useCallback((res) => {
//     if (res.portfolio_data) setCustomers(res.portfolio_data)
//     setRefreshKey(k => k+1)
//   }, [])

//   // ── Select customer — sync across views ──────────────────────
//   const selectCustomer = useCallback((c) => {
//     setSelectedCustomer(c)
//     setChatCustomer(c)
//   }, [])

//   // ── Backend offline banner ───────────────────────────────────
//   const BackendBanner = () => backendOk === false ? (
//     <div style={{ background:'rgba(239,68,68,0.1)', borderBottom:'1px solid rgba(239,68,68,0.3)',
//       padding:'8px 16px', fontSize:12, color:'var(--risk-critical)', display:'flex',
//       alignItems:'center', gap:8 }}>
//       <span>⚠</span>
//       <span>Flask backend not reachable at <code>localhost:5000</code> — start with <code>python app.py</code></span>
//     </div>
//   ) : null

//   return (
//     <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

//       {/* ── Sidebar nav ─────────────────────────────────────── */}
//       <nav style={{ width:56, background:'var(--bg-surface)', borderRight:'1px solid var(--border)',
//         display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0', gap:4, flexShrink:0 }}>
//         {/* Logo */}
//         <div style={{ width:32, height:32, borderRadius:'var(--radius-sm)', marginBottom:12,
//           background:'linear-gradient(135deg,#4f8ef7,#a78bfa)',
//           display:'flex', alignItems:'center', justifyContent:'center',
//           fontFamily:'var(--font-head)', fontSize:12, fontWeight:800, color:'#fff' }}>
//           AR
//         </div>
//         {NAV.map(n => (
//           <button key={n.id} title={n.label} onClick={()=>setView(n.id)} style={{
//             width:40, height:40, borderRadius:'var(--radius-sm)', border:'none', cursor:'pointer',
//             background: view===n.id ? 'rgba(79,142,247,0.15)' : 'transparent',
//             color: view===n.id ? 'var(--accent-blue)' : 'var(--text-muted)',
//             fontSize:16, transition:'all 0.15s', display:'flex', flexDirection:'column',
//             alignItems:'center', justifyContent:'center', gap:1
//           }}
//           onMouseEnter={e=>{ if(view!==n.id){e.currentTarget.style.background='var(--bg-hover)';e.currentTarget.style.color='var(--text-secondary)'}}}
//           onMouseLeave={e=>{ if(view!==n.id){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-muted)'}}}>
//             <span style={{fontSize:14}}>{n.icon}</span>
//           </button>
//         ))}
//         <div style={{flex:1}}/>
//         <button onClick={loadPortfolio} title="Refresh SAP data"
//           style={{width:40,height:40,borderRadius:'var(--radius-sm)',border:'none',cursor:'pointer',
//             background:'transparent',color:'var(--text-muted)',fontSize:14}}
//           onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-hover)'}}
//           onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
//           ↻
//         </button>
//       </nav>

//       {/* ── Main content area ───────────────────────────────── */}
//       <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
//         <BackendBanner/>

//         {/* ── DASHBOARD VIEW ─────────────────────────────────── */}
//         {view==='dashboard' && (
//           <div style={{ flex:1, overflow:'hidden', display:'grid',
//             gridTemplateColumns:'300px 1fr 280px', gridTemplateRows:'1fr 1fr',
//             gap:0, height:'100%' }}>
//             {/* Left: worklist */}
//             <div style={{ gridRow:'1/3', borderRight:'1px solid var(--border)', overflow:'hidden' }}>
//               <RiskWorklist customers={customers} selected={selectedCustomer}
//                 onSelect={selectCustomer} onChat={handleChatQuery} loading={loadingPortfolio}/>
//             </div>
//             {/* Center top: aging chart */}
//             <div style={{ borderBottom:'1px solid var(--border)', padding:16, overflow:'auto' }}>
//               <AgingChart aging={agingData} summary={summary} loading={loadingPortfolio}/>
//             </div>
//             {/* Right: customer detail */}
//             <div style={{ gridRow:'1/3', borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
//               <CustomerDetail customer={selectedCustomer} onChat={q=>handleChatQuery(q,selectedCustomer)}/>
//             </div>
//             {/* Center bottom: activity log */}
//             <div style={{ overflow:'hidden' }}>
//               <ActivityLog customerId={selectedCustomer?.customer_id} refreshKey={refreshKey}/>
//             </div>
//           </div>
//         )}

//         {/* ── CHAT VIEW ──────────────────────────────────────── */}
//         {view==='chat' && (
//           <div style={{ flex:1, overflow:'hidden', display:'grid',
//             gridTemplateColumns:'260px 1fr 260px', height:'100%' }}>
//             <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>
//               <RiskWorklist customers={customers} selected={chatCustomer}
//                 onSelect={c=>{setChatCustomer(c);selectCustomer(c)}}
//                 onChat={handleChatQuery} loading={loadingPortfolio}/>
//             </div>
//             <div style={{ overflow:'hidden' }}>
//               <ChatInterface selectedCustomer={chatCustomer}
//                 onDataUpdate={handleDataUpdate}
//                 initialQuery={chatQuery}
//                 key={chatQuery}/>
//             </div>
//             <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
//               <CustomerDetail customer={chatCustomer||selectedCustomer}
//                 onChat={q=>handleChatQuery(q,chatCustomer||selectedCustomer)}/>
//             </div>
//           </div>
//         )}

//         {/* ── WORKLIST VIEW ─────────────────────────────────── */}
//         {view==='worklist' && (
//           <div style={{ flex:1, overflow:'hidden', display:'grid',
//             gridTemplateColumns:'1fr 360px', height:'100%' }}>
//             <div style={{ overflow:'hidden' }}>
//               <RiskWorklist customers={customers} selected={selectedCustomer}
//                 onSelect={selectCustomer} onChat={handleChatQuery} loading={loadingPortfolio}/>
//             </div>
//             <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
//               <CustomerDetail customer={selectedCustomer}
//                 onChat={q=>handleChatQuery(q,selectedCustomer)}/>
//             </div>
//           </div>
//         )}

//         {/* ── PTP VIEW ──────────────────────────────────────── */}
//         {view==='ptp' && (
//           <div style={{ flex:1, overflow:'hidden', display:'grid',
//             gridTemplateColumns:'1fr 320px', height:'100%' }}>
//             <div style={{ padding:20, overflowY:'auto' }}>
//               <div style={{ marginBottom:16 }}>
//                 <div style={{ fontFamily:'var(--font-head)', fontSize:20, marginBottom:4 }}>PTP Tracker</div>
//                 <div style={{ color:'var(--text-muted)', fontSize:13 }}>
//                   Monitor payment commitments and broken promises from SAP FI-AR
//                 </div>
//               </div>
//               <PTPTracker refreshKey={refreshKey}/>
//             </div>
//             <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
//               <ActivityLog refreshKey={refreshKey}/>
//             </div>
//           </div>
//         )}

//         {/* ── ACTIVITY LOG VIEW ─────────────────────────────── */}
//         {view==='log' && (
//           <div style={{ flex:1, overflow:'hidden', display:'grid',
//             gridTemplateColumns:'300px 1fr', height:'100%' }}>
//             <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>
//               <RiskWorklist customers={customers} selected={selectedCustomer}
//                 onSelect={selectCustomer} onChat={handleChatQuery} loading={loadingPortfolio}/>
//             </div>
//             <div style={{ overflow:'hidden' }}>
//               <ActivityLog customerId={selectedCustomer?.customer_id} refreshKey={refreshKey}/>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }



// src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { api } from './api/client'
import ChatInterface    from './components/ChatInterface'
import RiskWorklist     from './components/RiskWorklist'
import CustomerDetail   from './components/CustomerDetail'
import AgingChart       from './components/AgingChart'
import ActivityLog, { PTPTracker } from './components/ActivityLog'

const NAV = [
  { id:'dashboard', label:'Dashboard',  icon:'▦' },
  { id:'chat',      label:'Co-pilot',   icon:'◎' },
  { id:'worklist',  label:'Worklist',   icon:'≡' },
  { id:'ptp',       label:'PTP Tracker',icon:'✓' },
  { id:'log',       label:'Activity',   icon:'◷' },
]

export default function App() {
  const [view,            setView]            = useState('chat')
  const [customers,       setCustomers]       = useState([])
  const [agingData,       setAgingData]       = useState(null)
  const [summary,         setSummary]         = useState(null)
  const [selectedCustomer,setSelectedCustomer]= useState(null)
  const [loadingPortfolio,setLoadingPortfolio]= useState(false)
  const [chatCustomer,    setChatCustomer]    = useState(null)
  const [chatQuery,       setChatQuery]       = useState(null)
  const [refreshKey,      setRefreshKey]      = useState(0)
  const [backendOk,       setBackendOk]       = useState(null)

  // ── Load portfolio data ──────────────────────────────────────
  const loadPortfolio = useCallback(async () => {
    setLoadingPortfolio(true)
    try {
      const data = await api.portfolio()
      setCustomers(data.customers || [])
      setAgingData(data.aging_buckets)
      const c = data.customers || []
      const avgScore = c.length ? Math.round(c.reduce((s,x)=>s+x.risk_score,0)/c.length) : 0
      setSummary({ ...data.summary, avg_score: avgScore })
      setBackendOk(true)
    } catch(e) {
      console.error('Portfolio load failed:', e)
      setBackendOk(false)
    } finally { setLoadingPortfolio(false) }
  }, [])

  useEffect(() => { loadPortfolio() }, [])

  // ── Chat query relay from worklist buttons ───────────────────
  const handleChatQuery = useCallback((query, customer) => {
    if (customer) setChatCustomer(customer)
    setChatQuery(query)
    setView('chat')
  }, [])

  // ── Agent data updates ───────────────────────────────────────
  const handleDataUpdate = useCallback((res) => {
    if (res.portfolio_data) setCustomers(res.portfolio_data)
    setRefreshKey(k => k+1)
  }, [])

  // ── Select customer — sync across views ──────────────────────
  const selectCustomer = useCallback((c) => {
    setSelectedCustomer(c)
    setChatCustomer(c)
  }, [])

  // ── Backend offline banner ───────────────────────────────────
  const BackendBanner = () => backendOk === false ? (
    <div style={{ background:'rgba(239,68,68,0.1)', borderBottom:'1px solid rgba(239,68,68,0.3)',
      padding:'8px 16px', fontSize:12, color:'var(--risk-critical)', display:'flex',
      alignItems:'center', gap:8 }}>
      <span>⚠</span>
      <span>Flask backend not reachable at <code>localhost:5000</code> — start with <code>python app.py</code></span>
    </div>
  ) : null

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* ── Sidebar nav ─────────────────────────────────────── */}
      <nav style={{ width:56, background:'var(--bg-surface)', borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 0', gap:4, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ width:32, height:32, borderRadius:'var(--radius-sm)', marginBottom:12,
          background:'linear-gradient(135deg,#4f8ef7,#a78bfa)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-head)', fontSize:12, fontWeight:800, color:'#fff' }}>
          AR
        </div>
        {NAV.map(n => (
          <button key={n.id} title={n.label} onClick={()=>setView(n.id)} style={{
            width:40, height:40, borderRadius:'var(--radius-sm)', border:'none', cursor:'pointer',
            background: view===n.id ? 'rgba(79,142,247,0.15)' : 'transparent',
            color: view===n.id ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontSize:16, transition:'all 0.15s', display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:1
          }}
          onMouseEnter={e=>{ if(view!==n.id){e.currentTarget.style.background='var(--bg-hover)';e.currentTarget.style.color='var(--text-secondary)'}}}
          onMouseLeave={e=>{ if(view!==n.id){e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-muted)'}}}>
            <span style={{fontSize:14}}>{n.icon}</span>
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={loadPortfolio} title="Refresh SAP data"
          style={{width:40,height:40,borderRadius:'var(--radius-sm)',border:'none',cursor:'pointer',
            background:'transparent',color:'var(--text-muted)',fontSize:14}}
          onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-hover)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
          ↻
        </button>
      </nav>

      {/* ── Main content area ───────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <BackendBanner/>

        {/* ── DASHBOARD VIEW ─────────────────────────────────── */}
        {view==='dashboard' && (
          <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'300px 1fr 280px', gridTemplateRows:'1fr 1fr',
            gap:0, height:'100%' }}>
            {/* Left: worklist */}
            <div style={{ gridRow:'1/3', borderRight:'1px solid var(--border)', overflow:'hidden' }}>
              <RiskWorklist customers={customers} selected={selectedCustomer}
                onSelect={selectCustomer} onChat={handleChatQuery} loading={loadingPortfolio}/>
            </div>
            {/* Center top: aging chart */}
            <div style={{ borderBottom:'1px solid var(--border)', padding:16, overflow:'auto' }}>
              <AgingChart aging={agingData} summary={summary} loading={loadingPortfolio}/>
            </div>
            {/* Right: customer detail */}
            <div style={{ gridRow:'1/3', borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
              <CustomerDetail customer={selectedCustomer} onChat={q=>handleChatQuery(q,selectedCustomer)}/>
            </div>
            {/* Center bottom: activity log */}
            <div style={{ overflow:'hidden' }}>
              <ActivityLog customerId={selectedCustomer?.customer_id} refreshKey={refreshKey}/>
            </div>
          </div>
        )}

        {/* ── CHAT VIEW ──────────────────────────────────────── */}
        {view==='chat' && (
          <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'260px 1fr 260px', height:'100%' }}>
            <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>
              <RiskWorklist customers={customers} selected={chatCustomer}
                onSelect={c=>{setChatCustomer(c);selectCustomer(c)}}
                onChat={handleChatQuery} loading={loadingPortfolio}/>
            </div>
            <div style={{ overflow:'hidden' }}>
              <ChatInterface selectedCustomer={chatCustomer}
                onDataUpdate={handleDataUpdate}
                initialQuery={chatQuery}
                key={chatQuery}/>
            </div>
            <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
              <CustomerDetail customer={chatCustomer||selectedCustomer}
                onChat={q=>handleChatQuery(q,chatCustomer||selectedCustomer)}/>
            </div>
          </div>
        )}

        {/* ── WORKLIST VIEW ─────────────────────────────────── */}
        {view==='worklist' && (
          <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'1fr 360px', height:'100%' }}>
            <div style={{ overflow:'hidden' }}>
              <RiskWorklist customers={customers} selected={selectedCustomer}
                onSelect={selectCustomer} onChat={handleChatQuery} loading={loadingPortfolio}/>
            </div>
            <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
              <CustomerDetail customer={selectedCustomer}
                onChat={q=>handleChatQuery(q,selectedCustomer)}/>
            </div>
          </div>
        )}

        {/* ── PTP VIEW ──────────────────────────────────────── */}
        {view==='ptp' && (
          <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'1fr 320px', height:'100%', position:'relative' }}>
            {/* PTP tracker — full height, modal-ready */}
            <div style={{ overflow:'hidden', position:'relative' }}>
              <PTPTracker
                refreshKey={refreshKey}
                onSelectCustomer={(c) => { selectCustomer(c); setView('worklist') }}
                onChat={(q, cid) => {
                  const match = customers.find(x => x.customer_id === cid)
                  if (match) setChatCustomer(match)
                  handleChatQuery(q, match || null)
                }}
              />
            </div>
            {/* Right panel: customer detail if selected, else activity log */}
            <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
              {selectedCustomer
                ? <CustomerDetail customer={selectedCustomer}
                    onChat={q => handleChatQuery(q, selectedCustomer)}/>
                : <ActivityLog refreshKey={refreshKey}/>
              }
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOG VIEW ─────────────────────────────── */}
        {view==='log' && (
          <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'300px 1fr', height:'100%' }}>
            <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>
              <RiskWorklist customers={customers} selected={selectedCustomer}
                onSelect={selectCustomer} onChat={handleChatQuery} loading={loadingPortfolio}/>
            </div>
            <div style={{ overflow:'hidden' }}>
              <ActivityLog customerId={selectedCustomer?.customer_id} refreshKey={refreshKey}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
