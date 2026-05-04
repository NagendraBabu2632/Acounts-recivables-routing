import RiskWorklist from "../RiskWorklist";
import AgingChart from "../AgingChart";
import CustomerDetail from "../CustomerDetail";
import ActivityLog from "../ActivityLog_old";

export default function DashboardView({
  customers,
  agingData,
  summary,
  selectedCustomer,
  onSelect,
  onChat,
  loading,
  refreshKey
}) {
  return (
    <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'300px 1fr 280px', gridTemplateRows:'1fr 1fr',
            gap:0, height:'100%' }}>
      {/* Left */}
     <div style={{ gridRow:'1/3', borderRight:'1px solid var(--border)', overflow:'hidden' }}>
        <RiskWorklist
          customers={customers}
          selected={selectedCustomer}
          onSelect={onSelect}
          onChat={onChat}
          loading={loading}
        />
      </div>

      {/* Center Top */}
      <div style={{ borderBottom:'1px solid var(--border)', padding:10, overflow:'auto' }}>
        <CustomerDetail
          customer={selectedCustomer}
          onChat={(q) => onChat(q, selectedCustomer)}
        />
      </div>

      {/* Right */}
     <div style={{ gridRow:'1/3', borderLeft:'1px solid var(--border)', overflow:'auto' }}>
        
        <AgingChart
          aging={agingData}
          summary={summary}
          loading={loading}
        />
      </div>

      {/* Center Bottom */}
      <div style={{ overflow:'hidden' }}>
        <ActivityLog
          customerId={selectedCustomer?.customer_id}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}