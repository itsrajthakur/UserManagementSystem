const mongoose = require('mongoose');

function getHealth(req, res) {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;

  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    message: dbOk ? 'OK' : 'Service unavailable',
    data: {
      uptime: process.uptime(),
      database: dbOk ? 'connected' : 'disconnected',
    },
  });
}

module.exports = { getHealth };
