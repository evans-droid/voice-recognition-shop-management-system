import React from 'react';
import { useCart } from '../context/CartContext';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const Cart = ({ onCheckout }) => {
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    subtotal, 
    tax, 
    total,
    itemCount
  } = useCart();

  if (cart.length === 0) {
    return (
      <div className="card h-full flex flex-col items-center justify-center text-gray-500">
        <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm">Add items using voice or product list</p>
      </div>
    );
  }

  return (
    <div className="card h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Shopping Cart</h2>
        <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2.5 py-0.5 rounded">
          {itemCount} items
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-96 mb-4">
        <AnimatePresence>
          {cart.map((item) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="border-b border-gray-200 dark:border-gray-700 py-3 last:border-0"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold capitalize">{item.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    GHS {item.price.toFixed(2)} each
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <FaTrash />
                </button>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <FaMinus size={12} />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
                <span className="font-bold text-primary-600">
                  GHS {item.total.toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Subtotal</span>
          <span>GHS {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Tax (0%)</span>
          <span>GHS {tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xl font-bold text-primary-600">
          <span>Total</span>
          <span>GHS {total.toFixed(2)}</span>
        </div>

        <button
          onClick={onCheckout}
          className="w-full btn-primary mt-4 py-3 text-lg"
        >
          Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;