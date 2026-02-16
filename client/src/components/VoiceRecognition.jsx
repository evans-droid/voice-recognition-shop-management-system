import React, { useState, useEffect, useCallback } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import SpeechRecognition from 'react-speech-recognition';
import { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const VoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { addToCart } = useCart();
  const { token } = useAuth();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const parseVoiceCommand = useCallback(async (command) => {
    setProcessing(true);
    
    try {
      // Convert words to numbers
      const numberMap = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
        'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
        'nineteen': 19, 'twenty': 20
      };

      // Extract quantity and product name
      const words = command.toLowerCase().split(' ');
      let quantity = 1;
      let productName = '';

      // Check first word for quantity
      const firstWord = words[0];
      if (!isNaN(firstWord)) {
        quantity = parseInt(firstWord);
        productName = words.slice(1).join(' ');
      } else if (numberMap[firstWord]) {
        quantity = numberMap[firstWord];
        productName = words.slice(1).join(' ');
      } else {
        productName = words.join(' ');
      }

      // Remove common prefixes
      productName = productName.replace(/^(add|get|buy|purchase)\s+/i, '');

      // Search for product
      const response = await axios.get(
        `http://localhost:5000/api/products/search?q=${encodeURIComponent(productName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.length > 0) {
        const product = response.data[0];
        
        if (product.stock < quantity) {
          const errorMsg = `Sorry, only ${product.stock} ${product.name} available`;
          toast.error(errorMsg);
          speak(errorMsg);
        } else {
          addToCart(product, quantity);
          const successMsg = `Added ${quantity} ${product.name}. Total is GHS ${(product.price * quantity).toFixed(2)}`;
          speak(successMsg);
        }
      } else {
        const errorMsg = `Product ${productName} not found`;
        toast.error(errorMsg);
        speak(errorMsg);
      }
    } catch (error) {
      console.error('Voice command error:', error);
      toast.error('Error processing voice command');
      speak('Sorry, there was an error processing your command');
    } finally {
      setProcessing(false);
      resetTranscript();
    }
  }, [token, addToCart, resetTranscript]);

  useEffect(() => {
    if (!listening && transcript && !processing) {
      parseVoiceCommand(transcript);
    }
  }, [listening, transcript, processing, parseVoiceCommand]);

  const toggleListening = () => {
    if (isListening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      setIsListening(true);
      toast.success('Listening... Speak your command');
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <button
        className="voice-button bg-gray-400 cursor-not-allowed"
        disabled
        title="Voice recognition not supported in this browser"
      >
        <FaMicrophone size={24} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleListening}
      className={`voice-button ${isListening ? 'bg-red-500 animate-pulse' : 'bg-primary-600'}`}
      title="Click to speak (e.g., '2 Coca Cola' or 'Add three milk')"
    >
      <FaMicrophone size={24} />
      {isListening && (
        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-sm py-1 px-2 rounded whitespace-nowrap">
          Listening...
        </span>
      )}
    </button>
  );
};

export default VoiceRecognition;