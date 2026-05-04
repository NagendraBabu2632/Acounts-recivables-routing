import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { useAuth } from "./context/AuthContext";




const Login = () => {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();

  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const res = await fetch("http://172.16.0.177:5000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email})
    });

    const data = await res.json();
    console.log("Login response:", data);
    if(data.role !== 'Not a valid user'){
           setUser({email, role: data.role});
        navigate("/app");
    }else{
      alert("Invalid credentials");
        setEmail("");      
        setPassword("");   
    }
    
  } catch (err) {
    console.error(err);
    alert("Login failed");
  }
};
  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
