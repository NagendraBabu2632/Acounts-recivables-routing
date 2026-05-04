/* eslint-disable react-refresh/only-export-components */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./components/login";
import { AuthProvider, useAuth } from "./components/context/AuthContext";

// 🔐 Protect App
// eslint-disable-next-line react-refresh/only-export-components
const AppWrapper = () => {
  const { user } = useAuth();

  return user ? <App /> : <Navigate to="/" />;
};

// 🔐 Protect Login
const LoginWrapper = () => {
  const { user } = useAuth();

  return user ? <Navigate to="/app" /> : <Login />;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<LoginWrapper />} /> */}
          <Route path="/" element={<LoginWrapper />} />
        <Route index path="/app/*" element={<AppWrapper />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);