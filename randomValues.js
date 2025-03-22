const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB-ga ulanish
mongoose.connect('mongodb+srv://root:' + process.env.DB_PASSWORD + '@cluster0.ufftb.mongodb.net/lexifyuz', {});

// Modelni yaratish
const Word = mongoose.model('lexify_1', new mongoose.Schema({
    word_en: String,
    word_uz: String,
    randomValue: { type: Number, default: Math.random } // Tasodifiy qiymat
}));

// RandomValue qo‘shish va yangilash
async function updateRandomValues() {
    try {
        await Word.updateMany({ randomValue: { $exists: false } }, { $set: { randomValue: Math.random() } });
        console.log("✅ Barcha so‘zlarga randomValue qo‘shildi!");
    } catch (err) {
        console.error("❌ Xatolik:", err);
    } finally {
        mongoose.connection.close();
    }
}

// Skriptni ishga tushirish
updateRandomValues();
