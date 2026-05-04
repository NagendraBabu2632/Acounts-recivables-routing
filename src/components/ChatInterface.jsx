// src/components/ChatInterface.jsx
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api/client'
import RiskDashboard from './RiskDashboard'
import AccountDashboard from './AccountDashboard'
import WTPDashboard from './WTPDashboard'
import PTPDashboard from './Ptpdashboard'

const SUGGESTIONS = [
  "Show me the full portfolio risk worklist",
  "Analyse Bharat Engineering Ltd account",
  "Draft a collection email for C002",
  "Escalate Deccan Fabricators — credit hold",
  "Show all promise-to-pay records and broken PTPs",
  "Which accounts need immediate action today?",
]

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', padding:'4px 0' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:6, height:6, borderRadius:'50%',
          background:'var(--accent-blue)', opacity:0.6,
          animation:`typingBounce 1.2s ${i*0.2}s ease-in-out infinite`
        }}/>
      ))}
      <style>{`@keyframes typingBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}

function AgentTrace({ trace }) {
  if (!trace?.length) return null
  return (
    <div style={{ marginTop:8, padding:'8px 12px', background:'var(--bg-input)',
      borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
      <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>Agent trace</div>
      {trace.map((t,i) => (
        <div key={i} style={{ fontSize:11, color:'var(--accent-teal)', fontFamily:'var(--font-mono)', lineHeight:1.8 }}>
          <span style={{ color:'var(--text-muted)', marginRight:6 }}>▸</span>{t}
        </div>
      ))}
    </div>
  )
}

function InsightCards({ insights }) {
  if (!insights?.length) return null
  return (
    <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
      {insights.map((ins,i) => {
        const isUrgent = ins.startsWith('URGENT') || ins.startsWith('CREDIT') || ins.startsWith('ALERT') || ins.startsWith('BROKEN')
        const isWarn   = ins.startsWith('TREND') || ins.startsWith('DISPUTE')
        return (
          <div key={i} style={{
            padding:'8px 12px', borderRadius:'var(--radius-sm)',
            background: isUrgent ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(234,179,8,0.08)' : 'rgba(79,142,247,0.08)',
            border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : isWarn ? 'rgba(234,179,8,0.25)' : 'rgba(79,142,247,0.2)'}`,
            fontSize:12,
            color: isUrgent ? 'var(--risk-critical)' : isWarn ? 'var(--risk-medium)' : 'var(--accent-blue)',
            display:'flex', alignItems:'flex-start', gap:8
          }}>
            <span style={{ flexShrink:0, marginTop:1 }}>
              {isUrgent ? '⚠' : isWarn ? '●' : '→'}
            </span>
            {ins}
          </div>
        )
      })}
    </div>
  )
}

// function Message({ msg }) {
//   const isUser = msg.role === 'user' 
 
//   return (
//     <div style={{
//       display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
//       marginBottom:16, animation:'fadeSlideUp 0.25s ease-out',
//     }}>
//       <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
//       {!isUser && (
//         <div style={{
//           width:30, height:30, borderRadius:'50%', flexShrink:0, marginRight:10, marginTop:2,
//           background:'linear-gradient(135deg,#4f8ef7,#a78bfa)',
//           display:'flex', alignItems:'center', justifyContent:'center',
//           fontSize:12, fontWeight:700, color:'#fff', fontFamily:'var(--font-head)'
//         }}>AI</div>
//       )}
//       <div style={{ maxWidth:'80%' }}>
//         <div style={{
//           padding: isUser ? '10px 14px' : '14px 16px',
//           borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
//           background: isUser ? 'var(--accent-blue)' : 'var(--bg-card)',
//           border: isUser ? 'none' : '1px solid var(--border)',
//           color: isUser ? '#fff' : 'var(--text-primary)',
//           fontSize:13, lineHeight:1.6,
//         }}>
//           {msg.typing ? <TypingDots /> : (
//             isUser ? <span>{msg.content}</span> : (
//               <div className="prose">
//                 <ReactMarkdown>{msg.content}</ReactMarkdown>
//               </div>
//             )
//           )}
//         </div>
//         {!isUser && msg.insights && <InsightCards insights={msg.insights} />}
//         {!isUser && msg.trace && <AgentTrace trace={msg.trace} />}
//         <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4,
//           textAlign: isUser ? 'right' : 'left', paddingInline:4 }}>
//           {msg.time}
//         </div>
//       </div>
//       {isUser && (
//         <div style={{
//           width:30, height:30, borderRadius:'50%', flexShrink:0, marginLeft:10, marginTop:2,
//           background:'var(--bg-hover)', border:'1px solid var(--border)',
//           display:'flex', alignItems:'center', justifyContent:'center',
//           fontSize:11, color:'var(--text-secondary)'
//         }}>You</div>
//       )}
//     </div>
//   )
// }

