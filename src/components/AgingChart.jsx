// src/components/AgingChart.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const BUCKET_LABELS = {
  current:'Current', '1_30':'1–30d', '31_60':'31–60d', '61_90':'61–90d', over_90:'90d+'
}
const COLORS = {
  current:'#22c55e', '1_30':'#84cc16', '31_60':'#eab308', '61_90':'#f97316', over_90:'#ef4444'
}

function StatCard({ label, value, sub, color, glow }) {
  return (
    <div style={{
      padding:'14px 16px', background:'var(--bg-card)',
      border:`1px solid ${glow ? color+'44' : 'var(--border)'}`,
      borderRadius:'var(--radius-md)',
      boxShadow: glow ? `0 0 16px ${color}18` : 'none',
    }}>
      <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>
        {label}
      </div>
      <div style={{ fontSize:20, fontFamily:'var(--font-head)', color: color || 'var(--text-primary)', fontWeight:700 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-sm)', padding:'8px 12px', fontSize:12 }}>
      <div style={{ color:'var(--text-secondary)', marginBottom:4 }}>{BUCKET_LABELS[label] || label}</div>
      <div style={{ fontFamily:'var(--font-mono)', color:'var(--text-primary)', fontWeight:600 }}>
        ₹{(payload[0].value/100000).toFixed(2)}L
      </div>
    </div>
  )
}

export default function AgingChart({ aging, summary, loading }) {
  const data = aging ? Object.entries(aging).map(([k,v]) => ({
    key:k, label:BUCKET_LABELS[k]||k, value:v
  })) : []

  const totalOverdue = aging ? Object.values(aging).reduce((s,v)=>s+v,0) : 0
  const highRisk     = aging ? (aging['61_90']||0)+(aging['over_90']||0) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, height:'100%' }}>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        <StatCard label="Total Exposure" value={`₹${(totalOverdue/10000000).toFixed(2)}Cr`}
          color="var(--accent-blue)" glow />
        <StatCard label="High Risk" value={`₹${(highRisk/100000).toFixed(1)}L`}
          color="var(--risk-high)" sub="61+ days overdue" glow={highRisk>500000}/>
        <StatCard label="Critical Accounts" value={summary?.critical||0}
          color={summary?.critical>0?'var(--risk-critical)':'var(--risk-low)'}
          sub={summary?.critical>0?'Immediate action':'No critical accounts'}
          glow={summary?.critical>0}/>
        <StatCard label="Avg Risk Score"
          value={summary?.avg_score || '—'}
          color="var(--accent-purple)" sub="Portfolio average"/>
      </div>

      {/* Aging bar chart */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', padding:'16px 16px 12px', flex:1 }}>
        <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:12, fontWeight:500 }}>
          AR Aging Distribution
        </div>
        {loading ? (
          <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--text-muted)', fontSize:12 }}>Loading SAP data…</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{top:4,right:4,left:0,bottom:0}}>
              <XAxis dataKey="label" tick={{fontSize:11,fill:'var(--text-muted)'}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {data.map((d,i) => <Cell key={i} fill={COLORS[d.key]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Legend */}
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:8, flexWrap:'wrap' }}>
          {data.map(d => (
            <div key={d.key} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8,height:8,borderRadius:2,background:COLORS[d.key]}}/>
              <span style={{ fontSize:10,color:'var(--text-muted)' }}>{d.label}</span>
              <span style={{ fontSize:10,color:'var(--text-secondary)',fontFamily:'var(--font-mono)' }}>
                ₹{(d.value/100000).toFixed(1)}L
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk band breakdown */}
      {summary && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-lg)', padding:'14px 16px' }}>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10, fontWeight:500 }}>
            Risk Band Breakdown
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              {band:'critical', label:'Critical (75+)', color:'var(--risk-critical)', count: summary.critical||0},
              {band:'high',     label:'High (55–74)',   color:'var(--risk-high)',     count: summary.high||0},
              {band:'medium',   label:'Medium (35–54)', color:'var(--risk-medium)',   count: summary.medium||0},
              {band:'low',      label:'Low (0–34)',     color:'var(--risk-low)',      count: summary.low||0},
            ].map(({band,label,color,count}) => {
              const total = (summary.critical||0)+(summary.high||0)+(summary.medium||0)+(summary.low||0)
              const pct   = total ? Math.round(count/total*100) : 0
              return (
                <div key={band}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:3, background:'var(--bg-surface)', borderRadius:2 }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:2,
                      transition:'width 0.6s ease' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
