// src/components/ChatInterface.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api/client'
import RiskDashboard from './RiskDashboard'
import AccountDashboard from './AccountDashboard'
import WTPDashboard from './WTPDashboard'
import PTPDashboard from './Ptpdashboard'
import CustomerDetail from './CustomerDetail'
import AgentProcessLog, { useAgentStream } from './AgentProcessLog'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_LABELS = {
  intent_router:             'Intent Router',
  risk_assessment_agent:     'Risk Assessment',
  wtp_prioritisation_agent:  'WTP Priority',
  account_insight_agent:     'Account Intelligence',
  communication_agent:       'Communications',
  email_intent_agent:        'Email Intent',
  dispute_resolution_agent:  'Dispute Resolution',
  emerging_agents:           'Emerging Agents',
  escalation_agent:          'Escalation',
  ptp_tracking_agent:        'PTP Tracking',
  response_synthesiser:      'Response Synthesiser',
}

const SUGGESTIONS = [
  "Show me the full portfolio risk worklist",
  "Analyse Bharat Engineering Ltd account",
  "Draft a collection email for C002",
  "Escalate Deccan Fabricators — credit hold",
  "Show all promise-to-pay records and broken PTPs",
  "Which accounts need immediate action today?",
]

const LOG_WIDTH = 360

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const makeWelcomeMsg = (customerId) => ({
  role: 'assistant',
  content: `## Welcome to SAP AR Collections Co-pilot\n\nI have access to your **SAP S/4HANA FI-AR data** in real time. I can help you:\n\n- **Assess risk** across your full AR portfolio\n- **Deep-dive** any customer account with payment history, disputes, and credit position\n- **Draft communications** — emails, call scripts, WhatsApp messages\n- **Escalate** critical accounts with credit hold recommendations\n- **Track promises-to-pay** and flag broken commitments\n\nWhat would you like to work on today?`,
  time: now(),
  insights: [],
  trace: [],
  customerId,
})

const buildHistory = (messages, customerId) =>
  messages
    .filter(m => !m.typing && m.content && m.customerId === customerId)
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content }))

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent-blue)', opacity: 0.6,
          animation: `typingBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`@keyframes typingBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  )
}

function AgentTrace({ trace }) {
  if (!trace?.length) return null
  return (
    <div style={{
      marginTop: 8, padding: '8px 12px', background: 'var(--bg-input)',
      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Agent trace
      </div>
      {trace.map((t, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)', lineHeight: 1.8 }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>▸</span>{t}
        </div>
      ))}
    </div>
  )
}

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
            fontSize: 12, color: isUrgent ? 'var(--risk-critical)' : isWarn ? 'var(--risk-medium)' : 'var(--accent-blue)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}>{isUrgent ? '⚠' : isWarn ? '●' : '→'}</span>
            {ins}
          </div>
        )
      })}
    </div>
  )
}

