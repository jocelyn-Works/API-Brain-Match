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

const subThemeSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  questions: [questionSchema] // Tableau de questions 
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
   subThemes: [subThemeSchema] 
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
