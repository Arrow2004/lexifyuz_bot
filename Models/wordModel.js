const {Schema,model} = require('mongoose');
// So‘zlar modeli
const wordScheme = new Schema({
    word_en: String,
    word_uz: String
})
const Word = model('essential_1', wordScheme,);

module.exports = Word