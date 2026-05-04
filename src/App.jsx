

import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import "./index.css";
import { api } from "./api/client";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/Views/DashboardView";
import ChatView from "./components/Views/ChatView";
import WorklistView from "./components/Views/WorklistView";
import PTPView from "./components/Views/PTPView";
import LogView from "./components/Views/LogView";
import NotFound from "./components/NotFound";
import { useAuth } from "./components/context/AuthContext";
import Unauthorized from "./components/Unauthorized";
import { useMemo } from "react";
import EmailInbox from "./components/EmailInbox";
import DisputeBoard from "./components/DisputeBoard";
import WTPWorklist from "./components/WTPWorklist";
import WTPView from "./components/Views/WTPView";

export default function App() {
  const navigate = useNavigate();
const { user } = useAuth();
const role = user?.role;
  const [customers, setCustomers] = useState([]);
  const [agingData, setAgingData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [chatCustomer, setChatCustomer] = useState(null);
  const [chatQuery, setChatQuery] = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [refreshKey, _setRefreshKey] = useState(0);

  // Auth check
  // useEffect(() => {
  //   // const isAuth = localStorage.getItem("auth");
  //   // const savedRole = localStorage.getItem("role");

  //   // if (!isAuth) {
  //   //   navigate("/");
  //   // } else {
  //   //   setRole(savedRole);
  //   // }
  //    navigate("/")
  // }, []);

  // Load data
  const loadPortfolio = useCallback(async () => {
    setLoadingPortfolio(true);
    try {
      const data = await api.portfolio();
      setCustomers(data.customers || []);
      setAgingData(data.aging_buckets);

      const avgScore = data.customers?.length
        ? Math.round(
            data.customers.reduce((s, x) => s + x.risk_score, 0) /
              data.customers.length
          )
        : 0;

      setSummary({ ...data.summary, avg_score: avgScore });
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const bulkCustomers = useMemo(() => {
  return customers
    .filter(c => ["critical", "high"].includes(c.risk_band))
    .map(c => c.customer_id);
}, [customers]);

  const handleChatQuery = (query, customer) => {
     navigate("/app/chat");
     if(customer) {
      setChatCustomer(customer);
       selectCustomer(customer);
 
     }
      setChatQuery(query);
  };

 const handleChatQuery1 = (query, customer) => {
  navigate("/app/wtp");
  if (customer) {  // ADD THIS CHECK
    setChatCustomer(customer);
    selectCustomer(customer);
  }
  setChatQuery(query);
};

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setChatCustomer(c);
  };

  return (
    <div style={{  display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar setChatQuery={setChatQuery} />

      <div style={{ flex: 1 }}>
        <Routes>
          <Route index element={<Navigate to="dashboard" />} />

          <Route
            path="dashboard"
            element={
              <DashboardView
                customers={customers}
                agingData={agingData}
                summary={summary}
                selectedCustomer={selectedCustomer}
                onSelect={selectCustomer}
                onChat={handleChatQuery}
                loading={loadingPortfolio}
                refreshKey={refreshKey}
              />
            }
          />

          <Route
            path="chat"
            element={
               (
                role === "admin" || role === "Admin" ?( <ChatView
                  customers={customers}
                  chatCustomer={chatCustomer}
                  setChatCustomer={setChatCustomer}
                  selectCustomer={selectCustomer}
                  handleChatQuery={handleChatQuery}
                  loadingPortfolio={loadingPortfolio}
                  chatQuery={chatQuery}
                  bulkCustomers={bulkCustomers}
                />) : <Navigate to="/app/unauthorized" />
              ) 
            }
          />

          <Route
            path="worklist"
            element={
              <WorklistView
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelect={selectCustomer}
                onChat={handleChatQuery}
              />
            }
          />

          <Route path="ptp" element={ <PTPView
      customers={customers}
      selectedCustomer={selectedCustomer}
      selectCustomer={selectCustomer}
      handleChatQuery={handleChatQuery}
         onChat={handleChatQuery}
      refreshKey={refreshKey}
    />} />
          <Route path="log" element={ <LogView
      customers={customers}
      selectedCustomer={selectedCustomer}
      onSelect={selectCustomer}
      onChat={handleChatQuery}
      refreshKey={refreshKey}
    />} />
    
      <Route
    path="email"
    element={
      <EmailInbox
        onChat={handleChatQuery}
        onSelectCustomer={(c) => {
          setSelectedCustomer(c);
          setChatCustomer(c);
        }}
      />
    }
  />
  <Route
    path="disputes"
    element={
      <DisputeBoard
        onChat={handleChatQuery}
        onSelectCustomer={(c) => {
          setSelectedCustomer(c);
          setChatCustomer(c);
        }}
      />
    }
  />

<Route
  path="wtp"
  element={
    <WTPView
      chatCustomer={chatCustomer}
      chatQuery={chatQuery}
      setChatCustomer={setChatCustomer}
      selectCustomer={selectCustomer}
      handleChatQuery={handleChatQuery1}
    />
  }
/>

  
  <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="*" element={<NotFound />} />
  
        </Routes>
        
      </div>
    </div>
  );
}