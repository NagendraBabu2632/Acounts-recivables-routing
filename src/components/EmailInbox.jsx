// src/components/EmailInbox.jsx — Scenario 3: Intelligent Inbox & Auto-Response
import { useState, useEffect } from 'react'
import { api } from '../api/client'
import ReactMarkdown from 'react-markdown'
import CustomerDetail from './CustomerDetail'

const INTENT_META = {
  invoice_request:      { label:'Invoice Request',   color:'var(--accent-teal)',   bg:'rgba(45,212,191,0.1)' },
  payment_delay_notice: { label:'Payment Delay',     color:'var(--risk-high)',     bg:'rgba(249,115,22,0.1)' },
  dispute_notification: { label:'Dispute',           color:'var(--risk-critical)', bg:'rgba(239,68,68,0.1)' },
  statement_request:    { label:'Statement Request', color:'var(--accent-blue)',   bg:'rgba(79,142,247,0.1)' },
  callback_request:     { label:'Callback Request',  color:'var(--accent-purple)', bg:'rgba(167,139,250,0.1)' },
  general_query:        { label:'General Query',     color:'var(--text-secondary)',bg:'var(--bg-surface)' },
}

function IntentBadge({ intent }) {
  const m = INTENT_META[intent] || INTENT_META.general_query
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20,
      background: m.bg, color: m.color,
      border: `1px solid ${m.color}33`, fontWeight: 500
    }}>
      {m.label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractEmailContent(content) {
  if (!content) return ''

  const draftSection = content.match(/(?:drafted\s+response|draft(?:ed)?\s+(?:email|reply))[\s\S]*?```(?:markdown)?\s*([\s\S]*?)```/i)
  if (draftSection) return draftSection[1].trim()

  const fenceBlock = content.match(/```(?:markdown)?\s*([\s\S]*?)```/i)
  if (fenceBlock) return fenceBlock[1].trim()

  const sectionMatch = content.match(/## Draft[\s\S]*/i)
  let emailPart = sectionMatch ? sectionMatch[0] : content
  emailPart = emailPart.replace(/## Draft.*\n/i, '')
  emailPart = emailPart.replace(/(IMMEDIATE ACTIONS|NEXT STEPS|ACTION ITEMS):[\s\S]*/i, '')
  emailPart = emailPart.replace(/\*\*/g, '')
  return emailPart.trim()
}

function extractSubjectAndBody(content) {
  const subjectMatch =
    content.match(/\*\*Subject:\*\*\s*(.+)/) ||
    content.match(/Subject:\s*(.+)/)
  const subject = subjectMatch ? subjectMatch[1].trim() : 'Payment Reminder'

  const bodyMatch = content.match(/Dear[\s\S]*/)
  const body = bodyMatch ? bodyMatch[0] : content

  return { subject, body }
}

// ─── Drafted-reply card with Edit + Send ──────────────────────────────────────

function DraftedReplyCard({ responseText }) {
  const [isEditing, setIsEditing]  = useState(false)
  const [editedContent, setEdited] = useState('')
  const [sending, setSending]      = useState(false)

  const handleEdit = () => {
    setEdited(extractEmailContent(responseText))
    setIsEditing(true)
  }

  const handleSendEmail = async () => {
    setSending(true)
    try {
      const raw = isEditing ? editedContent : extractEmailContent(responseText)
      setIsEditing(false)

      const { subject, body } = extractSubjectAndBody(raw)

      const payload = {
        subject,
        msg: body,
        mail: 'kishore.valluri@carbynetech.com',
      }

      console.log('📤 Sending email:', payload)

      const res = await fetch('http://172.16.0.177:5000/api/sendemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      alert(data.message || 'Email sent successfully!')
    } catch (err) {
      console.error('❌ Email send failed:', err)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        AI-Drafted Reply
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(79,142,247,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
      }}>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={e => setEdited(e.target.value)}
            style={{
              width: '100%',
              minHeight: 280,
              fontSize: 12,
              borderRadius: 6,
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              padding: 10,
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-ui)',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.7,
            }}
          />
        ) : (
          <div className="prose">
            <ReactMarkdown>{responseText}</ReactMarkdown>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
          {!isEditing ? (
            <>
              <button
                onClick={handleEdit}
                style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: 6,
                  background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: 6,
                  background: '#496662', color: '#fff',
                  border: 'none', cursor: 'pointer', opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: 6,
                  background: '#e5e7eb', border: 'none', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: 6,
                  background: '#496662', color: '#fff',
                  border: 'none', cursor: 'pointer', opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function EmailInbox({ onChat, onSelectCustomer }) {
  const [emails,     setEmails]     = useState([])
  const [selected,   setSelected]   = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [processing, setProcessing] = useState(null)
  const [results,    setResults]    = useState({})
  const [filter,     setFilter]     = useState('unread')

  // 'ai' | 'account' | null  — only one panel visible at a time
  const [activePanel, setActivePanel] = useState(null)

  const loadEmails = () => {
    setLoading(true)
    api.emails(filter)
      .then(r => setEmails(r.emails || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadEmails() }, [filter])

  const processEmail = async (email) => {
    // Switch to AI panel immediately so the spinner shows
    setActivePanel('ai')
    setProcessing(email.email_id)
    try {
      const r = await api.chat(
        `Process this incoming customer email and generate an intelligent auto-reply. Identify the intent, retrieve any needed SAP data, and draft a complete personalised response.\n\nFrom: ${email.customer_name} <${email.from}>\nSubject: ${email.subject || '(no subject)'}\nBody:\n${email.body}`,
        { customerId: email.customer_id, emailId: email.email_id }
      )
      setResults(prev => ({ ...prev, [email.email_id]: r }))
      setEmails(prev => prev.map(e =>
        e.email_id === email.email_id
          ? { ...e, status: 'read', auto_reply_sent: true }
          : e
      ))
    } catch (e) { console.error(e) }
    finally { setProcessing(null) }
  }

  const unread = emails.filter(e => e.status === 'unread')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── List panel ── */}
      <div style={{ width: 290, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 13 }}>Smart Inbox</span>
              {unread.length > 0 && (
                <span style={{ fontSize: 10, background: 'var(--accent-blue)', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                  {unread.length}
                </span>
              )}
            </div>
            <button onClick={loadEmails} className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}>↻</button>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {['unread', 'all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '4px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                background: filter === f ? 'rgba(79,142,247,0.15)' : 'transparent',
                color: filter === f ? 'var(--accent-blue)' : 'var(--text-muted)',
                border: `1px solid ${filter === f ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`,
              }}>
                {f === 'unread' ? `Unread (${unread.length})` : `All (${emails.length})`}
              </button>
            ))}
          </div>

          <button
            onClick={() => unread[0] && processEmail(unread[0])}
            disabled={!!processing || unread.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '6px 0' }}
          >
            {processing ? '⟳ Processing…' : `AI Process Next (${unread.length} unread)`}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading…</div>
          )}
          {emails.map(e => (
            <div
              key={e.email_id}
              onClick={() => {
                setSelected(e)
                setActivePanel(null)   // reset panel when switching emails
              }}
              style={{
                padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s',
                background: selected?.email_id === e.email_id ? 'var(--bg-hover)' : e.status === 'unread' ? 'rgba(79,142,247,0.03)' : 'transparent',
                borderLeft: `3px solid ${selected?.email_id === e.email_id ? 'var(--accent-blue)' : e.status === 'unread' ? 'rgba(79,142,247,0.5)' : 'transparent'}`,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {e.status === 'unread' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-blue)' }} />}
                  <span style={{ fontSize: 12, fontWeight: e.status === 'unread' ? 600 : 400 }}>{e.customer_name}</span>
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  {new Date(e.received_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.subject || '(no subject)'}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {e.intent && <IntentBadge intent={e.intent} />}
                {e.auto_reply_sent && (
                  <span style={{ fontSize: 9, color: 'var(--risk-low)', padding: '1px 6px', background: 'rgba(34,197,94,0.08)', borderRadius: 10 }}>
                    Auto-replied ✓
                  </span>
                )}
                {processing === e.email_id && (
                  <span style={{ fontSize: 9, color: 'var(--accent-blue)' }}>Processing…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36 }}>✉</div>
            <div style={{ fontSize: 13 }}>Select an email</div>
            <div style={{ fontSize: 11, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
              The AI Email Agent reads unstructured text, identifies intent, retrieves SAP data, and auto-replies in under 90 seconds.
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{selected.subject || '(no subject)'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    From <span style={{ color: 'var(--accent-blue)' }}>{selected.from}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
                    {new Date(selected.received_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    {selected.intent && <IntentBadge intent={selected.intent} />}
                    {selected.auto_reply_sent && (
                      <span style={{ fontSize: 10, color: 'var(--risk-low)', padding: '2px 8px', background: 'rgba(34,197,94,0.1)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.25)' }}>
                        Auto-replied ✓
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {/* View Account — toggles account panel, clears AI panel */}
                  <button
                    onClick={() => {
                      const c = { customer_id: selected.customer_id, name: selected.customer_name }
                      onSelectCustomer?.(c)
                      setActivePanel(prev => prev === 'account' ? null : 'account')
                    }}
                    className="btn btn-ghost"
                    style={{
                      fontSize: 11, padding: '5px 10px',
                      background: activePanel === 'account' ? 'rgba(79,142,247,0.12)' : undefined,
                      color: activePanel === 'account' ? 'var(--accent-blue)' : undefined,
                    }}
                  >
                    {activePanel === 'account' ? 'Hide account' : 'View account'}
                  </button>

                  {/* AI Process & Reply — always switches to AI panel */}
                  <button
                    onClick={() => processEmail(selected)}
                    disabled={!!processing}
                    className="btn btn-primary"
                    style={{ fontSize: 11, padding: '5px 12px' }}
                  >
                    {processing === selected.email_id ? 'Processing…' : 'AI Process & Reply'}
                  </button>
                </div>
              </div>
            </div>

            {/* Email body */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontStyle: 'italic' }}>
                "{selected.body}"
              </div>
            </div>

            {/* ── Main content area: AI result OR account panel ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── AI Result panel ── */}
              {activePanel === 'ai' && (
                <div style={{ padding: '14px 18px' }}>

                  {/* Loading spinner */}
                  {processing === selected.email_id && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, color: 'var(--text-muted)' }}>
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <div style={{ fontSize: 28, animation: 'spin 1s linear infinite' }}>⟳</div>
                      <div style={{ fontSize: 13, color: 'var(--accent-blue)' }}>AI Email Agent working…</div>
                      <div style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.8 }}>
                        Identifying intent · Querying SAP OData · Fetching invoice data · Drafting personalised reply
                      </div>
                    </div>
                  )}

                  {/* AI result */}
                  {results[selected.email_id] && !processing && (
                    <div>
                      {/* Agent trace */}
                      <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agent trace</div>
                        {results[selected.email_id].agent_trace?.map((t, i) => (
                          <div key={i} style={{ fontSize: 11, color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)', lineHeight: 1.8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>▸ </span>{t}
                          </div>
                        ))}
                      </div>

                      {/* Actionable insights */}
                      {results[selected.email_id].actionable_insights?.map((ins, i) => (
                        <div key={i} style={{
                          marginBottom: 5, padding: '6px 12px',
                          background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)',
                          borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent-blue)',
                        }}>
                          → {ins}
                        </div>
                      ))}

                      {/* Drafted reply */}
                      <DraftedReplyCard
                        responseText={results[selected.email_id].response}
                        customerName={selected.customer_name}
                      />

                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => onChat(`What other actions should I take based on this email from ${selected.customer_name}?`)}
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: '5px 12px' }}
                        >
                          Ask Co-pilot more
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Account detail panel ── */}
              {activePanel === 'account' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' , overflow: 'auto' }}>
                  <div style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Account Details — {selected.customer_name}</span>
                    <button
                      onClick={() => setActivePanel(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <CustomerDetail
                      customer={{ customer_id: selected.customer_id, name: selected.customer_name }}
                      onChat={q => onChat?.(q)}
                    />
                  </div>
                </div>
              )}

              {/* ── Empty state (no panel active) ── */}
              {activePanel === null && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingTop: 40 }}>
                  Click <strong>AI Process &amp; Reply</strong> to analyse this email and generate a response,
                  or <strong>View account</strong> to see customer details.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}