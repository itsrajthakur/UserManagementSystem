const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const { port } = require('./config/env');
const logger = require('./utils/logger');
const { assertJwtSecret } = require('./utils/jwt');

function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info(`${signal} received, closing server`);
    server.close(async () => {
      try {
        await disconnectDB();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { err: err.message });
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function start() {
  assertJwtSecret();

  await connectDB();

  const server = http.createServer(app);
  setupGracefulShutdown(server);

  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err: err.message, stack: err.stack });
  process.exit(1);
});
