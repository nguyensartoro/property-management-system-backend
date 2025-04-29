#!/usr/bin/env node

/**
 * Database Restore Script
 * 
 * This script restores the database from a backup file and logs the operation.
 * 
 * Usage:
 *   node db-restore.js [backup-file]
 *   
 * If no backup file is specified, it will show a list of available backups to choose from.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Database connection information
const dbName = process.env.DATABASE_NAME || 'property_management';
const dbUser = process.env.DATABASE_USER || 'postgres';
const dbHost = process.env.DATABASE_HOST || 'localhost';
const dbPort = process.env.DATABASE_PORT || '5432';

// Backups directory
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
function logOperation(action, filename, database) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | ${action} | ${filename} | ${database}\n`;
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`Logged ${action} operation to backups.log`);
}

/**
 * Create a readline interface for user input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Get available backup files
 */
function getBackupFiles() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.dump'))
      .sort((a, b) => {
        return fs.statSync(path.join(backupDir, b)).mtime.getTime() - 
               fs.statSync(path.join(backupDir, a)).mtime.getTime();
      });
    
    if (files.length === 0) {
      console.log('❌ No backup files found in the backups directory.');
      process.exit(1);
    }
    
    return files;
  } catch (error) {
    console.error('❌ Error reading backup files:', error.message);
    process.exit(1);
  }
}

/**
 * Prompt user to select a backup file
 */
async function promptForBackupFile() {
  return new Promise((resolve) => {
    const backupFiles = getBackupFiles();
    
    console.log('\nAvailable backup files:');
    backupFiles.forEach((file, index) => {
      const stats = fs.statSync(path.join(backupDir, file));
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const modifiedDate = stats.mtime.toLocaleString();
      
      console.log(`${index + 1}. ${file} (${fileSizeMB} MB, ${modifiedDate})`);
    });
    
    const rl = createInterface();
    
    rl.question('\nEnter the number of the backup to restore: ', (answer) => {
      rl.close();
      
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= backupFiles.length) {
        console.log('❌ Invalid selection. Please run the script again and select a valid number.');
        process.exit(1);
      }
      
      resolve(backupFiles[index]);
    });
  });
}

/**
 * Prompt for confirmation before restoring
 */
async function confirmRestore(backupFile) {
  return new Promise((resolve) => {
    const rl = createInterface();
    
    rl.question(`\n⚠️  WARNING: This will overwrite the existing database '${dbName}' with the backup.\nAre you sure you want to continue? (y/N): `, (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'y') {
        resolve(true);
      } else {
        console.log('❌ Restore cancelled by user.');
        resolve(false);
      }
    });
  });
}

/**
 * Restore database from backup file
 */
async function restoreDatabase(backupFile) {
  try {
    const backupPath = path.join(backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ Backup file does not exist: ${backupPath}`);
      process.exit(1);
    }
    
    // Ask for confirmation before restoring
    const confirmed = await confirmRestore(backupFile);
    if (!confirmed) {
      process.exit(0);
    }
    
    console.log(`\nRestoring database '${dbName}' from backup: ${backupFile}...`);
    
    // Execute pg_restore command
    execSync(
      `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c ${backupPath}`,
      { 
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: process.env.DATABASE_PASSWORD }
      }
    );
    
    console.log(`\n✅ Database restored successfully from: ${backupFile}`);
    
    // Log the restore operation
    logOperation('restore', backupFile, dbName);
    
    return true;
  } catch (error) {
    console.error('\n❌ Restore failed:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    let backupFile = process.argv[2];
    
    // If no backup file is specified, prompt the user to select one
    if (!backupFile) {
      backupFile = await promptForBackupFile();
    } else {
      // Check if the specified file exists
      const backupPath = path.join(backupDir, backupFile);
      if (!fs.existsSync(backupPath)) {
        console.error(`❌ Specified backup file does not exist: ${backupPath}`);
        console.log('Available backups:');
        getBackupFiles().forEach(file => console.log(`- ${file}`));
        process.exit(1);
      }
    }
    
    await restoreDatabase(backupFile);
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 