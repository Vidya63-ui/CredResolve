import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const LoginPage = ({ setAuth }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await axios.post("/api/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password
        });
      }
      const { data } = await axios.post("/api/auth/login", {
        email: form.email,
        password: form.password
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setAuth({ token: data.token, user: data.user });
      navigate("/groups");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="card auth-card">
      <h2>{isRegister ? "Create an account" : "Welcome back"}</h2>
      <form onSubmit={handleSubmit} className="form">
        {isRegister && (
          <div className="form-row">
            <label>Name</label>
            <input name="name" value={form.name} onChange={onChange} required />
          </div>
        )}
        <div className="form-row">
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-row">
          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn-primary" type="submit">
          {isRegister ? "Register & Login" : "Login"}
        </button>
      </form>
      <button className="link-button" onClick={() => setIsRegister((v) => !v)}>
        {isRegister ? "Already have an account? Login" : "New here? Create an account"}
      </button>
    </div>
  );
};

export default LoginPage;


