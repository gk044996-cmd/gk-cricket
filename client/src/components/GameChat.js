import React, { useState, useEffect, useRef } from 'react';
import { sendChat, getGame } from '../api';
import './GameChat.css';

const GameChat = ({ gameId, userEmail }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setUnread(0);
        }
    }, [chatHistory, isOpen]);

    useEffect(() => {
        let isPolling = true;
        const fetchChat = async () => {
            if (!isPolling) return;
            try {
                const game = await getGame(gameId);
                if (game && game.chat) {
                    setChatHistory(prev => {
                        if (prev.length < game.chat.length && !isOpen) {
                            setUnread(game.chat.length - prev.length);
                        }
                        return game.chat;
                    });
                }
            } catch (err) { console.error(err); }
        };
        fetchChat();
        const interval = setInterval(fetchChat, 2000);
        return () => { isPolling = false; clearInterval(interval); };
    }, [gameId, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        const msgToSend = message.trim();
        setMessage('');
        try {
            await sendChat({ gameId, email: userEmail, message: msgToSend });
        } catch (err) {
            console.error('Chat error', err);
        }
    };

    const quickEmotes = ['👍', '😂', 'GG!', 'Nice move!', 'Oops!', 'Hurry up!'];

    const sendEmote = async (emote) => {
        try {
            await sendChat({ gameId, email: userEmail, message: emote });
        } catch (err) { console.error('Chat error', err); }
    };

    return (
        <div className={`game-chat-wrapper ${isOpen ? 'open' : 'closed'}`}>
            <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                💬 Chat {unread > 0 && !isOpen && <span className="unread-badge">{unread}</span>}
            </button>
            
            {isOpen && (
                <div className="game-chat-container">
                    <div className="chat-messages">
                        {chatHistory.length === 0 ? (
                            <div className="text-center" style={{ color: '#aaa', marginTop: '50px' }}>Say hello! 👋</div>
                        ) : (
                            chatHistory.map((c, i) => (
                                <div key={i} className={`chat-bubble ${c.sender.includes(userEmail.split('@')[0]) ? 'me' : 'other'}`}>
                                    <span className="chat-sender">{c.sender}</span>
                                    <div className="chat-text">{c.message}</div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    
                    <div className="chat-input-area">
                        <div className="quick-emotes">
                            {quickEmotes.map((em, i) => (
                                <span key={i} onClick={() => sendEmote(em)}>{em}</span>
                            ))}
                        </div>
                        <form onSubmit={handleSend} className="chat-form">
                            <input 
                                type="text" 
                                value={message} 
                                onChange={e => setMessage(e.target.value)} 
                                placeholder="Type a message..." 
                                maxLength={50}
                            />
                            <button type="submit">➤</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameChat;
