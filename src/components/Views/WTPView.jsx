import WTPWorklist from "../WTPWorklist";
import ChatInterface from "../ChatInterface";
import CustomerDetail from "../CustomerDetail";

export default function WTPView({
  chatCustomer,
  chatQuery,
  setChatCustomer,
  selectCustomer,
  handleChatQuery
}) {
  return (
    <div style={{  overflow:'hidden', display:'grid',
            gridTemplateColumns:'260px 1fr 260px', height:'100%' }}>

      {/* Left */}
      <div style={{ borderRight:'1px solid var(--border)' ,overflow: 'auto'}}>
        <WTPWorklist
          onSelectCustomer={(c) => {
            setChatCustomer(c);
            selectCustomer(c);
          }}
          onChat={handleChatQuery}
        />
      </div>

      {/* Center */}
      <ChatInterface
        selectedCustomer={chatCustomer}
        initialQuery={chatQuery}
      />

      {/* Right */}
      <div style={{ borderLeft:'1px solid var(--border)' }}>
        <CustomerDetail customer={chatCustomer}  onChat={handleChatQuery} />
      </div>

    </div>
  );
}