function Message({ msg, index, messages }) {
  const isUser = msg.role === 'user'
  const prevMsg = messages[index - 1]

  const isEmailResponse =
    msg.role === 'assistant' &&
    prevMsg?.role === 'user' &&
    prevMsg.content?.toLowerCase().includes('email')

  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  // ✅ Extract ONLY FINAL email block (last Subject → end of email)
// Extract ONLY Draft Email (clean format)
const extractEmailContent = (content) => {
  if (!content) return ''

  // Step 1: Get only Draft Email section
  const sectionMatch = content.match(/## Draft Collection Email[\s\S]*/i)
  let emailPart = sectionMatch ? sectionMatch[0] : content

  // Step 2: Remove heading
  emailPart = emailPart.replace(/## Draft Collection Email.*\n/i, '')

   emailPart = emailPart.replace(/(IMMEDIATE ACTIONS|NEXT STEPS|ACTION ITEMS):[\s\S]*/i, '')

  // Step 3: Remove markdown bold (**)
  emailPart = emailPart.replace(/\*\*/g, '')

  // Step 4: Trim extra spaces
  return emailPart.trim()
}

  const handleEdit = () => {
    const emailPart = extractEmailContent(msg.content)
    setEditedContent(emailPart)
    setIsEditing(true)
  }

  const handleSendEmail = async () => {
    try {
      const content = isEditing ? editedContent : extractEmailContent(msg.content)

      // ✅ Exit edit mode immediately
      setIsEditing(false)

      // Extract subject
      const subjectMatch =
        content.match(/\*\*Subject:\*\*\s*(.+)/) ||
        content.match(/Subject:\s*(.+)/)

      const subject = subjectMatch
        ? subjectMatch[1].trim()
        : 'Payment Reminder'

      // Extract body
      const bodyMatch = content.match(/Dear[\s\S]*/)
      const body = bodyMatch ? bodyMatch[0] : content

      const payload = {
        subject,
        msg: body,
        mail: "kishore.valluri@carbynetech.com"
      }

      console.log('📤 Sending email:', payload)

      const res = await fetch('http://172.16.0.177:5000/api/sendemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      alert(data.message || 'Email sent successfully!')

    } catch (err) {
      console.error('❌ Email send failed:', err)
      alert('Failed to send email')
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
      animation: 'fadeSlideUp 0.25s ease-out',
    }}>
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          flexShrink: 0, marginRight: 10, marginTop: 2,
          background: 'linear-gradient(135deg,#4f8ef7,#a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff'
        }}>AI</div>
      )}

      <div style={{ maxWidth: '80%' }}>
        <div style={{
          padding: isUser ? '10px 14px' : '14px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--accent-blue)' : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: 13,
          lineHeight: 1.6,
        }}>

          {msg.typing ? (
            <TypingDots />
          ) : isUser ? (
            <span>{msg.content}</span>
          ) : (
            <div className="prose">

              {/* ✅ Edit mode → ONLY email */}
              {isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 300,
                    fontSize: 12,
                    borderRadius: 6,
                     background: 'var(--bg-card)',   
                     color: 'var(--text-primary)',  
                    padding: 10,
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-ui)',
                    outline: 'none',
                  }}
                />
              ) : (
                <>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                 {/*  Add this right here, after ReactMarkdown */}
    {msg.intent === 'risk_portfolio' && msg.portfolioData?.length && (
      <RiskDashboard data={msg.portfolioData} />
    )}
    {msg.intent === 'account_detail' && msg.customerData && (
  <AccountDashboard data={msg.customerData} />
)}

{msg.intent === 'ptp' && msg.customerData && (
  <PTPDashboard data={msg.customerData} />
)}
{msg.intent === 'wtp' && msg.portfolioData?.length && (
  <WTPDashboard data={msg.portfolioData} />
)}
                </>
              )}

              {/* Buttons */}
              {isEmailResponse && (
                <div style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end'
                }}>
                  {!isEditing ? (
                    <>
                      <button onClick={handleEdit} style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        borderRadius: 6,
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}>
                        ✏️ Edit
                      </button>

                      <button onClick={handleSendEmail} style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        borderRadius: 6,
                        background: 'var(--accent-teal)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer'
                      }}>
                        Send Email
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setIsEditing(false)} style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        borderRadius: 6,
                        background: '#e5e7eb',
                        border: 'none',
                        cursor: 'pointer'
                      }}>
                        Cancel
                      </button>

                      <button onClick={handleSendEmail} style={{
                        padding: '5px 12px',
                        fontSize: 11,
                        borderRadius: 6,
                        background: 'var(--accent-teal)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer'
                      }}>
                        Send Email
                      </button>
                    </>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        {!isUser && msg.insights && <InsightCards insights={msg.insights} />}
        {!isUser && msg.trace && <AgentTrace trace={msg.trace} />}

        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          paddingInline: 4
        }}>
          {msg.time}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          flexShrink: 0, marginLeft: 10, marginTop: 2,
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11
        }}>You</div>
      )}
    </div>
  )
}


