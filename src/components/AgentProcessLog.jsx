// src/components/AgentProcessLog.jsx
// Queue-based animated ReAct log — steps always reveal ONE BY ONE with delays,
// even if the entire batch arrives instantly from SSE.

import { useState, useEffect, useRef, useCallback } from 'react'

const STEP_META = {
  agent_start:  { icon: '◉', label: 'Start',   color: '#4f8ef7', bg: 'rgba(79,142,247,0.1)',  border: 'rgba(79,142,247,0.3)' },
  thought:      { icon: '◆', label: 'Thought',  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
  action:       { icon: '▶', label: 'Action',   color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)',  border: 'rgba(45,212,191,0.3)' },
  observation:  { icon: '●', label: 'Observe',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  result:       { icon: '✓', label: 'Result',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)' },
  agent_end:    { icon: '◎', label: 'Done',     color: '#4f8ef7', bg: 'rgba(79,142,247,0.06)', border: 'rgba(79,142,247,0.2)' },
}

const AGENT_COLORS = {
  intent_router:             '#4f8ef7',
  risk_assessment_agent:     '#ef4444',
  wtp_prioritisation_agent:  '#a78bfa',
  account_insight_agent:     '#2dd4bf',
  communication_agent:       '#f59e0b',
  email_intent_agent:        '#f97316',
  dispute_resolution_agent:  '#ef4444',
  emerging_agents:           '#22c55e',
  escalation_agent:          '#ef4444',
  ptp_tracking_agent:        '#6b7280',
  response_synthesiser:      '#a78bfa',
}

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

const STEP_REVEAL_DELAY = {
  agent_start:  400,
  thought:      950,
  action:       600,
  observation:  750,
  result:       850,
  agent_end:    500,
}

// ── Typewriter hook ────────────────────────────────────────────────────────
function useTypewriter(text) {
  const [out, setOut]   = useState('')
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setOut('')
    setDone(false)
    clearTimeout(timerRef.current)
    if (!text) { setDone(true); return }

    let i = 0
    const total    = text.length
    const chunkPer = Math.max(1, Math.floor(total / 50))

    const tick = () => {
      i = Math.min(i + chunkPer, total)
      setOut(text.slice(0, i))
      if (i < total) {
        timerRef.current = setTimeout(tick, 16)
      } else {
        setDone(true)
      }
    }
    timerRef.current = setTimeout(tick, 60)
    return () => clearTimeout(timerRef.current)
  }, [text])

  return [out, done]
}

