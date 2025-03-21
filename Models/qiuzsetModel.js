const mongoose = require('mongoose');

const QuizSetSchema = new mongoose.Schema({
    userId: Number,
    quizSet: [
        {
            question: String,
            options: [String],
            correct_option_id: Number,
            user_answer_id: Number
        }
    ],
    correctAnswers: Number,
    wrongAnswers: Number,
    startTime: Date,  // Test boshlanganda saqlanadi
    endTime: Date,    // Oxirgi savol yechilganda saqlanadi
    date: { type: Date, default: Date.now }
});

const QuizSet = mongoose.model('QuizSet', QuizSetSchema);

module.exports = QuizSet