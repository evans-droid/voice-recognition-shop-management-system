const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Sale = require('../models/Sales');
const Product = require('../models/Products');

// @route   POST /api/sales
// @desc    Create a new sale
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { items, paymentMethod, amountPaid, taxRate = 0 } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    let subtotal = 0;
    const saleItems = [];

    // Process each item
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        createdBy: req.user._id
      });

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;

      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice
      });

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate tax and total
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // Create sale
    const sale = await Sale.create({
      items: saleItems,
      subtotal,
      tax,
      taxRate,
      total,
      paymentMethod,
      amountPaid: amountPaid || total,
      change: amountPaid ? amountPaid - total : 0,
      cashier: req.user._id
    });

    // Populate product details
    await sale.populate('items.product');

    res.status(201).json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = { cashier: req.user._id };
    
    // Date filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query)
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sale.countDocuments(query);

    res.json({
      sales,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/today
// @desc    Get today's sales
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await Sale.find({
      cashier: req.user._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('items.product');

    const total = sales.reduce((sum, sale) => sum + sale.total, 0);
    const count = sales.length;

    res.json({
      sales,
      total,
      count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sales/:id
// @desc    Get single sale
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      cashier: req.user._id
    }).populate('items.product');

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;