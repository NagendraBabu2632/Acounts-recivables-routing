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
  bulkCustomers,
  handleDataUpdate
}) {
console.log("ChatView render bulkcustomers", { bulkCustomers });

  return (
    <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'300px 1fr', height:'100%' }}>
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
        onDataUpdate={handleDataUpdate}
      />
</div>
    </div>
  );
}