function enrichEmailWithCustomerData(emailText, customer) {
  if (!customer || !emailText) return emailText
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  const dueDate = customer.oldest_item_days
    ? (() => { const d = new Date(); d.setDate(d.getDate() - customer.oldest_item_days); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) })()
    : null
  const overdueDays  = customer.oldest_item_days  || null
  const amount       = customer.total_open_inr     ? fmt(customer.total_open_inr) : null
  const contactName  = customer.name               || '[Recipient]'
  const payTerms     = customer.payment_terms      || 'Net 45'
  const invoiceCount = customer.open_invoice_count || ''
  const creditUsed   = customer.credit_used        ? fmt(customer.credit_used)   : null
  const creditLimit  = customer.credit_limit       ? fmt(customer.credit_limit)  : null

  let enriched = emailText
  enriched = enriched.replace(/\[Recipient Name\]/gi, contactName)
  enriched = enriched.replace(/\[recipient name\]/gi, contactName)
  enriched = enriched.replace(/Dear \[.*?\]/gi,       `Dear ${contactName} Team,`)
  enriched = enriched.replace(/\[amount\]/gi,          amount       || '[amount]')
  enriched = enriched.replace(/\[due date\]/gi,        dueDate      || '[due date]')
  enriched = enriched.replace(/\[overdue amount\]/gi,  amount       || '[overdue amount]')
  enriched = enriched.replace(/\[outstanding amount\]/gi, amount    || '[outstanding amount]')
  enriched = enriched.replace(/\[number of invoices?\]/gi, invoiceCount || '[invoice count]')
  enriched = enriched.replace(/\[payment terms?\]/gi,  payTerms)
  enriched = enriched.replace(/\[Your Name\]/gi,       'Collections Team')
  enriched = enriched.replace(/\[Your Position\]/gi,   'AR Collections')
  enriched = enriched.replace(/\[Your Contact Information\]/gi, 'collections@company.com')

  if (amount && !enriched.includes('Account Details:')) {
    const detailLines = [
      'Account Details:',
      `  • Total Outstanding  : ${amount}`,
      invoiceCount ? `  • Open Invoices      : ${invoiceCount}` : null,
      dueDate ? `  • Overdue Since      : ${dueDate}${overdueDays ? ` (${overdueDays} days ago)` : ''}` : null,
      `  • Payment Terms      : ${payTerms}`,
      creditUsed && creditLimit ? `  • Credit Utilisation : ${creditUsed} of ${creditLimit}` : null,
    ].filter(Boolean).join('\n')
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

function DraftEmailCard({ content, customer, onEdit, onSend, isEditing, editedContent, onEditChange, onCancel }) {
  const enriched     = enrichEmailWithCustomerData(content, customer)
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
  const rc  = riskColor[customer?.risk_band] || riskColor.medium
  const fmt = (n) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—'

  return (
    <div style={{ marginTop: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
      {customer && (
        <div style={{ padding: '8px 14px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{customer.name}</span>
          <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 20, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text, fontWeight: 600 }}>
            {(customer.risk_band || '').toUpperCase()} RISK
          </span>
          {customer.total_open_inr && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Outstanding: <strong style={{ color: 'var(--risk-critical)' }}>{fmt(customer.total_open_inr)}</strong></span>}
          {customer.open_invoice_count && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Invoices: <strong>{customer.open_invoice_count}</strong></span>}
          {customer.oldest_item_days && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Oldest: <strong style={{ color: 'var(--risk-medium)' }}>{customer.oldest_item_days}d overdue</strong></span>}
          {customer.payment_terms && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Terms: <strong>{customer.payment_terms}</strong></span>}
        </div>
      )}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Subject</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{subject}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={e => onEditChange(e.target.value)}
            rows={14}
            style={{ width: '100%', padding: '10px', fontSize: 12, background: 'var(--bg-input)', border: '1px solid var(--accent-blue)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', outline: 'none', resize: 'vertical', lineHeight: 1.7 }}
          />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            {body}
          </div>
        )}
        {!isEditing && customer && (customer.total_open_inr || customer.oldest_item_days) && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 'var(--radius-sm)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', gridColumn: '1/-1', marginBottom: 2 }}>📋 Account Summary</div>
            {customer.total_open_inr && <div style={{ fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Outstanding: </span><strong style={{ color: 'var(--risk-critical)' }}>{fmt(customer.total_open_inr)}</strong></div>}
            {customer.open_invoice_count && <div style={{ fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Open Invoices: </span><strong style={{ color: 'var(--text-primary)' }}>{customer.open_invoice_count}</strong></div>}
            {customer.oldest_item_days && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Overdue Since: </span>
                <strong style={{ color: 'var(--risk-medium)' }}>
                  {(() => { const d = new Date(); d.setDate(d.getDate() - customer.oldest_item_days); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) })()}
                  {' '}({customer.oldest_item_days} days)
                </strong>
              </div>
            )}
            {customer.payment_terms && <div style={{ fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Payment Terms: </span><strong style={{ color: 'var(--text-primary)' }}>{customer.payment_terms}</strong></div>}
            {customer.credit_used && customer.credit_limit && (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>Credit Used: </span>
                <strong style={{ color: customer.credit_utilization > 90 ? 'var(--risk-critical)' : 'var(--text-primary)' }}>
                  {fmt(customer.credit_used)} / {fmt(customer.credit_limit)} ({customer.credit_utilization}%)
                </strong>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
          {!isEditing ? (
            <>
              <button onClick={onEdit}  style={{ padding: '5px 14px', fontSize: 11, borderRadius: 6, background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}>✏️ Edit</button>
              <button onClick={onSend}  style={{ padding: '5px 14px', fontSize: 11, borderRadius: 6, background: 'var(--accent-teal)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>📤 Send Email</button>
            </>
          ) : (
            <>
              <button onClick={onCancel} style={{ padding: '5px 14px', fontSize: 11, borderRadius: 6, background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={onSend}   style={{ padding: '5px 14px', fontSize: 11, borderRadius: 6, background: 'var(--accent-teal)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>📤 Send Email</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Message({ msg, index, messages, showTrace }) {
  const isUser  = msg.role === 'user'
  const prevMsg = messages[index - 1]
  const snap    = msg.snapshotCustomer

  const isEmailResponse =
    msg.role === 'assistant' &&
    prevMsg?.role === 'user' &&
    prevMsg.content?.toLowerCase().includes('email')

  const [isEditing,     setIsEditing]     = useState(false)
  const [editedContent, setEditedContent] = useState('')

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
    setEditedContent(enrichEmailWithCustomerData(extractEmailContent(msg.content), snap))
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
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16, animation: 'fadeSlideUp 0.25s ease-out' }}>
      <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginRight: 10, marginTop: 2, background: 'linear-gradient(135deg,#4f8ef7,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>AI</div>
      )}

      <div style={{ maxWidth: '80%' }}>
        <div style={{ padding: isUser ? '10px 14px' : '14px 16px', borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px', background: isUser ? 'var(--accent-blue)' : 'var(--bg-card)', border: isUser ? 'none' : '1px solid var(--border)', color: isUser ? '#fff' : 'var(--text-primary)', fontSize: 13, lineHeight: 1.6 }}>
          {msg.typing ? (
            <TypingDots />
          ) : isUser ? (
            <span>{msg.content}</span>
          ) : (
            <div className="prose">
              {isEditing ? null : (
                <>
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
                  {msg.intent === 'risk_portfolio' && msg.portfolioData?.length > 0 && <RiskDashboard data={msg.portfolioData} />}
                  {msg.intent === 'account_detail' && msg.customerData && <AccountDashboard data={msg.customerData} />}
                  {msg.intent === 'ptp' && snap && <PTPDashboard data={snap} />}
                  {msg.intent === 'wtp' && msg.portfolioData?.length > 0 && snap && <WTPDashboard data={[snap]} />}
                </>
              )}
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
        {!isUser && showTrace && msg.trace && <AgentTrace trace={msg.trace} />}

        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: isUser ? 'right' : 'left', paddingInline: 4 }}>
          {msg.time}
        </div>
      </div>

      {isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginLeft: 10, marginTop: 2, background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>You</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING STATUS INDICATOR — shown while SSE is live
// ─────────────────────────────────────────────────────────────────────────────

function StreamingIndicator({ steps }) {
  const lastStep    = steps[steps.length - 1]
  const agentLabel  = lastStep ? (AGENT_LABELS[lastStep.agent] || lastStep.agent) : null

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'linear-gradient(135deg,#4f8ef7,#a78bfa)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>AI</div>

      <div style={{
        padding: '10px 14px', borderRadius: '4px 16px 16px 16px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {/* Animated bars */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 3, borderRadius: 2,
              background: 'var(--accent-blue)',
              animation: `barBounce 1s ${i * 0.15}s ease-in-out infinite alternate`,
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
            {agentLabel ? `Running ${agentLabel}` : 'Agents initialising…'}
          </span>
          {steps.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {steps.length} step{steps.length !== 1 ? 's' : ''} processed
            </span>
          )}
        </div>

        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'apl-pulse 0.9s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes barBounce { from{height:6px;opacity:0.4} to{height:18px;opacity:1} }
        @keyframes apl-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG DRAIN GUARD
// ─────────────────────────────────────────────────────────────────────────────
//
// FIX 1 — Response not showing:
//   Root causes:
//   a) AgentProcessLog can unmount (when user switches to Customer tab),
//      so onDrainComplete never fires → gate never commits.
//      Solution: keep AgentProcessLog always mounted; hide it with CSS
//      (display:none) instead of conditional rendering.
//
//   b) Stale closure in drainQueue's useCallback: the `isStreaming` dep
//      means a new `onDrainComplete` ref is created mid-drain, breaking
//      the callback chain. Solution: pass onDrainComplete via a stable
//      ref inside AgentProcessLog instead (see AgentProcessLog.jsx note),
//      and here we stabilise it with useCallback([]) + ref forwarding.
//
//   c) Race: tryCommit() in receiveFinal fires before drainedRef is set.
//      Already handled correctly. No change needed here.
//
// FIX 2 — LIVE badge in batch mode:
//   isLogDraining state was never cleared when switching to batch mode.
//   Solution: reset it explicitly when mode changes to 'batch'.
//
function useResponseGate() {
  const pendingRef   = useRef(null)
  const drainedRef   = useRef(false)

  const [isLogDraining,   setIsLogDraining]   = useState(false)
  const [committedResult, setCommittedResult] = useState(null)

  const tryCommit = useCallback(() => {
    if (pendingRef.current !== null && drainedRef.current) {
      const payload = pendingRef.current
      pendingRef.current  = null
      drainedRef.current  = false
      setIsLogDraining(false)
      setCommittedResult(payload)
    }
  }, [])

  const receiveFinal = useCallback((result) => {
    pendingRef.current = result
    drainedRef.current = false
    setIsLogDraining(true)
    tryCommit()
  }, [tryCommit])

  // Stable ref so AgentProcessLog always calls the latest version
  // without needing it as a prop dependency that causes re-renders
  const onDrainCompleteRef = useRef(null)
  const onDrainComplete = useCallback(() => {
    drainedRef.current = true
    tryCommit()
  }, [tryCommit])
  // eslint-disable-next-line react-hooks/refs
  onDrainCompleteRef.current = onDrainComplete

  // Stable wrapper — identity never changes, so AgentProcessLog's
  // drainQueue useCallback([]) can safely call it without going stale
  const stableOnDrainComplete = useCallback(() => {
    onDrainCompleteRef.current?.()
  }, [])

  const clearCommitted = useCallback(() => setCommittedResult(null), [])

  // FIX 2: expose a reset so batch mode can clear the draining state
  const resetDraining = useCallback(() => {
    pendingRef.current = null
    drainedRef.current = false
    setIsLogDraining(false)
  }, [])

  return {
    receiveFinal,
    onDrainComplete: stableOnDrainComplete,
    committedResult,
    clearCommitted,
    isLogDraining,
    resetDraining,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatInterface({ selectedCustomer, onDataUpdate, initialQuery, placeholder }) {

  // ── Per-customer message store ──────────────────────────────────────────
  const messagesMapRef = useRef({})
  const getKey         = (c) => c?.customer_id || 'global'

  const [messages,       setMessages]       = useState(() => {
    const key = getKey(selectedCustomer)
    return messagesMapRef.current[key] || [makeWelcomeMsg(key)]
  })
  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [showTrace,      setShowTrace]      = useState(false)
  const [showProcessLog, setShowProcessLog] = useState(true)
  const [rightPanelView, setRightPanelView] = useState('process_log')
  const [queryKey, setQueryKey] = useState(0)

  // ── Mode toggle: live (SSE stream) vs batch (single POST) ───────────────
  const [mode, setMode] = useState('live')

  // ── Agent stream hook (SSE) ─────────────────────────────────────────────
  const {
    steps, isStreaming, finalResult, streamError, currentQuery,
    startStream, stopStream, clearSteps,
  } = useAgentStream()

  // ── Response gate ────────────────────────────────────────────────────────
  const {
    receiveFinal,
    onDrainComplete,
    committedResult,
    clearCommitted,
    isLogDraining,
    resetDraining,
  } = useResponseGate()

  const bottomRef    = useRef()
  const inputRef     = useRef()
  const lastQueryRef = useRef(null)
  const messagesRef  = useRef(messages)

  useEffect(() => { messagesRef.current = messages }, [messages])

  // Persist messages per customer
  useEffect(() => {
    const key = getKey(selectedCustomer)
    if (messages.length > 0) messagesMapRef.current[key] = messages
  }, [messages, selectedCustomer?.customer_id])

  // Switch customer → restore messages
  useEffect(() => {
    const key      = getKey(selectedCustomer)
    const existing = messagesMapRef.current[key]
    setMessages(existing || [makeWelcomeMsg(key)])
    lastQueryRef.current = null 
  setQueryKey(k => k + 1)     
    lastQueryRef.current = null
  }, [selectedCustomer?.customer_id])

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle initialQuery
  useEffect(() => {
    if (!initialQuery) return
    if (lastQueryRef.current === initialQuery) return
    lastQueryRef.current = initialQuery
    send(initialQuery)
  }, [initialQuery])

  // ── FIX 2: When switching to batch mode, clear any stale draining state ──
  useEffect(() => {
    if (mode === 'batch') {
      resetDraining()
    }
  }, [mode, resetDraining])

  // ── SSE: when final event arrives, route through response gate ───────────
  useEffect(() => {
    if (!finalResult) return
    receiveFinal({
      result:           finalResult,
      customerId:       selectedCustomer?.customer_id || 'global',
      customerSnapshot: selectedCustomer ? { ...selectedCustomer } : null,
    })
  }, [finalResult])

  // ── SSE: errors bypass gate (show immediately) ───────────────────────────
  useEffect(() => {
    if (!streamError) return
    const currentCustomerId = selectedCustomer?.customer_id || 'global'
    const customerSnapshot  = selectedCustomer ? { ...selectedCustomer } : null
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `⚠ Stream error: ${streamError}. Please check your backend connection.`,
      insights: [], trace: [], time: now(),
      customerId: currentCustomerId,
      snapshotCustomer: customerSnapshot,
    }])
    setLoading(false)
    resetDraining()
  }, [streamError])

  // ── Committed result → append to messages ───────────────────────────────
  useEffect(() => {
    if (!committedResult) return
    const { result, customerId, customerSnapshot } = committedResult

    if (result.success !== false) {
      setMessages(prev => [...prev, {
        role:             'assistant',
        content:          result.response,
        insights:         result.actionable_insights || [],
        trace:            result.agent_trace         || [],
        portfolioData:    result.portfolio_data,
        intent:           result.intent,
        customerData:     result.customer_data,
        time:             now(),
        customerId,
        snapshotCustomer: customerSnapshot,
      }])
      if (result.portfolio_data || result.customer_data) {
        onDataUpdate?.({ portfolio_data: result.portfolio_data, customer_data: result.customer_data })
      }
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠ Agent error: ${result.error || 'Unknown error'}`,
        insights: [], trace: [], time: now(),
        customerId,
        snapshotCustomer: customerSnapshot,
      }])
    }
    setLoading(false)
    clearCommitted()
  }, [committedResult])

  // ─────────────────────────────────────────────────────────────────────────
  // SEND
  // ─────────────────────────────────────────────────────────────────────────

  const send = async (text) => {
    const query = (text || input).trim()
    if (!query || loading || isStreaming) return
    setInput('')

    const currentCustomerId = selectedCustomer?.customer_id || 'global'
    const customerSnapshot  = selectedCustomer ? { ...selectedCustomer } : null

    const userMsg = {
      role: 'user', content: query, time: now(),
      customerId: currentCustomerId,
      snapshotCustomer: customerSnapshot,
    }
    setMessages(prev => [...prev, userMsg])

    clearSteps()
    setQueryKey(k => k + 1)  
    setShowProcessLog(true)

    if (mode === 'live') {
      await startStream(query, {
        customer_id: currentCustomerId,
        history: buildHistory(messagesRef.current, currentCustomerId),
      })
    } else {
      setLoading(true)
      try {
        const res  = await fetch('http://172.16.0.177:5000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            customer_id: currentCustomerId,
            history: buildHistory(messagesRef.current, currentCustomerId),
          }),
        })
        const data = await res.json()

        if (data.success !== false) {
          setMessages(prev => [...prev, {
            role:             'assistant',
            content:          data.response,
            insights:         data.actionable_insights || [],
            trace:            data.agent_trace         || [],
            portfolioData:    data.portfolio_data,
            intent:           data.intent,
            customerData:     data.customer_data,
            time:             now(),
            customerId:       currentCustomerId,
            snapshotCustomer: customerSnapshot,
          }])
          if (data.portfolio_data || data.customer_data) {
            onDataUpdate?.({ portfolio_data: data.portfolio_data, customer_data: data.customer_data })
          }
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠ Error: ${data.error || 'Unknown error'}`,
            insights: [], trace: [], time: now(),
            customerId: currentCustomerId,
            snapshotCustomer: customerSnapshot,
          }])
        }
      } catch (err) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠ Request failed: ${err.message}`,
          insights: [], trace: [], time: now(),
          customerId: currentCustomerId,
          snapshotCustomer: customerSnapshot,
        }])
      } finally {
        setLoading(false)
      }
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isBusy = loading || isStreaming || isLogDraining

  // Only show LIVE badge in live mode AND actually draining
  const showLiveBadge = mode === 'live' && isLogDraining

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes stepIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes apl-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* ── LEFT: chat panel ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-low)', boxShadow: '0 0 8px var(--risk-low)' }} />
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 15 }}>Collections Co-pilot</span>
            {selectedCustomer && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(79,142,247,0.2)' }}>
                {selectedCustomer.name}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

            {/* Mode toggle */}
            <div style={{
              display: 'flex', borderRadius: 20, overflow: 'hidden',
              border: '1px solid var(--border)', flexShrink: 0,
            }}>
              {['live', 'batch'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    fontSize: 10, padding: '3px 10px', cursor: 'pointer', border: 'none',
                    background: mode === m
                      ? m === 'live' ? 'rgba(34,197,94,0.15)' : 'rgba(79,142,247,0.15)'
                      : 'var(--bg-input)',
                    color: mode === m
                      ? m === 'live' ? '#22c55e' : 'var(--accent-blue)'
                      : 'var(--text-muted)',
                    fontWeight: mode === m ? 700 : 400,
                    display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.2s',
                  }}
                >
                  {m === 'live' && (
                    <span style={{
                      display: 'inline-block', width: 5, height: 5,
                      borderRadius: '50%', background: '#22c55e',
                      animation: mode === 'live' ? 'pulse 1s ease-in-out infinite' : 'none',
                    }} />
                  )}
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Process log toggle */}
            <button onClick={() => setShowProcessLog(!showProcessLog)} style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
              background: showProcessLog ? 'rgba(79,142,247,0.12)' : 'var(--bg-input)',
              color: showProcessLog ? 'var(--accent-blue)' : 'var(--text-muted)',
              border: `1px solid ${showProcessLog ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`,
            }}>
              {showProcessLog ? '◧ Hide log' : '◧ Show log'}
            </button>

            {/* Trace toggle */}
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20 }} onClick={() => setShowTrace(t => !t)}>
              {showTrace ? 'Hide' : 'Show'} trace
            </button>
          </div>
        </div>

        {/* Mode banner */}
        {mode === 'batch' && (
          <div style={{
            padding: '5px 20px', background: 'rgba(79,142,247,0.07)',
            borderBottom: '1px solid rgba(79,142,247,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 10, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
              BATCH MODE — no live agent log · single request/response
            </span>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          {messages.map((m, i) => (
            <Message
              key={`${m.customerId}-${i}`}
              msg={m}
              index={i}
              messages={messages}
              showTrace={showTrace}
            />
          ))}

          {/* Live streaming indicator */}
          {isStreaming && mode === 'live' && (
            <StreamingIndicator steps={steps} />
          )}

          {/* Batch loading indicator */}
          {loading && mode === 'batch' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>AI</div>
              <div style={{ padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <TypingDots />
              </div>
            </div>
          )}

          {/* Log draining indicator — SSE done but log still revealing */}
          {!isStreaming && isLogDraining && mode === 'live' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>AI</div>
              <div style={{ padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, animation: 'spin 1s linear infinite', color: 'var(--accent-blue)' }}>⟳</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Finalising agent log…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20,
                padding: '5px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
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
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', padding: '10px 12px', transition: 'border-color 0.15s',
          }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onBlur={e  => e.currentTarget.style.borderColor = 'var(--border)'}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder={placeholder || (mode === 'batch' ? 'Ask anything (batch mode)…' : 'Ask about your AR portfolio…')}
              disabled={isBusy}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            />
            <button
              onClick={() => isStreaming ? stopStream() : send()}
              disabled={!isStreaming && (!input.trim() || isBusy)}
              style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: isStreaming ? 'rgba(239,68,68,0.15)' : input.trim() ? 'var(--accent-blue)' : 'var(--bg-hover)',
                border: 'none', cursor: isStreaming || (input.trim() && !isBusy) ? 'pointer' : 'not-allowed',
                color: isStreaming ? 'var(--risk-critical)' : '#fff', fontSize: 14, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isStreaming ? '■' : loading ? '⟳' : '↑'}
            </button>
          </div>

          {/* Mode hint */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {mode === 'live'
                ? '● LIVE — streaming with agent log'
                : '● BATCH — single request, no log'}
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Process log + Customer panel ──────────────────────────── */}
      {/*
       * FIX 1 (unmount bug): AgentProcessLog MUST stay mounted at all times
       * so its internal drain queue can always fire onDrainComplete.
       * We use display:none to hide it visually instead of unmounting it.
       * The Customer tab is shown on top via the same technique.
       */}
      {showProcessLog && (
        <div style={{
          width: LOG_WIDTH, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: 'var(--bg-base)',
        }}>

          {/* Toggle tabs */}
          <div style={{
            display: 'flex', padding: 8, gap: 6,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-card)', flexShrink: 0,
          }}>
            <button
              onClick={() => setRightPanelView('process_log')}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: rightPanelView === 'process_log' ? '1px solid rgba(79,142,247,0.35)' : '1px solid var(--border)',
                background: rightPanelView === 'process_log' ? 'rgba(79,142,247,0.12)' : 'var(--bg-input)',
                color: rightPanelView === 'process_log' ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 600,
              }}
            >
              Process Log
              {/* FIX 2: only show LIVE badge when mode is live AND draining */}
              {showLiveBadge && (
                <span style={{
                  marginLeft: 5, fontSize: 9, padding: '1px 5px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  animation: 'pulse 1s ease-in-out infinite',
                }}>LIVE</span>
              )}
            </button>

            <button
              onClick={() => setRightPanelView('customer')}
              disabled={!selectedCustomer}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6,
                cursor: selectedCustomer ? 'pointer' : 'not-allowed', opacity: selectedCustomer ? 1 : 0.5,
                border: rightPanelView === 'customer' ? '1px solid rgba(45,212,191,0.35)' : '1px solid var(--border)',
                background: rightPanelView === 'customer' ? 'rgba(45,212,191,0.12)' : 'var(--bg-input)',
                color: rightPanelView === 'customer' ? 'var(--accent-teal)' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 600,
              }}
            >
              Customer
            </button>
          </div>

          {/* Panel content — both children stay mounted; toggled via display */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

            {/* AgentProcessLog — always mounted, hidden when customer tab is active */}
            <div style={{
              position: 'absolute', inset: 0,
              display: rightPanelView === 'process_log' ? 'flex' : 'none',
              flexDirection: 'column', overflow: 'hidden',
            }}>
              <AgentProcessLog
                steps={steps}
                isStreaming={isStreaming}
                query={currentQuery}
                queryKey={queryKey}
                onClear={clearSteps}
                onDrainComplete={onDrainComplete}
              />
            </div>

            {/* CustomerDetail — only rendered when a customer is selected */}
            <div style={{
              position: 'absolute', inset: 0,
              display: rightPanelView === 'customer' && selectedCustomer ? 'flex' : 'none',
              flexDirection: 'column', overflow: 'hidden',
            }}>
              {selectedCustomer && (
                <CustomerDetail customer={selectedCustomer} onChat={send} />
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
