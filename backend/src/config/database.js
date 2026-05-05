const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { mongoUri, isProd } = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and configure it.');
  }

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { err: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(mongoUri, {
    autoIndex: !isProd,
  });
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
