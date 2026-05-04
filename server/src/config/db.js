const mongoose = require('mongoose');
require('dotenv').config();

const initDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      throw new Error('MONGO_URI or DATABASE_URL is required');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error(' MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = { mongoose, initDB };