export default function ChatInterface({ selectedCustomer,  initialQuery, placeholder}) {
  const [messages, setMessages]   = useState([
    { role:'assistant', content:`## Welcome to SAP AR Collections Co-pilot\n\nI have access to your **SAP S/4HANA FI-AR data** in real time. I can help you:\n\n- **Assess risk** across your full AR portfolio\n- **Deep-dive** any customer account with payment history, disputes, and credit position\n- **Draft communications** — emails, call scripts, WhatsApp messages\n- **Escalate** critical accounts with credit hold recommendations\n- **Track promises-to-pay** and flag broken commitments\n\nWhat would you like to work on today?`,
      time: now(), insights:[], trace:[] }
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [showTrace, setShowTrace] = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()
  const lastQueryRef = useRef(null) 
  

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

 useEffect(() => {
  if (!initialQuery) return

  if (lastQueryRef.current === initialQuery) return

  lastQueryRef.current = initialQuery

  send(initialQuery)

}, [initialQuery])

  // useEffect(() => {
  //   if (initialQuery && initialQuery.trim()) {
  //     const q = initialQuery.split('___')[0]
  //     if (q) setTimeout(() => send(q), 100)
  //   }
  // }, [])

  const messagesRef = useRef(messages)

useEffect(() => {
  messagesRef.current = messages
}, [messages])

  const send = async (text) => {
    const query = (text || input).trim()
    if (!query || loading) return
    setInput('')

    const userMsg = { role:'user', content:query, time:now() }
    const thinkMsg = { role:'assistant', typing:true, time:now() }
   setMessages(prev => [...prev, userMsg, thinkMsg])
    setLoading(true)

    try {
     const history = messagesRef.current.slice(-8).map(m => ({ role:m.role, content:m.content || '' }))
    const res = await api.chat(query, 
     selectedCustomer?.customer_id,
    history)
      setMessages(prev => [
        ...prev.slice(0,-1),
        { role:'assistant', content:res.response, insights:res.actionable_insights,
          trace:res.agent_trace, portfolioData: res.portfolio_data,intent:res.intent,  customerData: res.customer_data, time:now() }
      ])
      // if (res.portfolio_data || res.customer_data) onDataUpdate?.(res)
    } catch(e) {
      setMessages(prev => [
        ...prev.slice(0,-1),
        { role:'assistant', content:`Sorry, I encountered an error: **${e.message}**\n\nPlease check the Flask backend is running on port 5000.`, time:now() }
      ])
    } finally { setLoading(false); inputRef.current?.focus() }
  }

  const handleKey = e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--risk-low)',
            boxShadow:'0 0 8px var(--risk-low)' }}/>
          <span style={{ fontFamily:'var(--font-head)', fontSize:15 }}>Collections Co-pilot</span>
          {selectedCustomer && (
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
              background:'rgba(79,142,247,0.1)', color:'var(--accent-blue)',
              border:'1px solid rgba(79,142,247,0.2)' }}>
              {selectedCustomer.name}
            </span>
          )}
        </div>
        <button className="btn btn-ghost" style={{ fontSize:11, padding:'4px 10px' }}
          onClick={() => setShowTrace(t=>!t)}>
          {showTrace ? 'Hide' : 'Show'} trace
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
        {messages.map((m,i) => (
          <Message key={i} msg={{ ...m, trace: showTrace ? m.trace : [] }} index={i} messages={messages} />
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div style={{ padding:'0 16px 10px', display:'flex', flexWrap:'wrap', gap:6 }}>
          {SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={() => send(s)} style={{
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:20, padding:'5px 12px', fontSize:11,
              color:'var(--text-secondary)', cursor:'pointer', transition:'all 0.15s'
            }}
            onMouseEnter={e => { e.target.style.borderColor='var(--accent-blue)'; e.target.style.color='var(--accent-blue)' }}
            onMouseLeave={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-secondary)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end',
          background:'var(--bg-input)', borderRadius:'var(--radius-md)',
          border:'1px solid var(--border)', padding:'10px 12px',
          transition:'border-color 0.15s' }}
          onFocus={e => e.currentTarget.style.borderColor='var(--accent-blue)'}
          onBlur={e => e.currentTarget.style.borderColor='var(--border)'}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey} rows={1} placeholder={placeholder || "Ask about your AR portfolio..."}
            style={{ flex:1, background:'none', border:'none', outline:'none', resize:'none',
              color:'var(--text-primary)', fontFamily:'var(--font-ui)', fontSize:13, lineHeight:1.5,
              maxHeight:100, overflowY:'auto' }}
            onInput={e => { e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px' }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{ flexShrink:0, width:32, height:32, borderRadius:'var(--radius-sm)',
              background: input.trim() ? 'var(--accent-blue)' : 'var(--bg-hover)',
              border:'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
              color:'#fff', fontSize:14, transition:'all 0.15s', display:'flex',
              alignItems:'center', justifyContent:'center' }}>
            {loading ? '⟳' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
}
