const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schéma pour les questions
const questionSchema = new Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: false
  },
  options: [{
    type: String,
    required: true
  }],
  answer: {
    type: String,
    required: true
  }
});

//  catégories => questions
const categorySchema = new Schema({
  theme: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  logo: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: false
  },
  questions: [questionSchema] // Tableau de questions 
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
