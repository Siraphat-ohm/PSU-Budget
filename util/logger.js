const winston = require('winston');
const { createLogger, transports, format } = winston;
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';

const logDir = 'logs';

const errorTransport = new transports.File({
    level: 'error',
    filename: 'logs/error.log',
    format: format.combine(
        format.timestamp({ format: "YYYY/MM/DD HH:mm:ss" }),
        format.printf(({ level, timestamp, message }) => `${timestamp} [${level}] ${message}`)
    )
});

const combinedTransport = new transports.DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH:mm',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d', 
    frequency: '1d', 
    dirname: logDir, 
    auditFile: path.join(logDir, 'audit.json'), 
    createSymlink: true, 
    format: format.combine(
        format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
        format.json()
    )
});

const cleanUpLogs = () => {
    fs.readdir(logDir, (err, files) => {
        if (err) {
            console.error('Error reading log directory:', err);
        } else {
            const logFiles = files.filter(file => file.endsWith('.log'));
            logFiles.sort();
            while (logFiles.length > 30) {
                const fileToRemove = logFiles.shift();
                fs.unlink(path.join(logDir, fileToRemove), (error) => {
                    if (error) {
                        console.error(`Error deleting log file: ${fileToRemove}`);
                    }
                });
            }
        }
    });
};

cleanUpLogs();

const logger = createLogger({
    level: logLevel,
    format: format.combine(
        format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
        format.json()
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.printf(({ level, timestamp, message }) => `${timestamp} [${level}] ${message}`)
            )
        }),
        combinedTransport,
        errorTransport
    ]
});

module.exports = { logger };
