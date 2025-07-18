// Import modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const app = express();

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Middleware
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect("mongodb+srv://farmadmin:farm123@farmtotable.2fgihyz.mongodb.net/?retryWrites=true&w=majority&appName=FarmToTable")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

// Root Test Route
app.get('/', (req, res) => {
  res.send('✅ Backend server is working!');
});

// Register
app.post('/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role)
    return res.json({ error: 'All fields are required' });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.json({ error: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, phone, password: hashedPassword, role });
  await newUser.save();
  res.json({ success: true, message: 'User registered successfully' });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  // Admin login
  if (role === 'admin') {
    if (email === 'admin' && password === '1234') {
      return res.json({ success: true, role: 'admin', name: 'Admin' });
    } else {
      return res.json({ error: 'Invalid admin credentials' });
    }
  }

  const user = await User.findOne({ email, role });
  if (!user) return res.json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.json({ error: 'Wrong password' });

  res.json({ success: true, role: user.role, name: user.name });
});

// Add Product
app.post('/add-product', async (req, res) => {
  const { name, category, quantity, price, farmerEmail } = req.body;

  if (!name || !category || !quantity || !price || !farmerEmail)
    return res.json({ error: 'All fields are required' });

  try {
    const product = new Product({ name, category, quantity, price, farmerEmail });
    await product.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Failed to add product' });
  }
});

// Update Product
app.put('/update-product/:id', async (req, res) => {
  const { name, category, quantity, price } = req.body;

  try {
    await Product.findByIdAndUpdate(req.params.id, { name, category, quantity, price });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Could not update product' });
  }
});

// Delete Product
app.delete('/delete-product/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Could not delete product' });
  }
});

// Get Products by Farmer Email
app.get('/products', async (req, res) => {
  const { farmerEmail } = req.query;
  if (!farmerEmail) return res.json([]);
  const products = await Product.find({ farmerEmail });
  res.json(products);
});

// Get All Products (for buyers)
app.get('/all-products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Razorpay Setup
const razorpay = new Razorpay({
  key_id: 'rzp_test_J3RQxpf2LltUfP',
  key_secret: 'Vg0fZVRxTR6QSTtZDuU5W2nV',
});

// Create Razorpay Order
app.post('/create-order', async (req, res) => {
  const { totalAmount } = req.body;
  const amountInPaise = Math.round(totalAmount * 100);

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: 'receipt_' + Math.floor(Math.random() * 10000),
    });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// Record Order after Payment
app.post('/record-order', async (req, res) => {
  const { buyerEmail, items, totalAmount, paymentId } = req.body;

  try {
    const order = new Order({
      buyerEmail,
      items,
      totalAmount,
      commission: +(totalAmount * 0.015).toFixed(2),
      paymentId,
    });
    await order.save();
    res.json({ success: true, message: 'Order saved' });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Error saving order' });
  }
});

// Admin Report
app.get('/admin-report', async (req, res) => {
  try {
    const orders = await Order.find();
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalCommission = orders.reduce((sum, o) => sum + o.commission, 0);

    res.json({ totalOrders, totalSales, totalCommission });
  } catch (err) {
    res.json({ error: 'Could not generate report' });
  }
});

// Start Server
app.listen(5000, () => {
  console.log('🚀 Server is running on http://localhost:5000');
});
