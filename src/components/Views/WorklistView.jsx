import RiskWorklist from "../RiskWorklist";
import CustomerDetail from "../CustomerDetail";

export default function WorklistView({
  customers,
  selectedCustomer,
  onSelect,
  onChat
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 360px",
      height: "100%"
    }}>
      
      <RiskWorklist
        customers={customers}
        selected={selectedCustomer}
        onSelect={onSelect}
        onChat={onChat}
      />

      <div style={{ borderLeft: "1px solid var(--border)" }}>
        <CustomerDetail
          customer={selectedCustomer}
          onChat={(q) => onChat(q, selectedCustomer)}
        />
      </div>
    </div>
  );
}