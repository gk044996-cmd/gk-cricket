import React, { useState, useEffect } from "react";
import "./App.css";
import {
  registerUser, loginUser, logoutUser, heartbeat, getAllUsers,
  sendRequest, acceptRequest, getFriends, getRequests, removeFriend,
  sendGameInvite, acceptGameInvite, rejectGameInvite, getGameInvites,
  startGame, updateProfile, getHistory, getActiveGame, leaveGame, sendMultiplayerInvites
} from "./api";
import GameScreen from "./components/GameScreen";
import HiddenNumberGame from "./components/HiddenNumberGame";
import RPSGame from "./components/RPSGame";
import EvenOddGame from "./components/EvenOddGame";
import TicTacToeGame from "./components/TicTacToeGame";
import TossScreen from "./components/TossScreen";
import SnakeLaddersGame from "./components/SnakeLaddersGame";
import LudoGame from "./components/LudoGame";
import MemoryFlipGame from "./components/MemoryFlipGame";
import MemoryNumberGame from "./components/MemoryNumberGame";

const GAMES = [
    { id: 'handcricket', name: '🏏 Hand Cricket', desc: 'Classic hand cricket multiplayer' },
    { id: 'hidden-number', name: '🔢 Hidden Number', desc: 'Guess the secret number' },
    { id: 'rps', name: '✌️ Rock Paper Scissors', desc: 'Classic RPS, best of 3' },
    { id: 'evenodd', name: '🎲 Even-Odd', desc: 'Even or Odd? Sum it up!' },
    { id: 'tictactoe', name: '❌ Tic Tac Toe ⭕', desc: 'Classic 3x3 grid game' },
    { id: 'snake-ladders', name: '🐍 Snake & Ladders', desc: 'Classic board game (2-4 players)' },
    { id: 'ludo', name: '🎲 Ludo', desc: 'Classic Ludo (2-4 players)' },
    { id: 'memory-flip', name: '🃏 Memory Flip', desc: 'Match pairs of cards' },
    { id: 'memory-number', name: '🔢 Memory Number', desc: 'Remember and click numbers 1-9' },
];

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
  const [currentGame, setCurrentGame] = useState(null); // { id, type }
  const [selectedGameType, setSelectedGameType] = useState('handcricket');
  const [multiplayerCount, setMultiplayerCount] = useState(2);
  const [selectedFriends, setSelectedFriends] = useState([]);

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
      if (!form.email || !form.email.endsWith("@gmail.com")) {
        showNotification("Email must end with @gmail.com");
        return;
      }
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
      setCurrentGame(null);
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
        const [u, f, r, g, h, active] = await Promise.all([
            getAllUsers(user),
            getFriends(user),
            getRequests(user),
            getGameInvites(user),
            getHistory(user),
            getActiveGame(user)
        ]);
        if(Array.isArray(u)) setAllUsers(u);
        if(Array.isArray(f)) setFriends(f);
        if(Array.isArray(r)) setRequests(r);
        if(Array.isArray(g)) setGameInvites(g);
        if(Array.isArray(h)) setHistory(h);

        if(active && active.active) {
            if(!currentGame || currentGame.id !== active.gameId || currentGame.status !== active.status) {
                setCurrentGame({ id: active.gameId, type: active.gameType, status: active.status });
            }
        } else if (currentGame) {
            // Wait, if active is false, but we are viewing a finished game, don't clear it.
            // But if we are polling and it suddenly disappears from active, we don't clear it immediately unless we click Leave.
        }
      } catch (e) { console.error(e); }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user, currentGame]);

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
    await sendGameInvite({ fromEmail: user, toEmail: email, gameType: selectedGameType });
    showNotification(`Game invite for ${GAMES.find(g => g.id === selectedGameType)?.name} sent!`);
  };

  const handleAcceptGameInvite = async (invite) => {
    const res = await acceptGameInvite({ userEmail: user, requesterEmail: invite.email, gameType: invite.gameType });
    if(res.gameId) setCurrentGame({ id: res.gameId, type: invite.gameType });
  };

  const handleRejectGameInvite = async (invite) => {
    await rejectGameInvite({ userEmail: user, requesterEmail: invite.email, gameType: invite.gameType });
  };

  const handleExitGame = async (gameId, isFinishedNormal) => {
      if (isFinishedNormal) {
          setCurrentGame(null);
      } else {
          if(window.confirm("Are you sure you want to leave? This match will be abandoned")) {
              await leaveGame({ gameId, userEmail: user });
              setCurrentGame(null);
          }
      }
  };

  const handlePlayAgainBot = async (mode, gameType) => {
      const payload = { player1: user, player2: "Bot", mode, gameType };
      if (['snake-ladders', 'ludo'].includes(gameType)) {
          payload.playerCount = multiplayerCount;
      }
      const res = await startGame(payload);
      if(res.gameId) {
          setCurrentGame({ id: res.gameId, type: gameType, status: gameType === 'handcricket' ? 'toss' : 'playing' });
      }
  };

  const startBotMode = async (mode) => {
      const payload = { player1: user, player2: "Bot", mode, gameType: selectedGameType };
      if (['snake-ladders', 'ludo'].includes(selectedGameType)) {
          payload.playerCount = multiplayerCount;
      }
      const res = await startGame(payload);
      if(res.gameId) {
          setCurrentGame({ id: res.gameId, type: selectedGameType, status: selectedGameType === 'handcricket' ? 'toss' : 'playing' });
      }
  };

  if (!user) {
    return (
      <div className="container center-container">
        {notification && <div className="notification-popup">{notification}</div>}
        <div className="card auth glass-card">
          <h1>🎮 Live Games</h1>
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

  if (currentGame) {
    if (currentGame.type === 'handcricket' && currentGame.status === 'toss') {
        return <TossScreen gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onTossComplete={() => setCurrentGame({ ...currentGame, status: 'playing' })} />;
    }
    
    if (currentGame.type === 'hidden-number') {
        return <HiddenNumberGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'rps') {
        return <RPSGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'evenodd') {
        return <EvenOddGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'tictactoe') {
        return <TicTacToeGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'snake-ladders') {
        return <SnakeLaddersGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'ludo') {
        return <LudoGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'memory-flip') {
        return <MemoryFlipGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    } else if (currentGame.type === 'memory-number') {
        return <MemoryNumberGame gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
    }
    // Default to hand cricket
    return <GameScreen gameId={currentGame.id} userEmail={user} username={username} onExit={(normal) => handleExitGame(currentGame.id, normal)} onPlayAgainBot={handlePlayAgainBot} />;
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
        <div className="nav-logo">🎮 Live Games</div>
        <div className="nav-links">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>🏠 Home</button>
          <button className={activeTab === 'friends' ? 'active' : ''} onClick={() => setActiveTab('friends')}>👥 Friends</button>
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>📜 History</button>
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>👤 Profile</button>
          <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>ℹ️ About</button>
        </div>
      </nav>

      <div className="main-content">
        {gameInvites.length > 0 && (
            <div className="invite-banner">
                <h3>🎮 You have {gameInvites.length} Game Invite(s)!</h3>
                {gameInvites.map((g, idx) => (
                    <div key={idx} className="invite-row">
                        <span>{g.username} invited you to play {GAMES.find(x => x.id === g.gameType)?.name || "a game"}!</span>
                        <div>
                            <button className="accept-btn" onClick={() => handleAcceptGameInvite(g)}>Accept</button>
                            <button className="reject-btn" onClick={() => handleRejectGameInvite(g)}>Reject</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'home' && (
            <div className="tab-content">
                <h2>Game Hub</h2>
                
                <div className="game-selector-grid">
                    {GAMES.map(g => (
                        <div 
                            key={g.id} 
                            className={`game-card ${selectedGameType === g.id ? 'selected' : ''}`}
                            onClick={() => setSelectedGameType(g.id)}
                        >
                            <h4>{g.name}</h4>
                            <p>{g.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="card glass-card mt-3">
                    <h3>👥 Play {GAMES.find(g => g.id === selectedGameType)?.name} with Friend</h3>
                    {['snake-ladders', 'ludo'].includes(selectedGameType) && (
                        <div style={{marginBottom: '15px'}}>
                            <label>Select Players: </label>
                            <select value={multiplayerCount} onChange={(e) => {
                                setMultiplayerCount(Number(e.target.value));
                                setSelectedFriends([]);
                            }} style={{padding: '5px', marginLeft: '10px', borderRadius: '5px'}}>
                                <option value={2}>2 Players</option>
                                <option value={3}>3 Players</option>
                                <option value={4}>4 Players</option>
                            </select>
                        </div>
                    )}
                    {friends.length === 0 ? <p className="empty">Add friends to play live matches!</p> : null}
                    <div className="user-list">
                        {friends.map(f => {
                            const isSelected = selectedFriends.includes(f.email);
                            const canSelectMore = selectedFriends.length < multiplayerCount - 1;
                            const isMulti = ['snake-ladders', 'ludo'].includes(selectedGameType) && multiplayerCount > 2;

                            return (
                                <div className={`user-card ${isSelected ? 'selected' : ''}`} key={f._id} style={{border: isSelected ? '2px solid #29b6f6' : ''}}>
                                    <div className="user-info">
                                        <span className={`status-dot ${f.isPlaying ? 'playing' : (f.isOnline ? 'online' : 'offline')}`}></span>
                                        <span className="user-name">{f.username} {f.isPlaying ? `(Playing ${GAMES.find(g => g.id === f.playingGame)?.name || 'Game'})` : ""}</span>
                                    </div>
                                    {isMulti ? (
                                        <button 
                                            className={isSelected ? "reject-btn" : "accept-btn"} 
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedFriends(prev => prev.filter(email => email !== f.email));
                                                } else if (canSelectMore) {
                                                    setSelectedFriends(prev => [...prev, f.email]);
                                                } else {
                                                    showNotification(`You can only select ${multiplayerCount - 1} friend(s) for a ${multiplayerCount}-player game.`);
                                                }
                                            }}
                                            disabled={f.isPlaying || !f.isOnline}
                                            style={{ opacity: (f.isPlaying || !f.isOnline) ? 0.5 : 1, cursor: (f.isPlaying || !f.isOnline) ? 'not-allowed' : 'pointer' }}
                                        >
                                            {isSelected ? "Deselect" : "Select"}
                                        </button>
                                    ) : (
                                        <button 
                                            className="invite-btn" 
                                            onClick={() => handleSendGameInvite(f.email)}
                                            disabled={f.isPlaying || !f.isOnline}
                                            style={{ opacity: (f.isPlaying || !f.isOnline) ? 0.5 : 1, cursor: (f.isPlaying || !f.isOnline) ? 'not-allowed' : 'pointer' }}
                                        >
                                            🎮 Invite
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {['snake-ladders', 'ludo'].includes(selectedGameType) && multiplayerCount > 2 && selectedFriends.length > 0 && (
                        <button 
                            className="primary-btn mt-3" 
                            onClick={async () => {
                                if (selectedFriends.length !== multiplayerCount - 1) {
                                    showNotification(`Please select exactly ${multiplayerCount - 1} friend(s).`);
                                    return;
                                }
                                await sendMultiplayerInvites({ fromEmail: user, toEmails: selectedFriends, gameType: selectedGameType });
                                showNotification(`Game invite sent to ${selectedFriends.length} friends!`);
                                setSelectedFriends([]);
                            }}
                        >
                            Send Multiplayer Invite ({selectedFriends.length}/{multiplayerCount - 1})
                        </button>
                    )}
                </div>

                {selectedGameType === 'handcricket' ? (
                    <div className="card glass-card mt-3">
                        <h3>🤖 Bot Game Modes (Hand Cricket)</h3>
                        <div className="modes-grid">
                            {botModes.map(m => (
                                <div key={m.id} className="mode-card" onClick={() => startBotMode(m.id)}>
                                    <h4>{m.name}</h4>
                                    <p>{m.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="card glass-card mt-3">
                        <h3>🤖 Play against Bot</h3>
                        <div className="modes-grid">
                            <div className="mode-card" onClick={() => startBotMode('bot_standard')}>
                                <h4>Play {GAMES.find(g => g.id === selectedGameType)?.name}</h4>
                                <p>Challenge the AI Bot!</p>
                            </div>
                        </div>
                    </div>
                )}
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
                                    <span className={`status-dot ${f.isPlaying ? 'playing' : (f.isOnline ? 'online' : 'offline')}`}></span>
                                    <span className="user-name">{f.username} {f.isPlaying ? `(Playing ${GAMES.find(g => g.id === f.playingGame)?.name || 'Game'})` : ""}</span>
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
                                    <span className={`status-dot ${u.isPlaying ? 'playing' : (u.isOnline ? 'online' : 'offline')}`}></span>
                                    <span className="user-name">{u.username} {u.isPlaying ? `(Playing ${GAMES.find(g => g.id === u.playingGame)?.name || 'Game'})` : ""}</span>
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
                        const isAbandoned = h.howOut && h.howOut.startsWith("Abandoned");
                        let abandonText = "ABANDONED";
                        if (isAbandoned) {
                            const parts = h.howOut.split(":");
                            if (parts.length > 1) {
                                const leaverEmail = parts[1];
                                if (leaverEmail === user) {
                                    abandonText = "You left";
                                } else {
                                    const opponentName = h.player1 === username ? h.player2 : h.player1;
                                    abandonText = opponentName === "Bot" ? "Bot left" : `${opponentName} left`;
                                }
                            }
                        }

                        return (
                            <div key={h._id} className={`history-card ${resultClass}`}>
                                <div className="history-header">
                                    <h4>{h.player1} vs {h.player2}</h4>
                                    <span className="history-mode">
                                        {GAMES.find(g => g.id === (h.gameType || 'handcricket'))?.name || "Game"}
                                        {h.mode && h.mode !== "friend" ? ` - ${botModes.find(m => m.id === h.mode)?.name || h.mode}` : ""}
                                    </span>
                                </div>
                                <p className="history-result">
                                    <strong>{resultStatus}</strong> {(h.gameType !== 'tictactoe') && `(${h.score1} vs ${h.score2})`}
                                </p>
                                <p className="history-details">How Out: {isAbandoned ? <span style={{color: '#ffeb3b', fontWeight: 'bold', background: 'rgba(255,235,59,0.2)', padding: '2px 6px', borderRadius: '4px'}}>{abandonText.toUpperCase()}</span> : h.howOut} • {new Date(h.date).toLocaleDateString()}</p>
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

        {activeTab === 'about' && (
            <div className="tab-content">
                <h2>ℹ️ About & Instructions</h2>
                <div className="card glass-card mb-3">
                    <h3>🏏 Hand Cricket</h3>
                    <p>Classic hand cricket multiplayer. Choose numbers 1-6.</p>
                    <ul style={{textAlign: 'left'}}>
                        <li>If both players choose the same number, the batter is <strong>OUT</strong>.</li>
                        <li>Otherwise, the batter scores the number they chose.</li>
                        <li>Try to chase the target!</li>
                    </ul>
                </div>
                <div className="card glass-card mb-3">
                    <h3>🔢 Hidden Number</h3>
                    <p>Guess the secret number.</p>
                    <ul style={{textAlign: 'left'}}>
                        <li>Set a secret number between 0-99.</li>
                        <li>Take turns guessing your opponent's number.</li>
                        <li>Use hints: <strong>Higher</strong> or <strong>Lower</strong> to narrow it down.</li>
                    </ul>
                </div>
                <div className="card glass-card mb-3">
                    <h3>✌️ Rock Paper Scissors</h3>
                    <p>Classic RPS tournament.</p>
                    <ul style={{textAlign: 'left'}}>
                        <li>Rock beats Scissors.</li>
                        <li>Scissors beats Paper.</li>
                        <li>Paper beats Rock.</li>
                        <li>First to win 3 rounds wins the match!</li>
                    </ul>
                </div>
                <div className="card glass-card mb-3">
                    <h3>🎲 Even-Odd Battle</h3>
                    <p>Even or Odd? Sum it up!</p>
                    <ul style={{textAlign: 'left'}}>
                        <li>Player 1 is ALWAYS <strong>Even</strong>. Player 2 is ALWAYS <strong>Odd</strong>.</li>
                        <li>Both players pick a number from 1 to 6.</li>
                        <li>If the sum is EVEN, Player 1 wins the round. If ODD, Player 2 wins.</li>
                        <li>First to 3 wins!</li>
                    </ul>
                </div>
                <div className="card glass-card mb-3">
                    <h3>❌ Tic Tac Toe ⭕</h3>
                    <p>Classic 3x3 grid game.</p>
                    <ul style={{textAlign: 'left'}}>
                        <li>Get 3 of your marks in a row (horizontal, vertical, or diagonal) to win.</li>
                        <li>If the board fills up without a winner, it's a draw.</li>
                    </ul>
                </div>
            </div>
        )}

      </div>

      <footer style={{ textAlign: 'center', padding: '20px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>Created by:</p>
          <p style={{ margin: 0, fontWeight: 'bold' }}>P. Ganesh Kumar</p>
          <p style={{ margin: 0, fontSize: '14px' }}><a href="mailto:gk044996@gmail.com" style={{ color: '#29b6f6', textDecoration: 'none' }}>gk044996@gmail.com</a></p>
      </footer>
    </div>
  );
}

export default App;