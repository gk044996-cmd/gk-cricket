import React, { useState, useEffect } from "react";
import "./App.css";
import {
  registerUser, loginUser, logoutUser, heartbeat, getAllUsers,
  sendRequest, acceptRequest, getFriends, getRequests, removeFriend,
  sendGameInvite, acceptGameInvite, rejectGameInvite, getGameInvites,
  startGame, updateProfile, getHistory
} from "./api";
import GameScreen from "./components/GameScreen";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null); // email
  const [username, setUsername] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [gameInvites, setGameInvites] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentGameId, setCurrentGameId] = useState(null);

  const [notification, setNotification] = useState(null);

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem("userEmail");
    const savedName = localStorage.getItem("userName");
    if (savedUser && savedName) {
      setUser(savedUser);
      setUsername(savedName);
    }
  }, []);

  const showNotification = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (isLogin) {
      const res = await loginUser({ email: form.email, password: form.password });
      if (res.message === "Login successful ✅") {
        setUser(form.email);
        setUsername(res.username);
        localStorage.setItem("userEmail", form.email);
        localStorage.setItem("userName", res.username);
      } else showNotification(res);
    } else {
      const res = await registerUser(form);
      if(res.username) {
         showNotification("Registered! Please login.");
         setIsLogin(true);
      } else showNotification(res);
    }
  };

  const handleLogout = async () => {
      await logoutUser({ email: user });
      setUser(null);
      setUsername(null);
      setCurrentGameId(null);
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
  };

  const handleUpdateName = async () => {
      const newName = prompt("Enter new username:", username);
      if(newName && newName.trim() !== "") {
          const res = await updateProfile({ email: user, newUsername: newName });
          if(res.username) {
              setUsername(res.username);
              localStorage.setItem("userName", res.username);
              showNotification("Profile updated!");
          }
      }
  };

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        await heartbeat({ email: user });
        const [u, f, r, g, h] = await Promise.all([
            getAllUsers(user),
            getFriends(user),
            getRequests(user),
            getGameInvites(user),
            getHistory(user)
        ]);
        if(Array.isArray(u)) setAllUsers(u);
        if(Array.isArray(f)) setFriends(f);
        if(Array.isArray(r)) setRequests(r);
        if(Array.isArray(g)) setGameInvites(g);
        if(Array.isArray(h)) setHistory(h);
      } catch (e) { console.error(e); }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSendFriendRequest = async (email) => {
    await sendRequest({ fromEmail: user, toEmail: email });
    showNotification("Friend request sent!");
  };

  const handleAcceptFriend = async (email) => {
    await acceptRequest({ userEmail: user, requesterEmail: email });
    showNotification("Friend request accepted!");
  };

  const handleRemoveFriend = async (email) => {
    if(window.confirm("Are you sure you want to remove this friend?")) {
        await removeFriend({ userEmail: user, friendEmail: email });
        showNotification("Friend removed");
    }
  };

  const handleSendGameInvite = async (email) => {
    await sendGameInvite({ fromEmail: user, toEmail: email });
    showNotification("Game invite sent!");
  };

  const handleAcceptGameInvite = async (email) => {
    const res = await acceptGameInvite({ userEmail: user, requesterEmail: email });
    if(res.gameId) setCurrentGameId(res.gameId);
  };

  const handleRejectGameInvite = async (email) => {
    await rejectGameInvite({ userEmail: user, requesterEmail: email });
  };

  const startBotMode = async (mode) => {
      const res = await startGame({ player1: user, player2: "Bot", mode });
      if(res.gameId) setCurrentGameId(res.gameId);
  };

  if (!user) {
    return (
      <div className="container center-container">
        {notification && <div className="notification-popup">{notification}</div>}
        <div className="card auth glass-card">
          <h1>🏏 Live Cricket</h1>
          <h2>{isLogin ? "Login" : "Register"}</h2>
          {!isLogin && <input name="username" placeholder="Username" onChange={handleChange} />}
          <input name="email" placeholder="Email" onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} />
          <button className="primary-btn" onClick={handleSubmit}>{isLogin ? "Login" : "Register"}</button>
          <p onClick={() => setIsLogin(!isLogin)} className="switch">
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  if (currentGameId) {
    return <GameScreen gameId={currentGameId} userEmail={user} username={username} onExit={() => setCurrentGameId(null)} />;
  }

  const botModes = [
      { id: 'bot_chase', name: '🏏 Chase Mode', desc: 'Bot bats first. Chase the target!' },
      { id: 'bot_target', name: '🎯 Target Challenge', desc: 'Fixed target: 50 runs to win.' },
      { id: 'bot_survival', name: '🔥 Survival Mode', desc: 'No ball limit. Survive the longest.' },
      { id: 'bot_risk', name: '💣 Risk Mode', desc: 'High scores get multiplied by 2x!' },
      { id: 'bot_reverse', name: '🔄 Reverse Mode', desc: 'Same number = Bonus! Diff = 1 run.' },
      { id: 'bot_random', name: '🎲 Random Events', desc: 'Crazy random effects on each ball.' },
      { id: 'bot_mind', name: '🧠 Mind Game', desc: 'Bot adapts to your choices.' },
      { id: 'bot_powerplay', name: '⚡ Powerplay', desc: 'Start aggressive, defend late.' },
      { id: 'bot_defense', name: '🛡️ Defense Mode', desc: 'You bat. Survive against the smart bot.' },
  ];

  return (
    <div className="container">
      {notification && <div className="notification-popup">{notification}</div>}
      
      <nav className="navbar">
        <div className="nav-logo">🏏 Live Cricket</div>
        <div className="nav-links">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>🏠 Home</button>
          <button className={activeTab === 'friends' ? 'active' : ''} onClick={() => setActiveTab('friends')}>👥 Friends</button>
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>📜 History</button>
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>👤 Profile</button>
        </div>
      </nav>

      <div className="main-content">
        {gameInvites.length > 0 && (
            <div className="invite-banner">
                <h3>🎮 You have {gameInvites.length} Game Invite(s)!</h3>
                {gameInvites.map(g => (
                    <div key={g._id} className="invite-row">
                        <span>{g.username} invited you to play!</span>
                        <div>
                            <button className="accept-btn" onClick={() => handleAcceptGameInvite(g.email)}>Accept</button>
                            <button className="reject-btn" onClick={() => handleRejectGameInvite(g.email)}>Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'home' && (
            <div className="tab-content">
                <h2>Play Match</h2>
                <div className="card glass-card">
                    <h3>👥 Play with Friend</h3>
                    {friends.length === 0 ? <p className="empty">Add friends to play live matches!</p> : null}
                    <div className="user-list">
                        {friends.map(f => (
                            <div className="user-card" key={f._id}>
                                <div className="user-info">
                                    <span className={`status-dot ${f.isOnline ? 'online' : 'offline'}`}></span>
                                    <span className="user-name">{f.username}</span>
                                </div>
                                <button className="invite-btn" onClick={() => handleSendGameInvite(f.email)}>🎮 Invite to Play</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card glass-card">
                    <h3>🤖 Bot Game Modes</h3>
                    <div className="modes-grid">
                        {botModes.map(m => (
                            <div key={m.id} className="mode-card" onClick={() => startBotMode(m.id)}>
                                <h4>{m.name}</h4>
                                <p>{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'friends' && (
            <div className="tab-content">
                <h2>Friends System</h2>
                
                {requests.length > 0 && (
                    <div className="card glass-card">
                        <h3>Friend Requests</h3>
                        <div className="user-list">
                            {requests.map(r => (
                                <div className="user-card" key={r._id}>
                                    <span className="user-name">{r.username}</span>
                                    <button className="accept-btn" onClick={() => handleAcceptFriend(r.email)}>Accept</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="card glass-card">
                    <h3>Your Friends</h3>
                    <div className="user-list">
                        {friends.map(f => (
                            <div className="user-card" key={f._id}>
                                <div className="user-info">
                                    <span className={`status-dot ${f.isOnline ? 'online' : 'offline'}`}></span>
                                    <span className="user-name">{f.username}</span>
                                </div>
                                <button className="reject-btn" onClick={() => handleRemoveFriend(f.email)}>❌ Remove</button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card glass-card mt-3">
                    <h3>All Users (Add Friends)</h3>
                    <div className="user-list">
                        {allUsers.filter(u => !friends.find(f => f.email === u.email)).map(u => (
                            <div className="user-card" key={u._id}>
                                <div className="user-info">
                                    <span className={`status-dot ${u.isOnline ? 'online' : 'offline'}`}></span>
                                    <span className="user-name">{u.username}</span>
                                </div>
                                {requests.find(r => r.email === u.email) ? (
                                    <span className="pending-text">Request Pending</span>
                                ) : (
                                    <button className="add-btn" onClick={() => handleSendFriendRequest(u.email)}>➕ Add</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="tab-content">
                <h2>📜 Match History</h2>
                <div className="history-list">
                    {history.length === 0 ? <p className="empty">No matches played yet.</p> : null}
                    {history.map(h => {
                        const iWon = h.winner === username;
                        const isDraw = h.winner === "Draw";
                        const resultStatus = isDraw ? "DRAW 🤝" : iWon ? "WON 🏆" : "LOST ❌";
                        const resultClass = isDraw ? "draw" : iWon ? "won" : "lost";
                        
                        return (
                            <div key={h._id} className={`history-card ${resultClass}`}>
                                <div className="history-header">
                                    <h4>{h.player1} vs {h.player2}</h4>
                                    <span className="history-mode">{h.mode}</span>
                                </div>
                                <p className="history-result">
                                    <strong>{resultStatus}</strong> ({h.score1} vs {h.score2})
                                </p>
                                <p className="history-details">How Out: {h.howOut} • {new Date(h.date).toLocaleDateString()}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {activeTab === 'profile' && (
            <div className="tab-content">
                <div className="card glass-card profile-card">
                    <div className="profile-avatar">👤</div>
                    <h2>{username} <button className="edit-btn" onClick={handleUpdateName}>✏️</button></h2>
                    <p>{user}</p>
                    <div className="stats-row">
                        <div className="stat-box"><h3>{friends.length}</h3><p>Friends</p></div>
                        <div className="stat-box"><h3>{history.length}</h3><p>Matches</p></div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

export default App;