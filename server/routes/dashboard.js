const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Sale = require('../models/Sales');
const Product = require('../models/Products');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Today's sales
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaySales = await Sale.find({
      cashier: userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayTransactions = todaySales.length;

    // Weekly sales
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    
    const weeklySales = await Sale.find({
      cashier: userId,
      createdAt: { $gte: startOfWeek }
    });

    const weeklyRevenue = weeklySales.reduce((sum, sale) => sum + sale.total, 0);

    // Monthly sales
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlySales = await Sale.find({
      cashier: userId,
      createdAt: { $gte: startOfMonth }
    });

    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0);

    // Total products
    const totalProducts = await Product.countDocuments({ createdBy: userId });

    // Low stock products
    const lowStockProducts = await Product.find({
      createdBy: userId,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).countDocuments();

    // Out of stock products
    const outOfStockProducts = await Product.countDocuments({
      createdBy: userId,
      stock: 0
    });

    res.json({
      today: {
        revenue: todayRevenue,
        transactions: todayTransactions
      },
      weekly: {
        revenue: weeklyRevenue,
        transactions: weeklySales.length
      },
      monthly: {
        revenue: monthlyRevenue,
        transactions: monthlySales.length
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/chart-data
// @desc    Get sales chart data
// @access  Private
router.get('/chart-data', protect, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const userId = req.user._id;
    
    let startDate = new Date();
    let groupFormat;

    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = '%Y-%m-%d';
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        groupFormat = '%Y-%m-%d';
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupFormat = '%Y-%m';
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = '%Y-%m-%d';
    }

    const sales = await Sale.aggregate([
      {
        $match: {
          cashier: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;