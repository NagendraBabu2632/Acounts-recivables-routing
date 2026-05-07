import { useAuth } from "./context/AuthContext";

const TopBar = () => {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] || "User";
  const initials = name
    .split(".")
    .map((n) => n[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
  const role = user?.role || "";

  return (
    <div style={{
      background: "#0d0f14",
      borderBottom: "0.5px solid #2a2a2a",
      padding: "0 24px",
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
    }}>
      {/* Left: Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "#185FA5", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.3" />
          </svg>
        </div>
        <span style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "-0.2px", color: "#ffffff" }}>
          Account Receivable
        </span>
      </div>

      {/* Right: User info */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "#e0e0e0" }}>{name}</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#888888" }}>{role}</p>
        </div>
        <div style={{
          width: "34px", height: "34px", borderRadius: "50%",
          background: "#1a2a3a", border: "0.5px solid #2d4a6a",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: 500, color: "#4a9ede",
        }}>
          {initials}
        </div>
      </div>
    </div>
  );
};

export default TopBar;