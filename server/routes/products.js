const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Product = require('../models/Products');

// @route   GET /api/products
// @desc    Get all products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.user._id })
      .sort({ name: 1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/low-stock
// @desc    Get low stock products
// @access  Private
router.get('/low-stock', protect, async (req, res) => {
  try {
    const products = await Product.find({
      createdBy: req.user._id,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).sort({ stock: 1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/search
// @desc    Search products by name
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    const products = await Product.find({
      createdBy: req.user._id,
      name: { $regex: q, $options: 'i' }
    }).limit(10);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create product
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, price, stock, category, barcode, lowStockThreshold } = req.body;

    // Check if product exists
    const productExists = await Product.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      createdBy: req.user._id
    });

    if (productExists) {
      return res.status(400).json({ message: 'Product already exists' });
    }

    // Create product
    const product = await Product.create({
      name: name.toLowerCase(),
      price,
      stock,
      category,
      barcode,
      lowStockThreshold: lowStockThreshold || 5,
      createdBy: req.user._id
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update fields
    const { name, price, stock, category, barcode, lowStockThreshold } = req.body;
    
    if (name) product.name = name.toLowerCase();
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category) product.category = category;
    if (barcode) product.barcode = barcode;
    if (lowStockThreshold) product.lowStockThreshold = lowStockThreshold;

    await product.save();

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.deleteOne();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;