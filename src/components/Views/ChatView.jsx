import RiskWorklist from "../RiskWorklist";
import ChatInterface from "../ChatInterface";
import CustomerDetail from "../CustomerDetail";

export default function ChatView({
  customers,
  chatCustomer,
  setChatCustomer,
  selectCustomer,
  handleChatQuery,
  loadingPortfolio,
  chatQuery,
  bulkCustomers
}) {
console.log("ChatView render bulkcustomers", { bulkCustomers });

  return (
    <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'260px 1fr 260px', height:'100%' }}>
               <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>
      <RiskWorklist
        customers={customers}
        selected={chatCustomer}
        onSelect={(c) => {
          setChatCustomer(c);
          selectCustomer(c);
        }}
        onChat={handleChatQuery}
        loading={loadingPortfolio}
      />
 </div>
 <div style={{ overflow:'hidden' }}>
      <ChatInterface
        selectedCustomer={chatCustomer}
        initialQuery={chatQuery}
      />
</div>
<div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
      <CustomerDetail customer={chatCustomer} onChat={handleChatQuery}/>
      </div>
    </div>
  );
}