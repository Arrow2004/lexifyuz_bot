const mongoose = require('mongoose');
const UserStats = mongoose.model('user_stats', new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    correctAnswers: { type: Number, default: 0 },
    totalAnswers: { type: Number, default: 0 }
}));
const User = mongoose.model('User', new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    firstName: {type: String}
}, { timestamps: true }))
module.exports = { UserStats,User }