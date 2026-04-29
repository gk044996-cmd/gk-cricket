const BASE_URL = "https://gk-cricket.onrender.com";

// 🔐 AUTH
export const registerUser = async (data) => {
    const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    return res.json();
};

export const loginUser = async (data) => {
    const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    return res.json();
};

export const logoutUser = async (data) => {
    const res = await fetch(`${BASE_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const updateProfile = async (data) => {
    const res = await fetch(`${BASE_URL}/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const heartbeat = async (data) => {
    const res = await fetch(`${BASE_URL}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getAllUsers = async (email) => {
    const res = await fetch(`${BASE_URL}/users/${email}`);
    return res.json();
};



// 🤝 FRIEND SYSTEM

// Send friend request
export const sendRequest = async (data) => {
    const res = await fetch(`${BASE_URL}/send-request`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    return res.json();
};

// Accept friend request
export const acceptRequest = async (data) => {
    const res = await fetch(`${BASE_URL}/accept-request`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    return res.json();
};

// Get friends list
export const getFriends = async (email) => {
    const res = await fetch(`${BASE_URL}/friends/${email}`);
    return res.json();
};

// Get pending requests
export const getRequests = async (email) => {
    const res = await fetch(`${BASE_URL}/requests/${email}`);
    return res.json();
};

export const removeFriend = async (data) => {
    const res = await fetch(`${BASE_URL}/remove-friend`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

// 🏏 GAME SYSTEM

export const startGame = async (data) => {
    const res = await fetch(`${BASE_URL}/start-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const completeToss = async (data) => {
    const res = await fetch(`${BASE_URL}/complete-toss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const playTurn = async (data) => {
    const res = await fetch(`${BASE_URL}/play-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getGame = async (id) => {
    const res = await fetch(`${BASE_URL}/game/${id}`);
    return res.json();
};

export const sendGameInvite = async (data) => {
    const res = await fetch(`${BASE_URL}/send-game-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const acceptGameInvite = async (data) => {
    const res = await fetch(`${BASE_URL}/accept-game-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const rejectGameInvite = async (data) => {
    const res = await fetch(`${BASE_URL}/reject-game-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getGameInvites = async (email) => {
    const res = await fetch(`${BASE_URL}/game-invites/${email}`);
    return res.json();
};

export const playLiveTurn = async (data) => {
    const res = await fetch(`${BASE_URL}/play-live-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const playHiddenNumber = async (data) => {
    const res = await fetch(`${BASE_URL}/play-hidden-number`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const playRPS = async (data) => {
    const res = await fetch(`${BASE_URL}/play-rps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const playEvenOdd = async (data) => {
    const res = await fetch(`${BASE_URL}/play-even-odd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const playTicTacToe = async (data) => {
    const res = await fetch(`${BASE_URL}/play-tictactoe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const leaveGame = async (data) => {
    const res = await fetch(`${BASE_URL}/leave-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getActiveGame = async (email) => {
    const res = await fetch(`${BASE_URL}/active-game/${email}`);
    return res.json();
};

export const selectTossChoice = async (data) => {
    const res = await fetch(`${BASE_URL}/select-toss-choice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const flipCoin = async (data) => {
    const res = await fetch(`${BASE_URL}/flip-coin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const selectBatBowl = async (data) => {
    const res = await fetch(`${BASE_URL}/select-bat-bowl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getHistory = async (email) => {
    const res = await fetch(`${BASE_URL}/history/${email}`);
    return res.json();
};
