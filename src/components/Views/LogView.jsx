import RiskWorklist from "../RiskWorklist";
import ActivityLog from "../ActivityLog_old";

export default function LogView({
  customers,
  selectedCustomer,
  onSelect,
  onChat,
  refreshKey
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "300px 1fr",
      height: "100%"
    }}>
      
      <div style={{ borderRight: "1px solid var(--border)" }}>
        <RiskWorklist
          customers={customers}
          selected={selectedCustomer}
          onSelect={onSelect}
          onChat={onChat}
        />
      </div>

      <ActivityLog
        customerId={selectedCustomer?.customer_id}
        refreshKey={refreshKey}
      />
    </div>
  );
}