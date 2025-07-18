const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerEmail: String,
  items: [
    {
      productId: String,
      name: String,
      qty: Number,
      price: Number
    }
  ],
  totalAmount: Number,
  commission: Number,
  paymentId: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
