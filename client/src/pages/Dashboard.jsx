import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  FaShoppingCart,
  FaMoneyBillWave,
  FaBoxes,
  FaExclamationTriangle
} from 'react-icons/fa';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, lowStockRes] = await Promise.all([
        axios.get('http://localhost:5000/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/dashboard/chart-data?period=week', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/products/low-stock', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsRes.data);
      setChartData(chartRes.data);
      setLowStockProducts(lowStockRes.data);
    } catch (error) {
      toast.error('Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">GHS {value.toFixed(2)}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Revenue"
          value={stats?.today?.revenue || 0}
          icon={FaMoneyBillWave}
          color="green"
          subtitle={`${stats?.today?.transactions || 0} transactions`}
        />
        
        <StatCard
          title="Weekly Revenue"
          value={stats?.weekly?.revenue || 0}
          icon={FaShoppingCart}
          color="blue"
          subtitle={`${stats?.weekly?.transactions || 0} transactions`}
        />
        
        <StatCard
          title="Monthly Revenue"
          value={stats?.monthly?.revenue || 0}
          icon={FaMoneyBillWave}
          color="purple"
          subtitle={`${stats?.monthly?.transactions || 0} transactions`}
        />
        
        <StatCard
          title="Total Products"
          value={stats?.products?.total || 0}
          icon={FaBoxes}
          color="orange"
          subtitle={`${stats?.products?.lowStock || 0} low stock`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Sales Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#22c55e"
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                name="Transactions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stock Distribution */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Stock Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'In Stock', value: stats?.products?.total - stats?.products?.lowStock || 0 },
                  { name: 'Low Stock', value: stats?.products?.lowStock || 0 },
                  { name: 'Out of Stock', value: stats?.products?.outOfStock || 0 }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="card border-l-4 border-yellow-500">
          <div className="flex items-center mb-4">
            <FaExclamationTriangle className="text-yellow-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Low Stock Alert</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2">Product</th>
                  <th className="text-left py-2">Current Stock</th>
                  <th className="text-left py-2">Threshold</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => (
                  <tr key={product._id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 capitalize">{product.name}</td>
                    <td className="py-2">{product.stock}</td>
                    <td className="py-2">{product.lowStockThreshold}</td>
                    <td className="py-2">
                      {product.stock === 0 ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          Low Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;