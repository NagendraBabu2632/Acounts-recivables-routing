import ActivityLog, { PTPTracker } from '../ActivityLog'
import CustomerDetail from "../CustomerDetail";


export default function PTPView({
  customers,
  selectedCustomer,
  selectCustomer,
  handleChatQuery,
  refreshKey,
  onChat
}) {
  return (
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
                              onChat(q, match || null)
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
  );
}