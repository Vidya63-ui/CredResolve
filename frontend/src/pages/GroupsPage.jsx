import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const GroupsPage = ({ auth }) => {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const api = axios.create({
    headers: { Authorization: `Bearer ${auth.token}` }
  });

  const loadGroups = async () => {
    try {
      const { data } = await api.get("/api/groups");
      setGroups(data);
    } catch (err) {
      setError("Failed to load groups");
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    try {
      await api.post("/api/groups", { name });
      setName("");
      loadGroups();
    } catch (err) {
      setError("Failed to create group");
    }
  };

  const handleDelete = async (groupId) => {
    setError("");
    setInfo("");
    try {
      await api.delete(`/api/groups/${groupId}`);
      setInfo("Group deleted");
      loadGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete group");
    }
  };

  return (
    <div className="layout-two-col">
      <section className="card">
        <h2>Your groups</h2>
        {groups.length === 0 && <p>No groups yet. Create one to start tracking expenses.</p>}
        {info && <div className="muted">{info}</div>}
        <ul className="list">
          {groups.map((g) => (
            <li key={g._id} className="list-item">
              <div>
                <strong>{g.name}</strong>
                <div className="muted">
                  {g.members?.length || 0} member{(g.members?.length || 0) !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link className="btn-secondary" to={`/groups/${g._id}`}>
                  Open
                </Link>
                {g.createdBy?.toString?.() === auth.user.id && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleDelete(g._id)}
                    title="Delete group if fully settled"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2>Create a new group</h2>
        <form onSubmit={handleCreate} className="form">
          <div className="form-row">
            <label>Group name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn-primary">Create group</button>
        </form>
      </section>
    </div>
  );
};

export default GroupsPage;


