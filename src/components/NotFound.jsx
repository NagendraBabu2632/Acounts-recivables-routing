// src/components/NotFound.jsx

import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "12px"
    }}>
      <h1>404</h1>
      <p>Page not found. You probably typed something creative.</p>

      <button onClick={() => navigate("/app/dashboard")} style={{
        padding: "8px 16px",
        backgroundColor: "blue",
        color: "white",
        border: "none",
        cursor: "pointer"
      }}>
        Go to Dashboard
      </button>
    </div>
  );
}