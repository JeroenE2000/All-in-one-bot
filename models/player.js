const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    balance: { type: Number, default: 10000 },
    lastDailyClaim: { type: Date, default: null },
    hands: [{ cards: [Object], score: Number }], 
    currentHandIndex: { type: Number, default: 0 }
});

module.exports = mongoose.model('Player', playerSchema);