// ── Single step row ────────────────────────────────────────────────────────
function StepRow({ step, isLast }) {
  const meta = STEP_META[step.type] || STEP_META.observation
  const [text, typeDone] = useTypewriter(step.content)
  const [expanded, setExpanded] = useState(false)
  const hasToolResult = step.tool_result && step.tool_result.length > 0

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '5px 0',
      opacity: 0,
      animation: 'apl-in 0.38s ease-out forwards',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          background: meta.bg, border: `1.5px solid ${meta.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: meta.color, fontWeight: 700,
        }}>
          {meta.icon}
        </div>
        {!isLast && (
          <div style={{
            width: 1, flex: 1, minHeight: 10, background: 'var(--border)', marginTop: 3,
            transformOrigin: 'top',
            animation: 'apl-line 0.45s ease-out 0.25s both',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.07em', padding: '1px 5px',
            borderRadius: 3, background: meta.bg, color: meta.color,
            border: `1px solid ${meta.border}`, flexShrink: 0, fontFamily: 'var(--font-mono)',
          }}>
            {meta.label.toUpperCase()}
          </span>
          {step.tool_name && (
            <span style={{
              fontSize: 8, padding: '1px 5px', borderRadius: 3,
              background: 'var(--bg-input)', color: 'var(--text-muted)',
              border: '1px solid var(--border)', fontFamily: 'var(--font-mono)',
            }}>
              {step.tool_name}
            </span>
          )}
          {step.duration_ms != null && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {step.duration_ms < 1000 ? `${step.duration_ms}ms` : `${(step.duration_ms / 1000).toFixed(1)}s`}
            </span>
          )}
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(step.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div style={{
          fontSize: 11, lineHeight: 1.7, padding: '5px 8px', borderRadius: 5,
          color: 'var(--text-secondary)',
          fontFamily: step.type === 'thought' ? 'var(--font-ui)' : 'var(--font-mono)',
          background: step.type === 'thought' ? 'rgba(167,139,250,0.06)'
                    : step.type === 'result'  ? 'rgba(34,197,94,0.06)'
                    : 'transparent',
          border: step.type === 'thought' ? '1px solid rgba(167,139,250,0.18)'
                : step.type === 'result'  ? '1px solid rgba(34,197,94,0.22)'
                : 'none',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 16,
        }}>
          {text}
          {!typeDone && (
            <span style={{
              display: 'inline-block', width: 2, height: 11,
              background: meta.color, marginLeft: 1,
              verticalAlign: 'text-bottom',
              animation: 'apl-blink 0.6s step-end infinite',
            }} />
          )}
        </div>

        {hasToolResult && (
          <div style={{ marginTop: 4 }}>
            <button onClick={() => setExpanded(e => !e)} style={{
              fontSize: 9, color: 'var(--text-muted)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 8 }}>{expanded ? '▼' : '▶'}</span>
              {expanded ? 'Hide' : 'Show'} output ({step.tool_result.length} chars)
            </button>
            {expanded && (
              <pre style={{
                fontSize: 9, color: 'var(--text-muted)', background: 'var(--bg-input)',
                border: '1px solid var(--border)', borderRadius: 4, padding: '5px 7px',
                overflow: 'auto', maxHeight: 100, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                fontFamily: 'var(--font-mono)', lineHeight: 1.5, margin: 0,
              }}>
                {(() => { try { return JSON.stringify(JSON.parse(step.tool_result), null, 2).slice(0, 600) } catch { return step.tool_result.slice(0, 400) } })()}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Agent section ──────────────────────────────────────────────────────────
function AgentSection({ agentName, steps, isActive }) {
  const color   = AGENT_COLORS[agentName] || '#4f8ef7'
  const label   = AGENT_LABELS[agentName] || agentName
  const endStep = steps.find(s => s.type === 'agent_end')
  const isDone  = !!endStep

  return (
    <div style={{ marginBottom: 10, animation: 'apl-agent 0.4s ease-out both' }}>
     <div style={{
  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px',
  background: 'var(--bg-surface)',    // solid background — no bleed-through
  borderRadius: 8, border: `1px solid ${color}28`,
  marginBottom: 6, position: 'sticky', top: 0, zIndex: 1,
}}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isDone ? '#22c55e' : color,
          animation: isActive && !isDone ? 'apl-pulse 1s ease-in-out infinite' : 'none',
          transition: 'background 0.5s',
        }} />
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.03em', fontFamily: 'var(--font-head)' }}>
          {label}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
          {agentName}
        </span>
        <div style={{ flex: 1 }} />
        {isActive && !isDone && (
          <span style={{ fontSize: 9, color, fontFamily: 'var(--font-mono)', animation: 'apl-pulse 1.5s ease-in-out infinite' }}>
            running…
          </span>
        )}
        {isDone && endStep.duration_ms && (
          <span style={{ fontSize: 9, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
            ✓ {endStep.duration_ms < 1000 ? `${endStep.duration_ms}ms` : `${(endStep.duration_ms / 1000).toFixed(1)}s`}
          </span>
        )}
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {steps.length} steps
        </span>
      </div>

      {isActive && !isDone && (
        <div style={{ height: 2, borderRadius: 1, overflow: 'hidden', background: `${color}20`, marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 1, background: color, animation: 'apl-scan 1.6s ease-in-out infinite' }} />
        </div>
      )}

      <div style={{ paddingLeft: 6 }}>
        {steps.map((step, i) => (
          <StepRow key={step._uid} step={step} isLast={i === steps.length - 1} />
        ))}
      </div>
    </div>
  )
}

// ── Main AgentProcessLog ───────────────────────────────────────────────────
export default function AgentProcessLog({
  steps = [],
  isStreaming = false,
  query = '',
   queryKey = 0, 
  onClear,
  onDrainComplete,   // ← called when queue fully empties; stored in a ref internally
}) {
  const [visibleSteps, setVisibleSteps] = useState([])

  // ── All mutable drain state lives in refs so timers never see stale closures
  const queueRef     = useRef([])
  const timerRef     = useRef(null)
  const revealingRef = useRef(false)
  const seenUidsRef  = useRef(new Set())

  // KEY FIX: store onDrainComplete in a ref so drainQueue never has it
  // as a dependency — the callback identity can change every render in the
  // parent (ChatInterface) without breaking the drain loop here.
  const onDrainCompleteRef = useRef(onDrainComplete)
  useEffect(() => {
    onDrainCompleteRef.current = onDrainComplete
  }, [onDrainComplete])

  // Also track isStreaming in a ref for the same reason
  const isStreamingRef = useRef(isStreaming)
  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  // Reset log when a new query starts
useEffect(() => {
  if (queryKey === 0) return
  clearTimeout(timerRef.current)
  queueRef.current     = []
  seenUidsRef.current  = new Set()
  revealingRef.current = false
  setVisibleSteps([])
}, [queryKey])

  const bottomRef = useRef()
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter,     setFilter]     = useState('all')

  // ── Drain loop — STABLE: no props in dependency array ───────────────────
  // All prop access goes through refs so this callback is created ONCE and
  // the recursive setTimeout chain never breaks due to identity changes.
  const drainQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      revealingRef.current = false
      // Signal parent — always read latest ref value
      if (!isStreamingRef.current) {
        onDrainCompleteRef.current?.()
      }
      return
    }

    revealingRef.current = true
    const next = queueRef.current.shift()
    setVisibleSteps(prev => [...prev, next])

    const delay = STEP_REVEAL_DELAY[next.type] || 600

    timerRef.current = setTimeout(() => {
      if (queueRef.current.length === 0) {
        revealingRef.current = false
        if (!isStreamingRef.current) {
          onDrainCompleteRef.current?.()
        }
        return
      }
      // eslint-disable-next-line react-hooks/immutability
      drainQueue()
    }, delay)
  }, []) // ← intentionally empty — all values accessed via refs

  // ── When SSE finishes (isStreaming flips false) and queue is already empty,
  //    fire onDrainComplete immediately. Covers the edge case where all steps
  //    arrived and drained before isStreaming became false.
  useEffect(() => {
    if (!isStreaming && !revealingRef.current && queueRef.current.length === 0 && visibleSteps.length > 0) {
      onDrainCompleteRef.current?.()
    }
  }, [isStreaming]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enqueue new steps from SSE ───────────────────────────────────────────
  useEffect(() => {
    let anyNew = false
    for (const step of steps) {
      if (!seenUidsRef.current.has(step._uid)) {
        seenUidsRef.current.add(step._uid)
        queueRef.current.push(step)
        anyNew = true
      }
    }
    if (anyNew && !revealingRef.current) {
      drainQueue()
    }
  }, [steps, drainQueue])

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleSteps.length, autoScroll])

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    clearTimeout(timerRef.current)
    queueRef.current     = []
    seenUidsRef.current  = new Set()
    revealingRef.current = false
    setVisibleSteps([])
    onClear?.()
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredSteps = filter === 'all'
    ? visibleSteps
    : visibleSteps.filter(s => s.type === filter || s.type === 'agent_start' || s.type === 'agent_end')

  // ── Group by agent ───────────────────────────────────────────────────────
  const groups = []
  let cur = null
  for (const step of filteredSteps) {
    if (step.type === 'agent_start' || !cur || cur.agent !== step.agent) {
      cur = { agent: step.agent, steps: [step], isActive: true }
      groups.push(cur)
    } else {
      cur.steps.push(step)
    }
    if (step.type === 'agent_end') cur.isActive = false
  }

  const pendingCount = queueRef.current.length
  if ((isStreaming || revealingRef.current || pendingCount > 0) && groups.length > 0) {
    groups[groups.length - 1].isActive = true
  }

  const totalAgents     = groups.length
  const completedAgents = groups.filter(g => !g.isActive).length
  const currentAgent    = groups.length > 0 ? groups[groups.length - 1].agent : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-surface)' }}>

      <style>{`
        @keyframes apl-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes apl-agent { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes apl-line  { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes apl-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes apl-spin  { to{transform:rotate(360deg)} }
        @keyframes apl-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes apl-scan  { 0%{width:0%;margin-left:0%} 50%{width:40%;margin-left:30%} 100%{width:0%;margin-left:100%} }
      `}</style>

      {/* Header */}
      <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>
              ReAct Process Log
            </span>
            {(isStreaming || revealingRef.current || pendingCount > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'apl-pulse 0.9s ease-in-out infinite' }} />
                <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>LIVE</span>
              </div>
            )}
            {!isStreaming && !revealingRef.current && pendingCount === 0 && visibleSteps.length > 0 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {visibleSteps.length} steps · {totalAgents} agents
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setAutoScroll(a => !a)} style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-mono)',
              background: autoScroll ? 'rgba(79,142,247,0.12)' : 'var(--bg-input)',
              color: autoScroll ? 'var(--accent-blue)' : 'var(--text-muted)',
              border: `1px solid ${autoScroll ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`,
            }}>
              {autoScroll ? '⬇ Auto' : '⬇ Manual'}
            </button>
            {onClear && (
              <button onClick={handleClear} style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                background: 'transparent', color: 'var(--text-muted)',
                border: '1px solid var(--border)', fontFamily: 'var(--font-mono)',
              }}>Clear</button>
            )}
          </div>
        </div>

        {currentAgent && (isStreaming || revealingRef.current || pendingCount > 0) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', marginBottom: 5,
            background: `${AGENT_COLORS[currentAgent] || '#4f8ef7'}10`,
            borderRadius: 5, border: `1px solid ${AGENT_COLORS[currentAgent] || '#4f8ef7'}30`,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: AGENT_COLORS[currentAgent] || '#4f8ef7',
              animation: 'apl-pulse 0.8s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, color: AGENT_COLORS[currentAgent] || '#4f8ef7', fontFamily: 'var(--font-mono)' }}>
              {AGENT_LABELS[currentAgent] || currentAgent}
            </span>
            {pendingCount > 0 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>
                · {pendingCount} step{pendingCount !== 1 ? 's' : ''} queued
              </span>
            )}
          </div>
        )}

        {visibleSteps.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            {[
              { label: 'Agents',   val: `${completedAgents}/${totalAgents}`, color: 'var(--accent-blue)' },
              { label: 'Thoughts', val: visibleSteps.filter(s => s.type === 'thought').length, color: '#a78bfa' },
              { label: 'Actions',  val: visibleSteps.filter(s => s.type === 'action').length,  color: 'var(--accent-teal)' },
              { label: 'Shown',    val: `${visibleSteps.length}${pendingCount > 0 ? `+${pendingCount}` : ''}`, color: 'var(--text-muted)' },
            ].map(s => (
              <span key={s.label} style={{ fontSize: 9, color: s.color, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>{s.val}
              </span>
            ))}
          </div>
        )}

        {visibleSteps.length > 0 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {['all', 'thought', 'action', 'observation', 'result'].map(f => {
              const meta = STEP_META[f] || { color: 'var(--accent-blue)' }
              const count = f === 'all' ? visibleSteps.length : visibleSteps.filter(s => s.type === f).length
              const sel = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  fontSize: 9, padding: '2px 5px', borderRadius: 3, cursor: 'pointer',
                  textTransform: 'capitalize', fontFamily: 'var(--font-mono)',
                  background: sel ? `${meta.color}18` : 'transparent',
                  color: sel ? meta.color : 'var(--text-muted)',
                  border: `1px solid ${sel ? meta.color + '40' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}>
                  {f} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Steps */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}
        onScroll={e => {
          const el = e.currentTarget
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 50)
        }}
      >
        {visibleSteps.length === 0 && !isStreaming && pendingCount === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
            color: 'var(--text-muted)', padding: 24,
          }}>
            <div style={{ fontSize: 28, opacity: 0.4 }}>⬡</div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Agent process log</div>
            <div style={{ fontSize: 11, textAlign: 'center', maxWidth: 200, lineHeight: 1.7, opacity: 0.8 }}>
              Send a query to watch the ReAct reasoning unfold — Thought → Action → Observation → Result
            </div>
          </div>
        )}

        {visibleSteps.length === 0 && (isStreaming || pendingCount > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 28, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 22, color: '#4f8ef7', animation: 'apl-spin 1s linear infinite' }}>⟳</div>
            <div style={{ fontSize: 12, color: '#4f8ef7', fontWeight: 500 }}>Agents initialising…</div>
            {query && (
              <div style={{ fontSize: 11, textAlign: 'center', fontStyle: 'italic', maxWidth: 220, lineHeight: 1.6 }}>
                "{query.slice(0, 80)}{query.length > 80 ? '…' : ''}"
              </div>
            )}
          </div>
        )}

        {groups.map((group, gi) => (
          <AgentSection
            key={`${group.agent}-${gi}`}
            agentName={group.agent}
            steps={group.steps}
            isActive={group.isActive}
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── useAgentStream — SSE hook ─────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useAgentStream() {
  const [steps,        setSteps]        = useState([])
  const [isStreaming,  setIsStreaming]   = useState(false)
  const [finalResult,  setFinalResult]  = useState(null)
  const [streamError,  setStreamError]  = useState(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const uidRef = useRef(0)

  const startStream = useCallback(async (query, options = {}) => {
    setSteps([])
    setFinalResult(null)
    setStreamError(null)
    setIsStreaming(true)
    setCurrentQuery(query)
    uidRef.current = 0

    try {
      const response = await fetch('http://172.16.0.177:5000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) { setIsStreaming(false); break }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        let eventType = null
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const raw = line.slice(5).trim()
            if (!raw) continue
            try {
              const parsed = JSON.parse(raw)
              if (eventType === 'final' || parsed.type === 'final') {
                setFinalResult(parsed)
                setIsStreaming(false)
              } else {
                setSteps(prev => [...prev, { ...parsed, _uid: `step-${uidRef.current++}` }])
              }
            } catch { /* ignore */ }
            eventType = null
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err)
      setStreamError(err.message)
      setIsStreaming(false)
    }
  }, [])

  const stopStream  = useCallback(() => setIsStreaming(false), [])
  const clearSteps  = useCallback(() => { setSteps([]); setFinalResult(null); setStreamError(null) }, [])

  return { steps, isStreaming, finalResult, streamError, currentQuery, startStream, stopStream, clearSteps }
}