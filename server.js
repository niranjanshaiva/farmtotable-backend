// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const app = express();
app.use(cors());
app.use(express.json());

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ Mongo Error:", err));

// ✅ Root Route
app.get('/', (req, res) => {
  res.send('✅ Backend is live on Render!');
});

// ✅ Register
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

// ✅ Login
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  // Admin login hardcoded
  if (role === 'admin') {
    if (email === 'admin' && password === '1234') {
      return res.json({ success: true, role: 'admin', name: 'Admin' });
    } else {
      return res.json({ error: 'Invalid admin credentials' });
    }
  }

  const user = await User.findOne({ email, role });
  if (!user) return res.json({ error: 'User not found' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ error: 'Wrong password' });

  res.json({ success: true, role: user.role, name: user.name });
});

// ✅ Add Product
app.post('/add-product', async (req, res) => {
  const { name, category, quantity, price, farmerEmail } = req.body;

  if (!name || !category || !quantity || !price || !farmerEmail)
    return res.json({ error: 'All fields are required' });

  try {
    const product = new Product({ farmerEmail, name, category, quantity, price });
    await product.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Failed to add item' });
  }
});

// ✅ View Farmer Products
app.get('/products', async (req, res) => {
  const { farmerEmail } = req.query;
  if (!farmerEmail) return res.json([]);
  const products = await Product.find({ farmerEmail });
  res.json(products);
});

// ✅ View All Products (for buyers)
app.get('/all-products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// ✅ Update Product
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

// ✅ Delete Product
app.delete('/delete-product/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Could not delete product' });
  }
});

// ✅ Razorpay Config
// ✅ Razorpay Config – correct way to access env variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

// ✅ Create Razorpay Order
app.post('/create-order', async (req, res) => {
  const { totalAmount } = req.body;
  const amountInPaise = Math.round(totalAmount * 100);

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: 'receipt_' + Math.floor(Math.random() * 10000)
    });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// ✅ Record Order
app.post('/record-order', async (req, res) => {
  const { buyerEmail, items, totalAmount, paymentId } = req.body;

  try {
    const order = new Order({
      buyerEmail,
      items,
      totalAmount,
      commission: +(totalAmount * 0.015).toFixed(2),
      paymentId
    });
    await order.save();
    res.json({ success: true, message: 'Order saved successfully' });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Error saving order' });
  }
});

// ✅ Admin Report
app.get('/admin-report', async (req, res) => {
  try {
    const orders = await Order.find();
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalCommission = orders.reduce((sum, order) => sum + order.commission, 0);
    res.json({ totalOrders, totalSales, totalCommission });
  } catch (err) {
    res.json({ error: 'Could not get admin stats' });
  }
});

// ✅ Start Server on Render Port
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
