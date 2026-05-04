// src/api/client.js  –  Extended Flask API connector v2
const BASE = 'http://172.16.0.177:5000/api'
async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  const data = await res.json()
  if (!res.ok || data.success === false) throw new Error(data.error || 'Request failed')
  return data
}
export const api = {
  health:       ()        => req('/health'),
  portfolio:    ()        => req('/portfolio'),
  customer:     (id)      => req(`/customer/${id}`),
  worklist:     ()        => req('/quick/risk-worklist'),
  wtpWorklist:  ()        => req('/wtp-worklist'),
  aging:        ()        => req('/quick/aging'),
  activityLog:  (cid)     => req(`/activity-log${cid?`?customer_id=${cid}`:''}`),
  ptps:         ()        => req('/ptp'),
  emails:       (status)  => req(`/emails?status=${status||'unread'}`),
  emailDetail:  (id)      => req(`/emails/${id}`),
  disputes:     (status)  => req(`/disputes?status=${status||'Open'}`),
  payments:     (matched) => req(`/payments?matched=${matched||'false'}`),
  discountOffers: ()      => req('/discount-offers'),
  chat: (query, opts={}) => req('/chat', { method:'POST',
    body: JSON.stringify({ query, customer_id:opts.customerId, email_id:opts.emailId,
      payment_id:opts.paymentId, history:opts.history||[] }) }),
  createPTP:   (data)     => req('/ptp',{method:'POST',body:JSON.stringify(data)}),
  creditHold:  (cid,rsn)  => req('/credit-hold',{method:'POST',body:JSON.stringify({customer_id:cid,reason:rsn})}),
}
