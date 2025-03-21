const { Telegraf } = require('telegraf');
const dotenv = require("dotenv");
const mongoose = require('mongoose');
const Word = require("./Models/wordModel")
const QuizSet = require("./Models/qiuzsetModel")
const {User} = require("./Models/userModel")
const cron = require('node-cron');
dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN);

// MongoDB-ga ulanish
mongoose.connect('mongodb+srv://root:' + process.env.DB_PASSWORD + '@cluster0.ufftb.mongodb.net/lexifyuz', {
}).then(e => {
    console.log("Bazaga ulanish amalga oshirildi")
}).catch(err => {
    console.log(err)
});

const userQuizzes = new Map();  // { chatId: { userId, quizzes } }

// Tasodifiy so‘zlarni olish
async function getRandomWords(limit) {
    let words = await Word.find();
    words = words.sort(() => Math.random() - 0.5).slice(0, limit);
    return words;
}

// Quiz yaratish
async function generateQuizQuestions() {
    const words = await getRandomWords(10); // 10 ta tasodifiy so‘z
    let quizzes = [];

    for (let word of words) {
        let options = await getRandomWords(3); // 3 ta noto‘g‘ri javob
        options.push(word); // To‘g‘ri javob qo‘shiladi

        // Variantlarni shuffle qilish
        options = options.sort(() => Math.random() - 0.5);
        let correctIndex = options.findIndex(opt => opt._id.toString() === word._id.toString());

        quizzes.push({
            question: `"${word.word_en}" so'zining tarjimasi qaysi?`,
            options: options.map(opt => opt.word_uz),
            correct_option_id: correctIndex
        });
    }
    return quizzes;
}

// Quiz yuborish
async function sendNextQuiz(chatId) {
    try {
        let session = userQuizzes.get(chatId);

        if (session && session.quizzes.length > 0) {
            let quiz = session.quizzes.shift();
            session.lastQuiz = quiz;
            userQuizzes.set(chatId, session);

            // Agar bu yangi 10 talik bo‘lsa, yangi `QuizSet` yaratamiz
            if (session.quizzes.length === 9) {
                const newQuizSet = new QuizSet({
                    userId: session.userId,
                    quizSet: [],
                    correctAnswers: 0,
                    wrongAnswers: 0
                });
                await newQuizSet.save();
            }

            await bot.telegram.sendPoll(chatId, quiz.question, quiz.options, {
                type: 'quiz',
                correct_option_id: quiz.correct_option_id,
                is_anonymous: false,
                explanation: 'Ingliz tilini yaxshiroq o‘rganing! 📚',
                open_period: 30
            });
        } else {
            bot.telegram.sendMessage(chatId, "🏆 Sizning testlaringiz tugadi! Yana davom etish uchun /quiz yozing.");
        }
    } catch (error) {
        console.log(error)
    }
}


//daily quizes

async function generateQuiz() {
    let words = await Word.aggregate([{ $sample: { size: 4 } }]); // 4 ta so‘z tanlash
    if (words.length < 4) return null;

    let correctWord = words[0]; // To‘g‘ri javob
    let options = words.sort(() => Math.random() - 0.5); // Aralashtirish

    return {
        question: `"${correctWord.word_en}" so‘zining tarjimasi qaysi?`,
        options: options.map(opt => opt.word_uz),
        correct_option_id: options.findIndex(opt => opt._id.toString() === correctWord._id.toString())
    };
}

// **Foydalanuvchilarga quiz yuborish**
async function sendDailyQuiz() {
    try {
        userIds = await User.find().select('userId -_id')
        console.log(userIds)
        const quiz = await generateQuiz();
        for (let user of userIds) {
            if (quiz) {
                await bot.telegram.sendPoll(user.userId, quiz.question, quiz.options, {
                    type: 'quiz',
                    correct_option_id: quiz.correct_option_id,
                    is_anonymous: false,
                    explanation: 'Keling, ingliz tilini o‘rganamiz! 📚'
                });
            }
        }
    } catch (error) {
        console.log(error)
    }
}


