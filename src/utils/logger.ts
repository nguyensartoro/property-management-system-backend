import winston from 'winston';

// Define the custom settings for each transport (file, console)
const options = {
  file: {
    level: process.env.LOG_LEVEL || 'info',
    filename: 'logs/app.log',
    handleExceptions: true,
    maxSize: 5242880, // 5MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  },
};

// Instantiate a new Winston logger with the settings defined above
const logger = winston.createLogger({
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console),
  ],
  exitOnError: false, // do not exit on handled exceptions
});

// Create a stream object with a 'write' function that will be used by morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger; 