import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../api';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await getLeaderboard();
                if (Array.isArray(data)) setLeaderboard(data);
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <div className="text-center mt-5">Loading leaderboard...</div>;

    return (
        <div className="tab-content">
            <h2>🏆 Global Leaderboard</h2>
            <div className="card glass-card">
                <div className="leaderboard-container">
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: '10px' }}>
                                <th>Rank</th>
                                <th>Player</th>
                                <th>Level</th>
                                <th>Wins</th>
                                <th>Win Rate</th>
                                <th>Streak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((user, index) => (
                                <tr key={index} className={`lb-row ${index < 3 ? 'top-3' : ''}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <td style={{ padding: '15px 5px', fontSize: index < 3 ? '1.5em' : '1em' }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <strong>{user.username}</strong>
                                        </div>
                                    </td>
                                    <td>⭐ {user.level}</td>
                                    <td>🏆 {user.wins}</td>
                                    <td>{user.winRate}%</td>
                                    <td>🔥 {user.streak}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