cron.schedule("0 8,11,14,17,20 * * *", () => {
    console.log("📢 Har kungi quiz yuborildi!");
    sendDailyQuiz();
}, {
    scheduled: true,
    timezone: "Asia/Tashkent" // Toshkent vaqti bo‘yicha
});

bot.command('start', async (ctx)=>{
    try {
        const userId = ctx.from.id;
        const firstName = ctx.chat.first_name
        let user = await User.findOne({userId: userId})
        if (!user){
            user = await User.create({userId,firstName})
            ctx.reply(`Assalomu alaykum. Botimizga xush kelibsiz!
                Bot yordamida siz ingliz tiliga oid yangi so'zlarni  yanada osonroq o'rganishingiz mumkin.
                /quiz - 10 talik test ishlashingiz mumkim
                /stats - o'z ishlagan testlaringiz statistikasini ko'rib borishingiz mumkin`)
        }else{
            ctx.reply(`Assalomu alaykum. Botimizga xush kelibsiz!
                Bot yordamida siz ingliz tiliga oid yangi so'zlarni  yanada osonroq o'rganishingiz mumkin.
                /quiz - 10 talik test ishlashingiz mumkim
                /stats - o'z ishlagan testlaringiz statistikasini ko'rib borishingiz mumkin`)
        }

    } catch (error) {
        console.error(error);
        ctx.reply("Xatolik yuzaga keldi. Iltimos adminga habar bering! @akbar_abdusattorov");
    }
})

// `/quiz` komandasi – birinchi testni yuborish
bot.command('quiz', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const quizzes = await generateQuizQuestions();

        if (quizzes.length > 0) {
            userQuizzes.set(chatId, { userId, quizzes, startTime: new Date() });  // ⏳ Start vaqtini saqlash
            sendNextQuiz(chatId);
        } else {
            ctx.reply("Xatolik yuz berdi, qayta urinib ko‘ring.");
        }
    } catch (err) {
        console.error(err);
        ctx.reply("Xatolik yuzaga keldi. Iltimos adminga habar bering! @akbar_abdusattorov");
    }
});


//Statistika uchun
bot.command('stats', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const stats = await QuizSet.find({ userId }).sort({ date: -1 });
        if (!stats.length) {
            return ctx.reply("📊 Siz hali birorta test ishlamagansiz!");
        }
        let message = "📊 Sizning statistikalaringiz:\n";
        stats.forEach((set, index) => {
            message += `\n📝 Test #${index + 1} (${set.date.toLocaleDateString()})\n`;
            message += `✅ To‘g‘ri javoblar: ${set.correctAnswers}\n`;
            message += `❌ Noto‘g‘ri javoblar: ${set.wrongAnswers}\n`;
            message += `----------------------------------`;
        });
        ctx.reply(message);
    } catch (error) {
        console.log(error)
        ctx.reply("Xatolik yuzaga keldi. Iltimos adminga habar bering! @akbar_abdusattorov");
    }
});


// Foydalanuvchi javob berganida keyingi quizni yuborish
bot.on('poll_answer', async (ctx) => {
    const userId = ctx.pollAnswer.user.id;
    const chatId = ctx.chat?.id || userId;

    let session = userQuizzes.get(chatId);
    if (!session || !session.lastQuiz) return;

    let lastQuiz = session.lastQuiz;
    let userAnswerIndex = ctx.pollAnswer.option_ids[0];

    // Foydalanuvchining eng so‘nggi `QuizSet` documentini topamiz
    let quizSet = await QuizSet.findOne({ userId }).sort({ date: -1 });

    if (!quizSet) return;

    quizSet.quizSet.push({
        question: lastQuiz.question,
        options: lastQuiz.options,
        correct_option_id: lastQuiz.correct_option_id,
        user_answer_id: userAnswerIndex
    });

    // Statistikani yangilaymiz
    if (userAnswerIndex === lastQuiz.correct_option_id) {
        quizSet.correctAnswers += 1;
    } else {
        quizSet.wrongAnswers += 1;
    }
    await quizSet.save();
    sendNextQuiz(chatId);
});

// Botni ishga tushirish
bot.launch();
