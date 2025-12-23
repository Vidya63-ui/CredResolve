import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const GroupDetailPage = ({ auth }) => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");
  const [settleUser, setSettleUser] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [exactSplits, setExactSplits] = useState([]);
  const [percentSplits, setPercentSplits] = useState([]);
  const [splitError, setSplitError] = useState("");
  const [error, setError] = useState("");
  const [memberMessage, setMemberMessage] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [friends, setFriends] = useState([]);

  const api = axios.create({
    headers: { Authorization: `Bearer ${auth.token}` }
  });

  const loadData = async () => {
    try {
      const groupRes = await api.get("/api/groups");
      const g = groupRes.data.find((x) => x._id === groupId);
      setGroup(g || null);

      const { data } = await api.get(`/api/expenses/${groupId}/balances`);
      setBalances(data);
    } catch (err) {
      setError("Failed to load group/balances");
    }
  };

  useEffect(() => {
    loadData();
    // also fetch friends
    (async () => {
      try {
        const { data } = await api.get("/api/users/friends");
        setFriends(data);
      } catch (err) {
        // ignore soft fail
      }
    })();
  }, [groupId]);

  // Reset split details when split type or amount changes
  useEffect(() => {
    setSplitError("");
    if (!group) return;
    if (splitType === "EXACT") {
      // pre-fill one row per member with 0
      setExactSplits(group.members.map((m) => ({ userId: m._id, amount: "" })));
      setPercentSplits([]);
    } else if (splitType === "PERCENT") {
      setPercentSplits(group.members.map((m) => ({ userId: m._id, percent: "" })));
      setExactSplits([]);
    } else {
      setExactSplits([]);
      setPercentSplits([]);
    }
  }, [splitType, groupId, group]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError("");
    setSplitError("");
    try {
      const totalAmount = Number(amount);
      if (!group || !Number.isFinite(totalAmount) || totalAmount <= 0) {
        setError("Enter a valid amount");
        return;
      }

      let participants;

      if (splitType === "EQUAL") {
        participants = group.members.map((m) => m._id);
      } else if (splitType === "EXACT") {
        const cleaned = exactSplits
          .filter((s) => s.userId && s.amount !== "")
          .map((s) => ({ userId: s.userId, amount: Number(s.amount) }))
          .filter((s) => s.amount > 0);

        const sum = cleaned.reduce((acc, s) => acc + s.amount, 0);
        if (sum > totalAmount + 0.01) {
          setSplitError("Exact amounts cannot exceed the total amount.");
          return;
        }
        if (Math.abs(sum - totalAmount) > 0.01) {
          setSplitError("Exact amounts must add up to the total amount.");
          return;
        }
        if (cleaned.length === 0) {
          setSplitError("Add at least one participant with amount.");
          return;
        }
        participants = cleaned;
      } else if (splitType === "PERCENT") {
        const cleaned = percentSplits
          .filter((s) => s.userId && s.percent !== "")
          .map((s) => ({ userId: s.userId, percent: Number(s.percent) }))
          .filter((s) => s.percent > 0);

        const sumPercent = cleaned.reduce((acc, s) => acc + s.percent, 0);
        if (sumPercent > 100.01) {
          setSplitError("Percents cannot exceed 100%.");
          return;
        }
        if (Math.abs(sumPercent - 100) > 0.01) {
          setSplitError("Percents must add up to 100%.");
          return;
        }
        if (cleaned.length === 0) {
          setSplitError("Add at least one participant with percent.");
          return;
        }
        participants = cleaned;
      }

      await api.post("/api/expenses", {
        groupId,
        description,
        amount: totalAmount,
        splitType,
        participants
      });
      setDescription("");
      setAmount("");
      setExactSplits([]);
      setPercentSplits([]);
      loadData();
    } catch (err) {
      setError("Failed to add expense");
    }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/api/expenses/${groupId}/settle`, {
        toUserId: settleUser,
        amount: Number(settleAmount)
      });
      setSettleAmount("");
      loadData();
    } catch (err) {
      setError("Failed to record settlement");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    setMemberMessage("");
    try {
      const { data } = await api.post(`/api/groups/${groupId}/members`, { email: newMemberEmail });
      setMemberMessage(data.message || "Member added");
      setNewMemberEmail("");
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setFriendMessage("");
    setError("");
    try {
      const { data } = await api.post("/api/users/friends", {
        email: newFriendEmail,
        groupId
      });
      setFriendMessage(data.message || "Friend added");
      setNewFriendEmail("");
      // refresh both friends and group
      const friendsRes = await api.get("/api/users/friends");
      setFriends(friendsRes.data);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add friend");
    }
  };

  const myId = auth.user.id;

  const summaryForMe = () => {
    if (!balances) return { owe: 0, owed: 0 };
    let owe = 0;
    let owed = 0;
    for (const edge of balances.simplified || []) {
      if (edge.from === myId) owe += edge.amount;
      if (edge.to === myId) owed += edge.amount;
    }
    return { owe, owed };
  };

  const summary = summaryForMe();

  return (
    <div className="layout-two-col">
      <section className="card">
        <h2>{group?.name || "Group"}</h2>
        <p className="muted">
          {group?.members?.length || 0} member
          {(group?.members?.length || 0) !== 1 ? "s" : ""}
        </p>
        {balances && (
          <div className="summary-panel">
            <div>
              <div className="summary-label">You owe</div>
              <div className="summary-value negative">₹ {summary.owe.toFixed(2)}</div>
            </div>
            <div>
              <div className="summary-label">You are owed</div>
              <div className="summary-value positive">₹ {summary.owed.toFixed(2)}</div>
            </div>
          </div>
        )}
        <h3>Simplified balances</h3>
        {!balances || balances.simplified.length === 0 ? (
          <p>Everyone is settled up in this group.</p>
        ) : (
          <ul className="list">
            {balances.simplified.map((e, idx) => {
              const fromUser = balances.members.find((m) => m._id === e.from);
              const toUser = balances.members.find((m) => m._id === e.to);
              return (
                <li key={idx} className="list-item">
                  <span>
                    <strong>{fromUser?.name}</strong> owes{" "}
                    <strong>{toUser?.name}</strong>
                  </span>
                  <span>₹ {e.amount.toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="card">
        <h2>Add expense & settle</h2>
        <form onSubmit={handleAddExpense} className="form">
          <div className="form-row">
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Split type</label>
            <select value={splitType} onChange={(e) => setSplitType(e.target.value)}>
              <option value="EQUAL">Equal</option>
              <option value="EXACT">Exact</option>
              <option value="PERCENT">Percent</option>
            </select>
          </div>
          {splitType === "EXACT" && group && (
            <div className="form-row">
              <label>Exact split per member</label>
              <div className="muted">
                Assign exact amounts; the sum must equal the total amount.
              </div>
              {exactSplits.map((row, idx) => (
                <div key={idx} className="form-row" style={{ flexDirection: "row", gap: "0.5rem" }}>
                  <select
                    value={row.userId}
                    onChange={(e) => {
                      const next = [...exactSplits];
                      next[idx] = { ...next[idx], userId: e.target.value };
                      setExactSplits(next);
                    }}
                    style={{ flex: 2 }}
                  >
                    <option value="">Select member</option>
                    {group.members.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => {
                      const next = [...exactSplits];
                      next[idx] = { ...next[idx], amount: e.target.value };
                      setExactSplits(next);
                    }}
                    style={{ flex: 1 }}
                    placeholder="Amount"
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setExactSplits((prev) => [...prev, { userId: "", amount: "" }])
                }
              >
                + Add person
              </button>
              {splitError && <div className="error-text">{splitError}</div>}
            </div>
          )}
          {splitType === "PERCENT" && group && (
            <div className="form-row">
              <label>Percent split per member</label>
              <div className="muted">
                Assign percentage for each member; total must be 100%.
              </div>
              {percentSplits.map((row, idx) => (
                <div key={idx} className="form-row" style={{ flexDirection: "row", gap: "0.5rem" }}>
                  <select
                    value={row.userId}
                    onChange={(e) => {
                      const next = [...percentSplits];
                      next[idx] = { ...next[idx], userId: e.target.value };
                      setPercentSplits(next);
                    }}
                    style={{ flex: 2 }}
                  >
                    <option value="">Select member</option>
                    {group.members.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={row.percent}
                    onChange={(e) => {
                      const next = [...percentSplits];
                      next[idx] = { ...next[idx], percent: e.target.value };
                      setPercentSplits(next);
                    }}
                    style={{ flex: 1 }}
                    placeholder="%"
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setPercentSplits((prev) => [...prev, { userId: "", percent: "" }])
                }
              >
                + Add person
              </button>
              {splitError && <div className="error-text">{splitError}</div>}
            </div>
          )}
          <button className="btn-primary">Add expense</button>
        </form>
        <div className="divider" />
        <form onSubmit={handleSettle} className="form">
          <div className="form-row">
            <label>Settle with</label>
            <select
              value={settleUser}
              onChange={(e) => setSettleUser(e.target.value)}
              required
            >
              <option value="">Choose member</option>
              {group?.members
                ?.filter((m) => m._id !== myId)
                .map((m) => (
                  <option key={`member-${m._id}`} value={m._id}>
                    {m.name}
                  </option>
                ))}
              {friends
                ?.filter((f) => f._id !== myId && !group?.members?.some((m) => m._id === f._id))
                .map((f) => (
                  <option key={`friend-${f._id}`} value={f._id}>
                    {f.name} (friend)
                  </option>
                ))}
            </select>
          </div>
          <div className="form-row">
            <label>Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn-secondary">Record settlement</button>
        </form>
        <div className="divider" />
        <form onSubmit={handleAddMember} className="form">
          <div className="form-row">
            <label>Add member by email</label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              required
            />
          </div>
          {memberMessage && <div className="muted">{memberMessage}</div>}
          {error && <div className="error-text">{error}</div>}
          <button className="btn-primary">Add to group</button>
        </form>
        <div className="divider" />
        <form onSubmit={handleAddFriend} className="form">
          <div className="form-row">
            <label>Add friend by email (also added to this group)</label>
            <input
              type="email"
              value={newFriendEmail}
              onChange={(e) => setNewFriendEmail(e.target.value)}
              required
            />
          </div>
          {friendMessage && <div className="muted">{friendMessage}</div>}
          {error && <div className="error-text">{error}</div>}
          <button className="btn-secondary">Add friend</button>
        </form>
      </section>
    </div>
  );
};

export default GroupDetailPage;


