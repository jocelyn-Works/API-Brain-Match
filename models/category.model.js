const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Question = require('./quiz.model');

const categorySchema = new Schema({
    theme: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    logo: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    questions: [Question.schema]
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;