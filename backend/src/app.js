const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { mongoSanitizeMiddleware } = require('./middlewares/mongoSanitize.middleware');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { corsOrigin, isProd } = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitizeMiddleware());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 60 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(
  morgan(isProd ? 'combined' : 'dev', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
