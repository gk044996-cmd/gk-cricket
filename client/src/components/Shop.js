import React, { useState, useEffect } from 'react';
import { buyShopItem, equipShopItem, getUserProfile } from '../api';
import { playSound } from './AudioSystem';
import './Shop.css';

export const SHOP_ITEMS = {
    themes: [
        { id: 'theme_dark', name: 'Dark Theme', price: 100, rarity: 'Common', desc: 'A sleek, pure dark background.', color: '#1a1a1a' },
        { id: 'theme_cricket', name: 'Pitch Green', price: 200, rarity: 'Common', desc: 'Classic cricket pitch green.', color: '#2e7d32' },
        { id: 'theme_ocean', name: 'Ocean Theme', price: 400, rarity: 'Rare', desc: 'Deep blue ocean vibes.', color: '#006994' },
        { id: 'theme_nature', name: 'Nature Theme', price: 400, rarity: 'Rare', desc: 'Lush green and earthy.', color: '#388E3C' },
        { id: 'theme_neon', name: 'Neon Cyber', price: 800, rarity: 'Epic', desc: 'Vibrant neon purple & blue glow.', color: 'linear-gradient(135deg, #2b00ff, #ff00c8)' },
        { id: 'theme_retro', name: 'Retro 80s', price: 800, rarity: 'Epic', desc: 'Outrun sunset style.', color: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' },
        { id: 'theme_cyberpunk', name: 'Cyberpunk', price: 1500, rarity: 'Legendary', desc: 'High tech, low life.', color: '#fcee0a' },
        { id: 'theme_fire', name: 'Fire Theme', price: 1500, rarity: 'Legendary', desc: 'Blazing hot interface.', color: '#ff4e50' },
        { id: 'theme_ice', name: 'Ice Theme', price: 1500, rarity: 'Legendary', desc: 'Frosty cool interface.', color: '#00c9ff' },
        { id: 'theme_galaxy', name: 'Galaxy Theme', price: 3000, rarity: 'Mythic', desc: 'Stars and space nebulas.', color: '#090a0f' },
        { id: 'theme_matrix', name: 'Matrix Theme', price: 3000, rarity: 'Mythic', desc: 'Digital rain effect.', color: '#000' },
        { id: 'theme_royal', name: 'Royal Gold', price: 5000, rarity: 'Mythic', desc: 'Pure luxury.', color: 'linear-gradient(135deg, #bf953f, #fcf6ba)' },
        { id: 'theme_rgb', name: 'RGB Gaming', price: 5000, rarity: 'Mythic', desc: 'Rainbow gaming setup vibes.', color: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' }
    ],
    diceSkins: [
        { id: 'dice_wood', name: 'Wooden Dice', price: 100, rarity: 'Common', desc: 'Classic wood finish.', emoji: '🎲' },
        { id: 'dice_stone', name: 'Stone Dice', price: 200, rarity: 'Common', desc: 'Heavy stone.', emoji: '🪨' },
        { id: 'dice_ice', name: 'Ice Dice', price: 500, rarity: 'Rare', desc: 'Frosty and cool.', emoji: '❄️' },
        { id: 'dice_neon', name: 'Neon Dice', price: 600, rarity: 'Rare', desc: 'Glowing edges.', emoji: '🌟' },
        { id: 'dice_fire', name: 'Fire Dice', price: 1000, rarity: 'Epic', desc: 'Leaves a burning trail.', emoji: '🔥' },
        { id: 'dice_shadow', name: 'Shadow Dice', price: 1200, rarity: 'Epic', desc: 'Dark and mysterious.', emoji: '🌑' },
        { id: 'dice_gold', name: 'Gold Dice', price: 2500, rarity: 'Legendary', desc: 'Solid 24k gold dice.', emoji: '👑' },
        { id: 'dice_crystal', name: 'Crystal Dice', price: 2500, rarity: 'Legendary', desc: 'Transparent crystal.', emoji: '💎' },
        { id: 'dice_lava', name: 'Lava Dice', price: 3000, rarity: 'Legendary', desc: 'Molten rock.', emoji: '🌋' },
        { id: 'dice_diamond', name: 'Diamond Dice', price: 5000, rarity: 'Mythic', desc: 'Flawless diamond.', emoji: '💎' },
        { id: 'dice_rgb', name: 'RGB Dice', price: 6000, rarity: 'Mythic', desc: 'Color changing glow.', emoji: '🌈' },
        { id: 'dice_galaxy', name: 'Galaxy Dice', price: 8000, rarity: 'Mythic', desc: 'Contains a universe.', emoji: '🌌' }
    ],
    cardSkins: [
        { id: 'card_wood', name: 'Wooden Back', price: 150, rarity: 'Common', desc: 'Classic wooden texture.', emoji: '🪵' },
        { id: 'card_pixel', name: 'Pixel Cards', price: 200, rarity: 'Common', desc: 'Retro 8-bit style.', emoji: '👾' },
        { id: 'card_emoji', name: 'Emoji Cards', price: 400, rarity: 'Rare', desc: 'Fun emoji patterns.', emoji: '😀' },
        { id: 'card_glass', name: 'Glass Cards', price: 600, rarity: 'Rare', desc: 'Frosted glass look.', emoji: '🪟' },
        { id: 'card_glow', name: 'Glow Cards', price: 1000, rarity: 'Epic', desc: 'Neon border for memory cards.', emoji: '✨' },
        { id: 'card_fire', name: 'Fire Cards', price: 1200, rarity: 'Epic', desc: 'Burning edges.', emoji: '🔥' },
        { id: 'card_gold', name: 'Golden Edge', price: 2500, rarity: 'Legendary', desc: 'Luxury card design.', emoji: '👑' },
        { id: 'card_anime', name: 'Anime Cards', price: 3000, rarity: 'Legendary', desc: 'Anime style artwork.', emoji: '🌸' },
        { id: 'card_space', name: 'Space Cards', price: 5000, rarity: 'Mythic', desc: 'Deep space imagery.', emoji: '🚀' },
        { id: 'card_rgb', name: 'RGB Cards', price: 6000, rarity: 'Mythic', desc: 'Color cycling borders.', emoji: '🌈' }
    ],
    avatars: [
        { id: 'avatar_ninja', name: 'Ninja Mask', price: 500, rarity: 'Rare', desc: 'Stealthy.', emoji: '🥷' },
        { id: 'avatar_bot', name: 'Cyborg', price: 600, rarity: 'Rare', desc: 'Beep boop.', emoji: '🤖' },
        { id: 'avatar_alien', name: 'Alien', price: 1000, rarity: 'Epic', desc: 'Out of this world.', emoji: '👽' },
        { id: 'avatar_ghost', name: 'Ghost', price: 1000, rarity: 'Epic', desc: 'Spooky.', emoji: '👻' },
        { id: 'avatar_king', name: 'The King', price: 2500, rarity: 'Legendary', desc: 'Royal avatar.', emoji: '🤴' },
        { id: 'avatar_demon', name: 'Demon', price: 3000, rarity: 'Legendary', desc: 'Underworld boss.', emoji: '👹' },
        { id: 'avatar_dragon', name: 'Dragon', price: 5000, rarity: 'Mythic', desc: 'Fire breather.', emoji: '🐉' },
        { id: 'avatar_god', name: 'Deity', price: 8000, rarity: 'Mythic', desc: 'Supreme being.', emoji: '⚡' }
    ],
    borders: [
        { id: 'border_silver', name: 'Silver Border', price: 300, rarity: 'Common', desc: 'Sleek silver.', color: '#bdc3c7' },
        { id: 'border_gold', name: 'Gold Border', price: 800, rarity: 'Rare', desc: 'Shiny gold.', color: '#f1c40f' },
        { id: 'border_neon', name: 'Neon Glow', price: 1500, rarity: 'Epic', desc: 'Cyan glowing border.', color: '#0ff' },
        { id: 'border_fire', name: 'Fire Border', price: 2500, rarity: 'Legendary', desc: 'Animated fire border.', color: '#ff4e50' },
        { id: 'border_electric', name: 'Electric', price: 3000, rarity: 'Legendary', desc: 'Lightning crackles.', color: '#00bcd4' },
        { id: 'border_rainbow', name: 'RGB Border', price: 5000, rarity: 'Mythic', desc: 'Animated rainbow edge.', color: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' }
    ],
    emotes: [
        { id: 'emote_laugh', name: 'Laugh', price: 200, rarity: 'Common', desc: 'Haha!', emoji: '😂' },
        { id: 'emote_cry', name: 'Cry', price: 200, rarity: 'Common', desc: 'So sad.', emoji: '😭' },
        { id: 'emote_angry', name: 'Angry', price: 400, rarity: 'Rare', desc: 'Mad!', emoji: '😡' },
        { id: 'emote_wow', name: 'Wow', price: 400, rarity: 'Rare', desc: 'Amazed.', emoji: '😮' },
        { id: 'emote_clap', name: 'Clap', price: 800, rarity: 'Epic', desc: 'Well played.', emoji: '👏' },
        { id: 'emote_gg', name: 'GG', price: 1000, rarity: 'Epic', desc: 'Good Game.', emoji: '🎮' },
        { id: 'emote_fire', name: 'Fire', price: 2000, rarity: 'Legendary', desc: 'On fire!', emoji: '🔥' },
        { id: 'emote_troll', name: 'Troll', price: 3000, rarity: 'Mythic', desc: 'Trololol.', emoji: '🤡' }
    ],
    gameEffects: [
        { id: 'effect_bat_fire', name: 'Fire Bat', price: 1500, rarity: 'Epic', desc: 'Bat leaves a trail of fire.' },
        { id: 'effect_ball_trail', name: 'Ball Trail', price: 2000, rarity: 'Legendary', desc: 'Comet trail for the ball.' },
        { id: 'effect_out_explosion', name: 'Explosive Out', price: 3000, rarity: 'Legendary', desc: 'Massive explosion when OUT.' },
        { id: 'effect_ludo_trail', name: 'Ludo Trail', price: 1000, rarity: 'Epic', desc: 'Tokens leave a path.' },
        { id: 'effect_snake_bite', name: 'Venom Bite', price: 2500, rarity: 'Legendary', desc: 'Green venom effect on snake.' }
    ],
    winEffects: [
        { id: 'win_confetti', name: 'Confetti', price: 1000, rarity: 'Epic', desc: 'Standard confetti pop.' },
        { id: 'win_fireworks', name: 'Fireworks', price: 3000, rarity: 'Legendary', desc: 'Huge fireworks display.' },
        { id: 'win_gold_rain', name: 'Gold Rain', price: 5000, rarity: 'Mythic', desc: 'Raining gold coins.' },
        { id: 'win_gg_spam', name: 'GG Spam', price: 5000, rarity: 'Mythic', desc: 'GG drops from the sky.' }
    ]
};

const RARITY_COLORS = {
    Common: '#bdc3c7',
    Rare: '#3498db',
    Epic: '#9b59b6',
    Legendary: '#f1c40f',
    Mythic: '#ff0055'
};

const Shop = ({ userEmail }) => {
    const [activeTab, setActiveTab] = useState('themes');
    const [coins, setCoins] = useState(0);
    const [inventory, setInventory] = useState([]);
    const [equipped, setEquipped] = useState({});
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("price_asc");
    const [previewItem, setPreviewItem] = useState(null);
    const [dailyFeatured, setDailyFeatured] = useState(null);

    const loadProfile = async () => {
        try {
            const data = await getUserProfile(userEmail);
            if (data && data.email) {
                setCoins(data.coins || 0);
                setInventory(data.inventory || []);
                setEquipped(data.equipped || {});
            }
            setLoading(false);
            
            // Pick a random daily featured item based on date
            const todayStr = new Date().toDateString();
            let hash = 0;
            for(let i=0; i<todayStr.length; i++) hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
            const allItems = Object.values(SHOP_ITEMS).flat();
            const dailyIdx = Math.abs(hash) % allItems.length;
            setDailyFeatured(allItems[dailyIdx]);
        } catch (e) {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showMessage = (m, isError = false) => {
        setMsg({ text: m, isError });
        setTimeout(() => setMsg(null), 3000);
    };

    const handleBuy = async (item) => {
        if (inventory.includes(item.id)) return;
        if (coins < item.price) {
            playSound('lose');
            showMessage("Not enough coins!", true);
            return;
        }

        const res = await buyShopItem({ email: userEmail, itemId: item.id, price: item.price });
        if (res.error) {
            playSound('lose');
            showMessage(res.error, true);
        } else {
            playSound('coin');
            setCoins(res.coins);
            setInventory(res.inventory);
            showMessage(`Successfully bought ${item.name}!`);
            setPreviewItem(null);
        }
    };

    const handleEquip = async (item, category) => {
        if (!inventory.includes(item.id)) return;
        
        let equipCategory = category;
        let finalItemId = item.id;
        
        // Emotes logic: maybe just equip as favorite?
        if (category === 'emotes') {
            equipCategory = 'emotes';
            // for simplicity, emotes could be a string if one, or array. We'll store string in single category.
        }

        const res = await equipShopItem({ email: userEmail, category: equipCategory, itemId: finalItemId });
        if (res.error) {
            showMessage(res.error, true);
        } else {
            playSound('click');
            setEquipped(res.equipped);
            showMessage(`Equipped ${item.name}!`);
        }
    };
    
    const getCategoryKey = (tab, itemId) => {
        if (tab === 'themes') return 'theme';
        if (tab === 'diceSkins') return 'diceSkin';
        if (tab === 'cardSkins') return 'cardSkin';
        if (tab === 'avatars') return 'avatar';
        if (tab === 'borders') return 'border';
        if (tab === 'emotes') return 'emotes';
        if (tab === 'gameEffects') {
            if(itemId.includes('bat')) return 'batEffect';
            if(itemId.includes('ball')) return 'ballEffect';
            if(itemId.includes('ludo')) return 'ludoEffect';
            if(itemId.includes('snake')) return 'snakeEffect';
            if(itemId.includes('out')) return 'outEffect';
            return 'gameEffect';
        }
        if (tab === 'winEffects') return 'winEffect';
        return 'theme';
    };

    if (loading) return <div className="text-center mt-5">Loading Shop...</div>;

    let filteredItems = SHOP_ITEMS[activeTab].filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortBy === 'price_asc') filteredItems.sort((a,b) => a.price - b.price);
    if (sortBy === 'price_desc') filteredItems.sort((a,b) => b.price - a.price);
    if (sortBy === 'rarity') {
        const rVals = { Common: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };
        filteredItems.sort((a,b) => rVals[b.rarity] - rVals[a.rarity]);
    }

    return (
        <div className="tab-content shop-page">
            <div className="shop-header">
                <h2>🛒 The Emporium</h2>
                <div className="shop-coins-badge">
                    🪙 {coins.toLocaleString()}
                </div>
            </div>

            {msg && (
                <div className={`alert-box shop-alert ${msg.isError ? 'error' : 'success'}`}>
                    {msg.text}
                </div>
            )}
            
            {dailyFeatured && (
                <div className="daily-featured-banner mb-4">
                    <div className="daily-glow" style={{background: RARITY_COLORS[dailyFeatured.rarity]}}></div>
                    <div className="daily-content">
                        <h3>🔥 Daily Featured: {dailyFeatured.name}</h3>
                        <p>{dailyFeatured.desc}</p>
                        <button className="primary-btn mt-2" onClick={() => setPreviewItem(dailyFeatured)}>Preview Item</button>
                    </div>
                </div>
            )}

            <div className="shop-controls mb-3">
                <input 
                    type="text" 
                    placeholder="Search items..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="shop-search"
                />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="shop-sort">
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rarity">Rarity</option>
                </select>
            </div>

            <div className="shop-categories-scroll">
                {Object.keys(SHOP_ITEMS).map(cat => (
                    <button 
                        key={cat} 
                        className={`category-btn ${activeTab === cat ? 'active' : ''}`}
                        onClick={() => { playSound('click'); setActiveTab(cat); }}
                    >
                        {cat.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="shop-grid">
                {filteredItems.map(item => {
                    const isOwned = inventory.includes(item.id);
                    const equipCat = getCategoryKey(activeTab, item.id);
                    const isEquipped = equipped[equipCat] === item.id;

                    return (
                        <div 
                            key={item.id} 
                            className={`shop-item-card rarity-${item.rarity.toLowerCase()} ${isOwned ? 'owned' : ''}`}
                            onClick={() => setPreviewItem(item)}
                        >
                            <div className="item-icon" style={{ background: item.color || 'rgba(0,0,0,0.3)' }}>
                                {item.emoji || ''}
                            </div>
                            <div className="item-info">
                                <span className="item-rarity" style={{color: RARITY_COLORS[item.rarity]}}>{item.rarity}</span>
                                <h3>{item.name}</h3>
                                <p>{item.desc}</p>
                            </div>
                            
                            <div className="item-actions" onClick={e => e.stopPropagation()}>
                                {isOwned ? (
                                    <button 
                                        className={`equip-btn ${isEquipped ? 'equipped' : ''}`}
                                        onClick={() => handleEquip(item, equipCat)}
                                    >
                                        {isEquipped ? '✅ EQUIPPED' : 'EQUIP'}
                                    </button>
                                ) : (
                                    <button 
                                        className={`buy-btn ${coins >= item.price ? 'affordable' : 'locked'}`}
                                        onClick={() => handleBuy(item)}
                                    >
                                        🪙 {item.price.toLocaleString()}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {previewItem && (
                <div className="preview-modal-overlay" onClick={() => setPreviewItem(null)}>
                    <div className={`preview-modal rarity-${previewItem.rarity.toLowerCase()}`} onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setPreviewItem(null)}>✖</button>
                        <h2>{previewItem.name}</h2>
                        <span className="item-rarity mb-3" style={{color: RARITY_COLORS[previewItem.rarity], display: 'inline-block'}}>{previewItem.rarity}</span>
                        
                        <div className="preview-showcase" style={{ background: previewItem.color || '#222' }}>
                            <span className="preview-emoji">{previewItem.emoji || '✨'}</span>
                        </div>
                        
                        <p className="preview-desc mt-3">{previewItem.desc}</p>
                        
                        <div className="preview-actions mt-4">
                            {inventory.includes(previewItem.id) ? (
                                <button className="equip-btn primary-btn" onClick={() => handleEquip(previewItem, getCategoryKey(Object.keys(SHOP_ITEMS).find(k => SHOP_ITEMS[k].includes(previewItem)), previewItem.id))}>Equip Now</button>
                            ) : (
                                <button className="buy-btn primary-btn affordable" onClick={() => handleBuy(previewItem)}>Buy for 🪙 {previewItem.price}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shop;
