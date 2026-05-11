const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const initDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      console.warn('MongoDB not configured. DB-backed routes will be unavailable.');
      return false;
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error(' MongoDB connection error:', error.message);
    console.warn('Starting API without MongoDB. Fix MONGO_URI/IP whitelist to enable auth, history, and saved reports.');
    return false;
  }
};

module.exports = { mongoose, initDB };
