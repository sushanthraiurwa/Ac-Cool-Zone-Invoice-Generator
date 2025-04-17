const app = require('./index');
const PORT = process.env.PORT || 3000;

// Configuration checks
if (!process.env.RENDER) {
  console.warn('Warning: Not running on Render.com - some features may not work as expected');
}

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Render.com: ${process.env.RENDER ? 'Yes' : 'No'}`);
});

// Enhanced error handling
server.on('error', (err) => {
  console.error('Server error:', err);
  
  // Specific handling for common errors
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  
  process.exit(1);
});

// Handle process termination with timeout
const gracefulShutdown = (signal) => {
  return () => {
    console.log(`${signal} received. Shutting down gracefully...`);
    
    const shutdownTimer = setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 second timeout

    server.close(() => {
      clearTimeout(shutdownTimer);
      console.log('Server closed');
      process.exit(0);
    });
  };
};

// Signal handlers
process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});