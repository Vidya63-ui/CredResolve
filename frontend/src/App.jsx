import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import GroupsPage from "./pages/GroupsPage.jsx";
import GroupDetailPage from "./pages/GroupDetailPage.jsx";

const App = () => {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return token && user ? { token, user: JSON.parse(user) } : null;
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth(null);
    navigate("/login");
  };

  // Theme (dark/light) handling
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className={`app-shell ${theme}`}>
      <header className="app-header">
        <Link to="/" className="brand">CredResolve Split</Link>
        <nav>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          {auth ? (
            <>
              <span className="user-pill">{auth.user.name}</span>
              <button onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={auth ? <Navigate to="/groups" /> : <Navigate to="/login" />}
          />
          <Route path="/login" element={<LoginPage setAuth={setAuth} />} />
          <Route
            path="/groups"
            element={auth ? <GroupsPage auth={auth} /> : <Navigate to="/login" />}
          />
          <Route
            path="/groups/:groupId"
            element={auth ? <GroupDetailPage auth={auth} /> : <Navigate to="/login" />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;


