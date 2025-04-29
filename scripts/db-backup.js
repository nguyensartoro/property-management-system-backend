#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * This script creates a backup of the database and logs the operation.
 * 
 * Usage:
 *   node db-backup.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Database connection information
const dbName = process.env.DATABASE_NAME || 'property_management';
const dbUser = process.env.DATABASE_USER || 'postgres';
const dbHost = process.env.DATABASE_HOST || 'localhost';
const dbPort = process.env.DATABASE_PORT || '5432';

// Create backups directory if it doesn't exist
const backupDir = path.resolve(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backups directory: ${backupDir}`);
}

// Log file path
const logFile = path.join(backupDir, 'backups.log');

/**
 * Log backup/restore operation
 */
function logOperation(action, filename, database, size) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | ${action} | ${filename} | ${database}${size ? ' | ' + size + ' MB' : ''}\n`;
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`Logged ${action} operation to backups.log`);
}

/**
 * Get file size in MB
 */
function getFileSizeInMB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / (1024 * 1024)).toFixed(2);
}

/**
 * Create database backup
 */
function createBackup() {
  try {
    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${dbName}_${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFilename);
    
    console.log(`Creating backup of database '${dbName}'...`);
    
    // Execute pg_dump command
    execSync(
      `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -v -f "${backupPath}" ${dbName}`,
      { 
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: process.env.DATABASE_PASSWORD }
      }
    );
    
    const fileSize = getFileSizeInMB(backupPath);
    
    console.log(`✅ Backup completed successfully: ${backupFilename} (${fileSize} MB)`);
    
    // Log the backup operation
    logOperation('backup', backupFilename, dbName, fileSize);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Backup failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Execute backup
createBackup(); 