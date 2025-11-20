const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const customerRoutes = require('./customerRoutes');
const orderRoutes = require('./orderRoutes');
const stockInRoutes = require('./stockInRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/stock-in', stockInRoutes);

module.exports = router;