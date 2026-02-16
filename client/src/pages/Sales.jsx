import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FaEye, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    page: 1
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1
  });
  const { token, user } = useAuth();

  useEffect(() => {
    fetchSales();
  }, [filters]);

  const fetchSales = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/sales', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      setSales(response.data.sales);
      setPagination({
        total: response.data.total,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage
      });
    } catch (error) {
      toast.error('Error fetching sales');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoicePDF = (sale) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text(user?.shopName || 'Shop Name', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Invoice: ${sale.invoiceNumber}`, 20, 40);
    doc.text(`Date: ${format(new Date(sale.createdAt), 'PPP p')}`, 20, 45);
    doc.text(`Cashier: ${user?.username}`, 20, 50);

    // Table
    const tableColumn = ["Product", "Qty", "Price", "Total"];
    const tableRows = [];

    sale.items.forEach(item => {
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
    doc.text(`Subtotal: GHS ${sale.subtotal.toFixed(2)}`, 140, finalY);
    doc.text(`Tax: GHS ${sale.tax.toFixed(2)}`, 140, finalY + 5);
    doc.setFontSize(12);
    doc.text(`Total: GHS ${sale.total.toFixed(2)}`, 140, finalY + 15);

    doc.save(`invoice-${sale.invoiceNumber}.pdf`);
  };

  const SaleDetailsModal = ({ sale, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Sale Details</h2>
        
        <div className="mb-4">
          <p><span className="font-semibold">Invoice:</span> {sale.invoiceNumber}</p>
          <p><span className="font-semibold">Date:</span> {format(new Date(sale.createdAt), 'PPP p')}</p>
          <p><span className="font-semibold">Payment Method:</span> {sale.paymentMethod}</p>
        </div>

        <table className="w-full mb-4">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2">Product</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2 capitalize">{item.productName}</td>
                <td className="text-right py-2">{item.quantity}</td>
                <td className="text-right py-2">GHS {item.unitPrice.toFixed(2)}</td>
                <td className="text-right py-2">GHS {item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-1">
          <p>Subtotal: GHS {sale.subtotal.toFixed(2)}</p>
          <p>Tax: GHS {sale.tax.toFixed(2)}</p>
          <p className="text-xl font-bold text-primary-600">Total: GHS {sale.total.toFixed(2)}</p>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => generateInvoicePDF(sale)}
            className="btn-secondary"
          >
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sales History</h1>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => fetchSales()}
              className="btn-primary w-full"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4">Invoice #</th>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Items</th>
              <th className="text-right py-3 px-4">Total</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-3 px-4 font-medium">{sale.invoiceNumber}</td>
                <td className="py-3 px-4">{format(new Date(sale.createdAt), 'PP')}</td>
                <td className="py-3 px-4">{sale.items.length} items</td>
                <td className="py-3 px-4 text-right font-bold text-primary-600">
                  GHS {sale.total.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => generateInvoicePDF(sale)}
                      className="text-green-600 hover:text-green-800"
                      title="Download PDF"
                    >
                      <FaDownload />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {filters.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.totalPages}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};

export default Sales;