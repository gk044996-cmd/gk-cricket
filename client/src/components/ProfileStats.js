import React, { useState, useEffect } from 'react';
import { getUserProfile, updateProfileDetails } from '../api';

const ProfileStats = ({ userEmail, currentUsername, equipped }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ username: '', bio: '', profilePicture: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getUserProfile(userEmail);
                if (data.email) {
                    setProfile(data);
                    setForm({ username: data.username, bio: data.bio || '', profilePicture: data.profilePicture || '' });
                }
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchProfile();
    }, [userEmail]);

    const handleSave = async () => {
        const res = await updateProfileDetails({ email: userEmail, username: form.username, bio: form.bio, profilePicture: form.profilePicture });
        if (res.email) {
            setProfile(res);
            setEditMode(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, profilePicture: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) return <div className="text-center mt-5">Loading profile...</div>;
    if (!profile) return <div className="text-center mt-5">Profile not found.</div>;

    const stats = profile.stats || {};
    const winRate = stats.totalMatches ? Math.round((stats.totalWins || 0) / stats.totalMatches * 100) : 0;
    
    const avatarMap = { avatar_ninja: '🥷', avatar_king: '🤴', avatar_alien: '👽', avatar_bot: '🤖' };
    const displayAvatar = (equipped?.avatar && equipped.avatar !== 'default') ? avatarMap[equipped.avatar] : null;

    return (
        <div className="tab-content profile-page">
            <div className="card glass-card text-center">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                    <div className={`profile-pic ${equipped?.border || ''}`} style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#ff9800', fontSize: '3em', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 15px rgba(255,152,0,0.5)', overflow: 'hidden', backgroundSize: 'cover', backgroundImage: (profile.profilePicture && !displayAvatar) ? `url(${profile.profilePicture})` : 'none' }}>
                        {displayAvatar ? displayAvatar : (!profile.profilePicture && profile.username.charAt(0).toUpperCase())}
                    </div>
                    {editMode ? (
                        <div style={{ marginTop: '15px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.8em', color: '#aaa', display: 'block', marginBottom: '5px' }}>Profile Picture</label>
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.8em' }} />
                                {form.profilePicture && <div style={{ marginTop: '10px', width: '50px', height: '50px', borderRadius: '50%', background: `url(${form.profilePicture}) center/cover` }}></div>}
                            </div>
                            <input className="mb-2" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Username" style={{ padding: '8px', width: '100%', borderRadius: '5px' }} />
                            <textarea className="mb-2" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Bio..." style={{ padding: '8px', width: '100%', borderRadius: '5px' }} />
                            <div>
                                <button className="primary-btn mr-2" onClick={handleSave}>Save</button>
                                <button className="reject-btn" onClick={() => setEditMode(false)}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginTop: '15px' }}>
                            <h2 style={{ margin: 0 }}>{profile.username} <button className="edit-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setEditMode(true)}>✏️</button></h2>
                            <p style={{ fontStyle: 'italic', color: '#ccc' }}>{profile.bio || 'No bio added yet.'}</p>
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '10px' }}>
                                <span className="badge" style={{ background: '#4CAF50', padding: '5px 10px', borderRadius: '20px' }}>⭐ Lvl {profile.level || 1}</span>
                                <span className="badge" style={{ background: '#2196F3', padding: '5px 10px', borderRadius: '20px' }}>🪙 {profile.coins || 0} Coins</span>
                                <span className="badge" style={{ background: '#9c27b0', padding: '5px 10px', borderRadius: '20px' }}>✨ {profile.xp || 0} XP</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginTop: '30px' }}>
                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px' }}>
                        <h4>Matches</h4>
                        <h2>{stats.totalMatches || 0}</h2>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px' }}>
                        <h4>Wins</h4>
                        <h2 style={{ color: '#4CAF50' }}>{stats.totalWins || 0}</h2>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px' }}>
                        <h4>Win Rate</h4>
                        <h2>{winRate}%</h2>
                    </div>
                    <div className="stat-box" style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '10px' }}>
                        <h4>Best Streak</h4>
                        <h2 style={{ color: '#ff9800' }}>🔥 {stats.bestStreak || 0}</h2>
                    </div>
                </div>

                {stats.gameStats && Object.keys(stats.gameStats).length > 0 && (
                    <div className="game-stats mt-4 text-left">
                        <h3 className="mb-3">Game-wise Stats</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.entries(stats.gameStats).map(([gameType, stat]) => (
                                <div key={gameType} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{gameType.replace('-', ' ')}</span>
                                    <span>{stat.won} Wins / {stat.played} Played</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileStats;
