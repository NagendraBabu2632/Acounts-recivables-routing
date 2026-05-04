import { useState } from "react";

export default function PTPTracker({
  onSelectCustomer,
  onChat
}) {
  // dummy data (replace with API later)
  const [ptpData] = useState([
    {
      id: 1,
      customer_id: "C001",
      name: "ABC Traders",
      amount: 250000,
      due_date: "2026-04-20",
      status: "pending"
    },
    {
      id: 2,
      customer_id: "C002",
      name: "XYZ Distributors",
      amount: 120000,
      due_date: "2026-04-18",
      status: "overdue"
    }
  ]);

  const getStatusColor = (status) => {
    if (status === "overdue") return "var(--risk-critical)";
    if (status === "pending") return "var(--risk-medium)";
    return "var(--text-secondary)";
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden"
    }}>
      
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between"
        }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            PTP Tracker
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {ptpData.length} records
          </span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {ptpData.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer"
            }}
            onClick={() =>
              onSelectCustomer &&
              onSelectCustomer({
                customer_id: item.customer_id,
                name: item.name
              })
            }
          >
            {/* Top */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6
            }}>
              <span style={{ fontWeight: 500 }}>
                {item.name}
              </span>

              <span style={{
                fontSize: 11,
                color: getStatusColor(item.status)
              }}>
                {item.status.toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)"
            }}>
              <span>₹{item.amount.toLocaleString()}</span>
              <span>{item.due_date}</span>
            </div>

            {/* Actions */}
            <div style={{
              marginTop: 8,
              display: "flex",
              gap: 6
            }}>
              <button
                style={{
                  flex: 1,
                  padding: "4px",
                  fontSize: 11,
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChat &&
                    onChat(
                      `Follow up on payment for ${item.name}`,
                      item.customer_id
                    );
                }}
              >
                Follow-up
              </button>

              <button
                style={{
                  flex: 1,
                  padding: "4px",
                  fontSize: 11,
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChat &&
                    onChat(
                      `Draft reminder email for ${item.name}`,
                      item.customer_id
                    );
                }}
              >
                Email
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}