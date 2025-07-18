const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  farmerEmail: String,
  name: String,
  category: String,
  quantity: Number,
  price: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
