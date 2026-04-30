require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('./models/Game');
mongoose.connect(process.env.MONGO_URI).then(async () => {
   const games = await Game.find({gameType: {$in: ['memory-flip', 'memory-number', 'ludo', 'snake-ladders']}}).sort({_id: -1}).limit(4);
   console.log(JSON.stringify(games, null, 2));
   process.exit(0);
});
