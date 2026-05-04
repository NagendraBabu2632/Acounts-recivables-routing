
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

function now() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// ── Welcome message factory (per customer) ────────────────────────────────
const makeWelcomeMsg = (customerId) => ({
  role: 'assistant',
  content: `## Welcome to SAP AR Collections Co-pilot\n\nI have access to your **SAP S/4HANA FI-AR data** in real time. I can help you:\n\n- **Assess risk** across your full AR portfolio\n- **Deep-dive** any customer account with payment history, disputes, and credit position\n- **Draft communications** — emails, call scripts, WhatsApp messages\n- **Escalate** critical accounts with credit hold recommendations\n- **Track promises-to-pay** and flag broken commitments\n\nWhat would you like to work on today?`,
  time: now(),
  insights: [],
  trace: [],
  customerId,
})

// ── Build history only for current customer ───────────────────────────────
const buildHistory = (messages, customerId) => {
  return messages
    .filter(m => !m.typing && m.content && m.customerId === customerId)
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content }))
}

// ── TypingDots ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent-blue)', opacity: 0.6,
          animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`
        }} />
      ))}
      <style>{`@keyframes typingBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}

// ── AgentTrace ─────────────────────────────────────────────────────────────
function AgentTrace({ trace }) {
  if (!trace?.length) return null
  return (
    <div style={{
      marginTop: 8, padding: '8px 12px', background: 'var(--bg-input)',
      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
    }}>
      <div style={{
        fontSize: 10, color: 'var(--text-muted)', marginBottom: 4,
        letterSpacing: '0.06em', textTransform: 'uppercase'
      }}>Agent trace</div>
      {trace.map((t, i) => (
        <div key={i} style={{
          fontSize: 11, color: 'var(--accent-teal)',
          fontFamily: 'var(--font-mono)', lineHeight: 1.8
        }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>▸</span>{t}
        </div>
      ))}
    </div>
  )
}

// ── InsightCards ───────────────────────────────────────────────────────────
function InsightCards({ insights }) {
  if (!insights?.length) return null
  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {insights.map((ins, i) => {
        const isUrgent = ins.startsWith('URGENT') || ins.startsWith('CREDIT') || ins.startsWith('ALERT') || ins.startsWith('BROKEN')
        const isWarn   = ins.startsWith('TREND')  || ins.startsWith('DISPUTE')
        return (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            background: isUrgent ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(234,179,8,0.08)' : 'rgba(79,142,247,0.08)',
            border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : isWarn ? 'rgba(234,179,8,0.25)' : 'rgba(79,142,247,0.2)'}`,
            fontSize: 12,
            color: isUrgent ? 'var(--risk-critical)' : isWarn ? 'var(--risk-medium)' : 'var(--accent-blue)',
            display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>
              {isUrgent ? '⚠' : isWarn ? '●' : '→'}
            </span>
            {ins}
          </div>
        )
      })}
    </div>
  )
}

// ── Enrich email placeholders with real customer data ─────────────────────
function enrichEmailWithCustomerData(emailText, customer) {
  if (!customer || !emailText) return emailText

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  // Compute overdue date from oldest_item_days
  const dueDate = customer.oldest_item_days
    ? (() => {
        const d = new Date()
        d.setDate(d.getDate() - customer.oldest_item_days)
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      })()
    : null

  const overdueDays  = customer.oldest_item_days  || null
  const amount       = customer.total_open_inr     ? fmt(customer.total_open_inr) : null
  const contactName  = customer.name               || '[Recipient]'
  const payTerms     = customer.payment_terms      || 'Net 45'
  const invoiceCount = customer.open_invoice_count || ''
  const creditUsed   = customer.credit_used        ? fmt(customer.credit_used)   : null
  const creditLimit  = customer.credit_limit       ? fmt(customer.credit_limit)  : null

  let enriched = emailText

  // ── Replace placeholder tokens ──────────────────────────────────────────
  enriched = enriched.replace(/\[Recipient Name\]/gi,           contactName)
  enriched = enriched.replace(/\[recipient name\]/gi,           contactName)
  enriched = enriched.replace(/Dear \[.*?\]/gi,                 `Dear ${contactName} Team,`)
  enriched = enriched.replace(/\[amount\]/gi,                   amount       || '[amount]')
  enriched = enriched.replace(/\[due date\]/gi,                 dueDate      || '[due date]')
  enriched = enriched.replace(/\[overdue amount\]/gi,           amount       || '[overdue amount]')
  enriched = enriched.replace(/\[outstanding amount\]/gi,       amount       || '[outstanding amount]')
  enriched = enriched.replace(/\[number of invoices?\]/gi,      invoiceCount || '[invoice count]')
  enriched = enriched.replace(/\[payment terms?\]/gi,           payTerms)
  enriched = enriched.replace(/\[Your Name\]/gi,                'Collections Team')
  enriched = enriched.replace(/\[Your Position\]/gi,            'AR Collections')
  enriched = enriched.replace(/\[Your Contact Information\]/gi, 'collections@company.com')

  // ── Inject invoice detail block inside the email body before sign-off ───
  if (amount && !enriched.includes('Account Details:')) {
    const detailLines = [
      `Account Details:`,
      `  \u2022 Total Outstanding  : ${amount}`,
      invoiceCount ? `  \u2022 Open Invoices      : ${invoiceCount}` : null,
      dueDate      ? `  \u2022 Overdue Since      : ${dueDate}${overdueDays ? ` (${overdueDays} days ago)` : ''}` : null,
      `  \u2022 Payment Terms      : ${payTerms}`,
      creditUsed && creditLimit ? `  \u2022 Credit Utilisation : ${creditUsed} of ${creditLimit}` : null,
    ].filter(Boolean).join('\n')

    // Insert just before sign-off line
    const signOffMatch = enriched.match(/\n(Best regards|Sincerely|Regards|Thank you)[,\s]/i)
    if (signOffMatch) {
      const idx = enriched.indexOf(signOffMatch[0])
      enriched = enriched.slice(0, idx) + `\n\n${detailLines}\n` + enriched.slice(idx)
    } else {
      enriched += `\n\n${detailLines}`
    }
  }

  return enriched
}

// ── DraftEmailCard ─────────────────────────────────────────────────────────
function DraftEmailCard({ content, customer, onEdit, onSend, isEditing, editedContent, onEditChange, onCancel }) {
  const enriched   = enrichEmailWithCustomerData(content, customer)
  const subjectMatch = enriched.match(/Subject:\s*(.+)/i)
  const subject      = subjectMatch ? subjectMatch[1].trim() : 'Payment Reminder'
  const bodyMatch    = enriched.match(/Dear[\s\S]*/)
  const body         = bodyMatch ? bodyMatch[0] : enriched

  const riskColor = {
    critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  text: 'var(--risk-critical)' },
    high:     { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.3)',  text: 'var(--risk-medium)'   },
    medium:   { bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.3)', text: 'var(--accent-blue)'   },
    low:      { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  text: 'var(--risk-low)'      },
  }
  const rc = riskColor[customer?.risk_band] || riskColor.medium

  const fmt = (n) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—'

  return (
    <div style={{
      marginTop: 14, border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
      background: 'var(--bg-surface)',
    }}>
      {/* Customer context bar */}
      {customer && (
        <div style={{
          padding: '8px 14px', background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            {customer.name}
          </span>
          <span style={{
            fontSize: 10, padding: '1px 8px', borderRadius: 20,
            background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text, fontWeight: 600,
          }}>
            {(customer.risk_band || '').toUpperCase()} RISK
          </span>
          {customer.total_open_inr && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Outstanding: <strong style={{ color: 'var(--risk-critical)' }}>{fmt(customer.total_open_inr)}</strong>
            </span>
          )}
          {customer.open_invoice_count && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Invoices: <strong>{customer.open_invoice_count}</strong>
            </span>
          )}
          {customer.oldest_item_days && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Oldest: <strong style={{ color: 'var(--risk-medium)' }}>{customer.oldest_item_days}d overdue</strong>
            </span>
          )}
          {customer.payment_terms && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Terms: <strong>{customer.payment_terms}</strong>
            </span>
          )}
        </div>
      )}

      {/* Subject line */}
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-input)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Subject</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{subject}</span>
      </div>

      {/* Email body */}
      <div style={{ padding: '12px 14px' }}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={e => onEditChange(e.target.value)}
            rows={14}
            style={{
              width: '100%', padding: '10px', fontSize: 12,
              background: 'var(--bg-input)', border: '1px solid var(--accent-blue)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', outline: 'none', resize: 'vertical',
              lineHeight: 1.7,
            }}
          />
        ) : (
          <div style={{
            fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            background: 'var(--bg-input)', padding: '10px 12px',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          }}>
            {body}
          </div>
        )}

        {/* Account summary info bar — always visible below email body */}
        {!isEditing && customer && (customer.total_open_inr || customer.oldest_item_days) && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: 'rgba(79,142,247,0.06)',
            border: '1px solid rgba(79,142,247,0.2)',
            borderRadius: 'var(--radius-sm)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '6px 16px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              gridColumn: '1/-1', marginBottom: 2 }}>
              📋 Account Summary
            </div>
            {customer.total_open_inr && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Outstanding: </span>
                <strong style={{ color: 'var(--risk-critical)' }}>
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.total_open_inr)}
                </strong>
              </div>
            )}
            {customer.open_invoice_count && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Open Invoices: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{customer.open_invoice_count}</strong>
              </div>
            )}
            {customer.oldest_item_days && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Overdue Since: </span>
                <strong style={{ color: 'var(--risk-medium)' }}>
                  {(() => {
                    const d = new Date()
                    d.setDate(d.getDate() - customer.oldest_item_days)
                    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  })()} ({customer.oldest_item_days} days)
                </strong>
              </div>
            )}
            {customer.payment_terms && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Terms: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{customer.payment_terms}</strong>
              </div>
            )}
            {customer.credit_used && customer.credit_limit && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Credit Used: </span>
                <strong style={{ color: customer.credit_utilization > 90 ? 'var(--risk-critical)' : 'var(--text-primary)' }}>
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.credit_used)}
                  {' '}/ {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.credit_limit)}
                  {' '}({customer.credit_utilization}%)
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
          {!isEditing ? (
            <>
              <button onClick={onEdit} style={{
                padding: '5px 14px', fontSize: 11, borderRadius: 6,
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}>✏️ Edit</button>
              <button onClick={onSend} style={{
                padding: '5px 14px', fontSize: 11, borderRadius: 6,
                background: 'var(--accent-teal)', color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: 600,
              }}>📤 Send Email</button>
            </>
          ) : (
            <>
              <button onClick={onCancel} style={{
                padding: '5px 14px', fontSize: 11, borderRadius: 6,
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}>Cancel</button>
              <button onClick={onSend} style={{
                padding: '5px 14px', fontSize: 11, borderRadius: 6,
                background: 'var(--accent-teal)', color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: 600,
              }}>📤 Send Email</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Message ────────────────────────────────────────────────────────────────
function Message({ msg, index, messages }) {
  const isUser  = msg.role === 'user'
  const prevMsg = messages[index - 1]

  // Always use the frozen snapshot stored IN the message
  const snap = msg.snapshotCustomer

  const isEmailResponse =
    msg.role === 'assistant' &&
    prevMsg?.role === 'user' &&
    prevMsg.content?.toLowerCase().includes('email')

  const [isEditing,     setIsEditing]     = useState(false)
  const [editedContent, setEditedContent] = useState('')

  // Extract clean email block from generic response text
  const extractEmailContent = (content) => {
    if (!content) return ''
    const sectionMatch = content.match(/## Draft Collection Email[\s\S]*/i)
    let emailPart = sectionMatch ? sectionMatch[0] : content
    emailPart = emailPart.replace(/## Draft Collection Email.*\n/i, '')
    emailPart = emailPart.replace(/(IMMEDIATE ACTIONS|NEXT STEPS|ACTION ITEMS):[\s\S]*/i, '')
    emailPart = emailPart.replace(/\*\*/g, '')
    return emailPart.trim()
  }

  const handleEdit = () => {
    const enriched = enrichEmailWithCustomerData(extractEmailContent(msg.content), snap)
    setEditedContent(enriched)
    setIsEditing(true)
  }

  const handleSendEmail = async () => {
    try {
      const rawContent = isEditing
        ? editedContent
        : enrichEmailWithCustomerData(extractEmailContent(msg.content), snap)
      setIsEditing(false)
      const subjectMatch = rawContent.match(/Subject:\s*(.+)/i)
      const subject      = subjectMatch ? subjectMatch[1].trim() : 'Payment Reminder'
      const bodyMatch    = rawContent.match(/Dear[\s\S]*/)
      const body         = bodyMatch ? bodyMatch[0] : rawContent
      const res  = await fetch('http://172.16.0.177:5000/api/sendemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, msg: body, mail: 'kishore.valluri@carbynetech.com' }),
      })
      const data = await res.json()
      alert(data.message || 'Email sent successfully!')
    } catch {
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
          fontSize: 13, lineHeight: 1.6,
        }}>
          {msg.typing ? (
            <TypingDots />
          ) : isUser ? (
            <span>{msg.content}</span>
          ) : (
            <div className="prose">
              {isEditing ? null : (
                <>
                  {/* Strip all email content from markdown — shown in DraftEmailCard below */}
                  <ReactMarkdown>
                    {isEmailResponse
                      ? msg.content
                          .replace(/###?\s*Draft Collection Email[\s\S]*/i, '')
                          .replace(/\*\*Subject:[\s\S]*/i, '')
                          .replace(/Subject:\s*.+[\s\S]*/i, '')
                          .replace(/Dear[\s\S]*/i, '')
                          .replace(/---[\s\S]*$/, '')
                          .trim()
                      : msg.content
                    }
                  </ReactMarkdown>

                  {/* Risk portfolio dashboard */}
                  {msg.intent === 'risk_portfolio' && msg.portfolioData?.length > 0 && (
                    <RiskDashboard data={msg.portfolioData} />
                  )}

                  {/* Account detail dashboard */}
                  {msg.intent === 'account_detail' && msg.customerData && (
                    <AccountDashboard data={msg.customerData} />
                  )}

                  {/* PTP dashboard — use frozen snapshot */}
                  {msg.intent === 'ptp' && snap && (
                    <PTPDashboard data={snap} />
                  )}

                  {/* WTP dashboard — use frozen snapshot */}
                  {msg.intent === 'wtp' && msg.portfolioData?.length > 0 && snap && (
                    <WTPDashboard data={[snap]} />
                  )}
                </>
              )}

              {/* Draft email card — enriched with real customer data */}
              {isEmailResponse && (
                <DraftEmailCard
                  content={extractEmailContent(msg.content)}
                  customer={snap}
                  isEditing={isEditing}
                  editedContent={editedContent}
                  onEditChange={setEditedContent}
                  onEdit={handleEdit}
                  onSend={handleSendEmail}
                  onCancel={() => setIsEditing(false)}
                />
              )}
            </div>
          )}
        </div>

        {!isUser && msg.insights && <InsightCards insights={msg.insights} />}
        {!isUser && msg.trace   && <AgentTrace    trace={msg.trace}     />}

        <div style={{
          fontSize: 10, color: 'var(--text-muted)', marginTop: 4,
          textAlign: isUser ? 'right' : 'left', paddingInline: 4,
        }}>
          {msg.time}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          flexShrink: 0, marginLeft: 10, marginTop: 2,
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
        }}>You</div>
      )}
    </div>
  )
}

// ── ChatInterface (main export) ────────────────────────────────────────────
export default function ChatInterface({ selectedCustomer,  initialQuery, placeholder }) {
  console.log('Rendering ChatInterface with selectedCustomer:', selectedCustomer, 'initialQuery:', initialQuery)

  // Per-customer message store: { 'C001': [...msgs], 'C002': [...msgs], 'global': [...] }
  const messagesMapRef = useRef({})
  const getKey         = (c) => c?.customer_id || 'global'

  const [messages,  setMessages]  = useState(() => {
    const key = getKey(selectedCustomer)
    return messagesMapRef.current[key] || [makeWelcomeMsg(key)]
  })
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showTrace, setShowTrace] = useState(false)

  const bottomRef    = useRef()
  const inputRef     = useRef()
  const lastQueryRef = useRef(null)
  const messagesRef  = useRef(messages)

  // Keep messagesRef in sync with state
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Persist messages to map on every change
  useEffect(() => {
    const key = getKey(selectedCustomer)
    if (messages.length > 0) messagesMapRef.current[key] = messages
  }, [messages, selectedCustomer?.customer_id])

  // When customer switches → load their saved history or show fresh welcome
  useEffect(() => {
    const key      = getKey(selectedCustomer)
    const existing = messagesMapRef.current[key]
    setMessages(existing || [makeWelcomeMsg(key)])
    lastQueryRef.current = null  // reset dedup so next initialQuery fires
  }, [selectedCustomer?.customer_id])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fire initialQuery when it changes (from WTP / Risk worklist buttons)
  useEffect(() => {
    if (!initialQuery) return
    if (lastQueryRef.current === initialQuery) return
    lastQueryRef.current = initialQuery
    send(initialQuery)
  }, [initialQuery])

  // ── Send message ─────────────────────────────────────────────────────
  const send = async (text) => {
    const query = (text || input).trim()
    if (!query || loading) return
    setInput('')

    const currentCustomerId = selectedCustomer?.customer_id || 'global'

    // Snapshot the customer NOW — frozen in this message forever
    const customerSnapshot = selectedCustomer ? { ...selectedCustomer } : null

    const userMsg = {
      role: 'user', content: query, time: now(),
      customerId:       currentCustomerId,
      snapshotCustomer: customerSnapshot,
    }
    const thinkMsg = {
      role: 'assistant', typing: true, time: now(),
      customerId:       currentCustomerId,
      snapshotCustomer: customerSnapshot,
    }

    setMessages(prev => [...prev, userMsg, thinkMsg])
    setLoading(true)

    try {
      const history = buildHistory(messagesRef.current, currentCustomerId)
      const res     = await api.chat(query, currentCustomerId, history)

      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role:             'assistant',
          content:          res.response,
          insights:         res.actionable_insights,
          trace:            res.agent_trace,
          portfolioData:    res.portfolio_data,
          intent:           res.intent,
          customerData:     res.customer_data,
          time:             now(),
          customerId:       currentCustomerId,
          snapshotCustomer: customerSnapshot,      // frozen — never changes
        }
      ])
    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role:             'assistant',
          content:          `Sorry, I encountered an error: **${e.message}**\n\nPlease check the Flask backend is running on port 5000.`,
          time:             now(),
          customerId:       currentCustomerId,
          snapshotCustomer: customerSnapshot,
        }
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-low)',
            boxShadow: '0 0 8px var(--risk-low)',
          }} />
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 15 }}>Collections Co-pilot</span>
          {selectedCustomer && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(79,142,247,0.1)', color: 'var(--accent-blue)',
              border: '1px solid rgba(79,142,247,0.2)',
            }}>
              {selectedCustomer.name}
            </span>
          )}
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={() => setShowTrace(t => !t)}
        >
          {showTrace ? 'Hide' : 'Show'} trace
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {messages.map((m, i) => (
          <Message
            key={`${m.customerId}-${i}`}
            msg={{ ...m, trace: showTrace ? m.trace : [] }}
            index={i}
            messages={messages}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions — only on fresh welcome state */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '5px 12px', fontSize: 11,
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--accent-blue)'; e.target.style.color = 'var(--accent-blue)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)';      e.target.style.color = 'var(--text-secondary)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', padding: '10px 12px',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onBlur={e  => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder={placeholder || 'Ask about your AR portfolio...'}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
              color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13,
              lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              background: input.trim() ? 'var(--accent-blue)' : 'var(--bg-hover)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
              color: '#fff', fontSize: 14, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {loading ? '⟳' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}