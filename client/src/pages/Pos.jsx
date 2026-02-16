import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Cart from '../components/Cart';
import VoiceRecognition from '../components/VoiceRecognition';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FaSearch } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Pos = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const { token, user } = useAuth();
  const { cart, clearCart, subtotal, total } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paymentMethod: 'cash',
        amountPaid: total,
        taxRate: 0
      };

      const response = await axios.post(
        'http://localhost:5000/api/sales',
        saleData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLastSale(response.data);
      setShowReceipt(true);
      clearCart();
      fetchProducts(); // Refresh stock
      toast.success('Sale completed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(user?.shopName || 'Shop Name', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Invoice: ${lastSale.invoiceNumber}`, 20, 40);
    doc.text(`Date: ${new Date(lastSale.createdAt).toLocaleString()}`, 20, 45);
    doc.text(`Cashier: ${user?.username}`, 20, 50);

    // Table
    const tableColumn = ["Product", "Qty", "Price", "Total"];
    const tableRows = [];

    lastSale.items.forEach(item => {
      const row = [
        item.productName,
        item.quantity,
        `GHS ${item.unitPrice.toFixed(2)}`,
        `GHS ${item.totalPrice.toFixed(2)}`
      ];
      tableRows.push(row);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] }
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: GHS ${lastSale.subtotal.toFixed(2)}`, 140, finalY);
    doc.text(`Tax: GHS ${lastSale.tax.toFixed(2)}`, 140, finalY + 5);
    doc.setFontSize(12);
    doc.text(`Total: GHS ${lastSale.total.toFixed(2)}`, 140, finalY + 15);

    // Footer
    doc.setFontSize(10);
    doc.text('Thank you for shopping with us!', 105, 280, { align: 'center' });

    doc.save(`invoice-${lastSale.invoiceNumber}.pdf`);
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    const receiptContent = `
      <html>
        <head>
          <title>Receipt - ${lastSale.invoiceNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .shop-name { font-size: 20px; font-weight: bold; }
            .items { width: 100%; border-collapse: collapse; }
            .items td, .items th { padding: 5px; }
            .total { font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${user?.shopName}</div>
            <div>Invoice: ${lastSale.invoiceNumber}</div>
            <div>Date: ${new Date(lastSale.createdAt).toLocaleString()}</div>
            <div>Cashier: ${user?.username}</div>
          </div>
          
          <table class="items">
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
            ${lastSale.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.quantity}</td>
                <td>GHS ${item.unitPrice.toFixed(2)}</td>
                <td>GHS ${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          
          <hr>
          <p>Subtotal: GHS ${lastSale.subtotal.toFixed(2)}</p>
          <p>Tax: GHS ${lastSale.tax.toFixed(2)}</p>
          <p class="total">Total: GHS ${lastSale.total.toFixed(2)}</p>
          
          <div style="text-align: center; margin-top: 30px;">
            Thank you for shopping with us!
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <div className="card mb-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="card cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => {
                    if (product.stock > 0) {
                      const cartItem = cart.find(item => item.productId === product._id);
                      const currentQty = cartItem?.quantity || 0;
                      if (currentQty < product.stock) {
                        window.addToCart(product, 1);
                      } else {
                        toast.error(`Only ${product.stock} available`);
                      }
                    } else {
                      toast.error('Out of stock');
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{product.name}</h3>
                      <p className="text-2xl font-bold text-primary-600 mt-2">
                        GHS {product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${
                      product.stock > 10 
                        ? 'bg-green-100 text-green-800' 
                        : product.stock > 0 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      Stock: {product.stock}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Cart onCheckout={handleCheckout} />
        </div>
      </div>

      <VoiceRecognition />

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">Receipt</h2>
            
            <div className="mb-4 text-center">
              <p className="text-xl font-bold">{user?.shopName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invoice: {lastSale.invoiceNumber}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(lastSale.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-4">
              {lastSale.items.map((item, index) => (
                <div key={index} className="flex justify-between mb-2">
                  <div>
                    <p className="font-medium capitalize">{item.productName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.quantity} x GHS {item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium">GHS {item.totalPrice.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>GHS {lastSale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>GHS {lastSale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-primary-600">
                <span>Total</span>
                <span>GHS {lastSale.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={generatePDF}
                className="flex-1 btn-secondary"
              >
                Download PDF
              </button>
              <button
                onClick={printReceipt}
                className="flex-1 btn-secondary"
              >
                Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add to cart function to window for voice recognition
window.addToCart = (product, quantity) => {
  // This will be handled by the cart context
  const event = new CustomEvent('addToCart', { detail: { product, quantity } });
  window.dispatchEvent(event);
};

export default Pos;