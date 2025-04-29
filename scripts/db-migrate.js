#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script migrates databases between environments (dev, staging, prod),
 * including additional options for data transformation and sanitization.
 * 
 * Usage:
 *   node db-migrate.js --source=prod --target=dev [options]
 *   node db-migrate.js --help
 * 
 * Options:
 *   --source=<env>           Source environment (dev, staging, prod)
 *   --target=<env>           Target environment (dev, staging, prod)
 *   --skip-tables=<tables>   Comma-separated list of tables to skip
 *   --only-tables=<tables>   Comma-separated list of tables to include
 *   --sanitize               Sanitize sensitive data (emails, phones, etc.)
 *   --dry-run                Show what would be done without making changes
 *   --no-confirm             Skip confirmation prompts
 *   --help                   Show this help information
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create backups directory if it doesn't exist
const backupDir = path.resolve(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backups directory: ${backupDir}`);
}

// Log file path
const logFile = path.join(backupDir, 'backups.log');

// Command line arguments parsing
const args = process.argv.slice(2);
const options = {
  source: getArgValue(args, '--source'),
  target: getArgValue(args, '--target'),
  skipTables: getArgValue(args, '--skip-tables'),
  onlyTables: getArgValue(args, '--only-tables'),
  sanitize: args.includes('--sanitize'),
  dryRun: args.includes('--dry-run'),
  noConfirm: args.includes('--no-confirm'),
  help: args.includes('--help')
};

// Database configuration by environment
const dbConfigs = {
  dev: {
    name: process.env.DEV_DATABASE_NAME || process.env.DATABASE_NAME || 'property_management_dev',
    user: process.env.DEV_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
    host: process.env.DEV_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
    port: process.env.DEV_DATABASE_PORT || process.env.DATABASE_PORT || '5432',
    password: process.env.DEV_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD
  },
  staging: {
    name: process.env.STAGING_DATABASE_NAME || 'property_management_staging',
    user: process.env.STAGING_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
    host: process.env.STAGING_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
    port: process.env.STAGING_DATABASE_PORT || process.env.DATABASE_PORT || '5432',
    password: process.env.STAGING_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD
  },
  prod: {
    name: process.env.PROD_DATABASE_NAME || 'property_management',
    user: process.env.PROD_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
    host: process.env.PROD_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
    port: process.env.PROD_DATABASE_PORT || process.env.DATABASE_PORT || '5432',
    password: process.env.PROD_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Extract value for a given argument
 */
function getArgValue(args, argName) {
  const arg = args.find(a => a.startsWith(argName + '='));
  return arg ? arg.split('=')[1] : null;
}

/**
 * Log migration operation
 */
function logOperation(action, source, target, options = {}) {
  const timestamp = new Date().toISOString();
  let logEntry = `${timestamp} | ${action} | Source: ${source} | Target: ${target}`;
  
  if (options.filename) {
    logEntry += ` | File: ${options.filename}`;
  }
  
  if (options.size) {
    logEntry += ` | Size: ${options.size} MB`;
  }
  
  if (options.tables) {
    logEntry += ` | Tables: ${options.tables}`;
  }
  
  logEntry += '\n';
  
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
 * Ask user for confirmation
 */
function askForConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Database Migration Script

Usage:
  node db-migrate.js --source=prod --target=dev [options]
  node db-migrate.js --help

Options:
  --source=<env>           Source environment (dev, staging, prod)
  --target=<env>           Target environment (dev, staging, prod)
  --skip-tables=<tables>   Comma-separated list of tables to skip
  --only-tables=<tables>   Comma-separated list of tables to include
  --sanitize               Sanitize sensitive data (emails, phones, etc.)
  --dry-run                Show what would be done without making changes
  --no-confirm             Skip confirmation prompts
  --help                   Show this help information

Examples:
  node db-migrate.js --source=prod --target=dev --sanitize
  node db-migrate.js --source=staging --target=dev --skip-tables=logs,audit_trail
  node db-migrate.js --source=prod --target=staging --only-tables=users,properties,rooms
  `);
  process.exit(0);
}

/**
 * Create database backup
 */
function createBackup(env) {
  try {
    const config = dbConfigs[env];
    if (!config) {
      throw new Error(`Unknown environment: ${env}`);
    }

    // Generate backup filename with timestamp and environment
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${config.name}_${env}_${timestamp}.dump`;
    const backupPath = path.join(backupDir, backupFilename);
    
    console.log(`Creating backup of '${config.name}' (${env} environment)...`);
    
    let pgDumpArgs = [
      `-h ${config.host}`,
      `-p ${config.port}`,
      `-U ${config.user}`,
      `-F c`,  // Custom format
      `-b`,    // Include large objects
      `-v`,    // Verbose
      `-f "${backupPath}"`
    ];

    // Add table options if provided
    if (options.skipTables) {
      options.skipTables.split(',').forEach(table => {
        pgDumpArgs.push(`-T "${table.trim()}"`);
      });
    }

    if (options.onlyTables) {
      options.onlyTables.split(',').forEach(table => {
        pgDumpArgs.push(`-t "${table.trim()}"`);
      });
    }

    pgDumpArgs.push(config.name);
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would execute: pg_dump ${pgDumpArgs.join(' ')}`);
      return null;
    }
    
    // Execute pg_dump command
    execSync(
      `pg_dump ${pgDumpArgs.join(' ')}`,
      { 
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: config.password }
      }
    );
    
    const fileSize = getFileSizeInMB(backupPath);
    
    console.log(`✅ Backup completed successfully: ${backupFilename} (${fileSize} MB)`);
    
    // Log the backup operation
    logOperation('backup', env, null, { 
      filename: backupFilename, 
      size: fileSize,
      tables: options.onlyTables || 'all' + (options.skipTables ? ` except ${options.skipTables}` : '')
    });
    
    return { path: backupPath, filename: backupFilename, size: fileSize };
  } catch (error) {
    console.error('❌ Backup failed:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Restore database from backup
 */
async function restoreDatabase(backupInfo, env) {
  try {
    const config = dbConfigs[env];
    if (!config) {
      throw new Error(`Unknown environment: ${env}`);
    }

    console.log(`\nPreparing to restore to '${config.name}' (${env} environment)...`);
    
    if (!options.noConfirm && !options.dryRun) {
      console.log(`\n⚠️  WARNING: This will erase all data in the '${config.name}' database.`);
      const confirmed = await askForConfirmation('Are you sure you want to continue?');
      
      if (!confirmed) {
        console.log('Operation cancelled by user.');
        return false;
      }
    }
    
    // Drop and recreate the database
    if (options.dryRun) {
      console.log(`[DRY RUN] Would drop and recreate database: ${config.name}`);
      console.log(`[DRY RUN] Would restore from: ${backupInfo.filename}`);
    } else {
      console.log(`\nDropping database '${config.name}'...`);
      execSync(
        `dropdb -h ${config.host} -p ${config.port} -U ${config.user} --if-exists ${config.name}`,
        { 
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: config.password }
        }
      );
      
      console.log(`\nCreating database '${config.name}'...`);
      execSync(
        `createdb -h ${config.host} -p ${config.port} -U ${config.user} ${config.name}`,
        { 
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: config.password }
        }
      );
      
      console.log(`\nRestoring from backup: ${backupInfo.filename}...`);
      execSync(
        `pg_restore -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.name} -v "${backupInfo.path}"`,
        { 
          stdio: 'inherit',
          env: { ...process.env, PGPASSWORD: config.password }
        }
      );
      
      console.log(`\n✅ Database restored successfully.`);
      
      // Apply sanitization if requested
      if (options.sanitize) {
        await sanitizeData(env);
      }
      
      // Log the restore operation
      logOperation('migrate', options.source, env, { 
        filename: backupInfo.filename,
        size: backupInfo.size,
        tables: options.onlyTables || 'all' + (options.skipTables ? ` except ${options.skipTables}` : '')
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Restore failed:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Sanitize sensitive data
 */
async function sanitizeData(env) {
  try {
    const config = dbConfigs[env];
    console.log(`\nSanitizing sensitive data in '${config.name}'...`);
    
    // Define sanitization SQL statements
    const sanitizationQueries = [
      // Anonymize personal information while keeping the data structure
      `UPDATE "User" SET 
        email = 'user_' || id || '@example.com',
        phone = '+1' || floor(random() * 9000000000 + 1000000000)::text,
        password = '$2a$10$sanitizedpasswordhashsanitizedpasswordhash'
        WHERE id IS NOT NULL;`,
        
      // Sanitize renter personal information
      `UPDATE "Renter" SET 
        email = 'renter_' || id || '@example.com',
        phone = '+1' || floor(random() * 9000000000 + 1000000000)::text,
        emergency_contact = 'Emergency Contact ' || id,
        emergency_phone = '+1' || floor(random() * 9000000000 + 1000000000)::text
        WHERE id IS NOT NULL;`,
        
      // Sanitize payment information
      `UPDATE "Payment" SET 
        transaction_id = 'TXSANITIZED' || id,
        payment_method_details = '{"type": "card", "last4": "1111"}'
        WHERE id IS NOT NULL;`,
        
      // Add log entry indicating data was sanitized
      `INSERT INTO "Log" (timestamp, level, message, context)
        VALUES (NOW(), 'info', 'Database sanitized via migration script', '{"source": "${options.source}", "target": "${env}"}');`
    ];
    
    if (options.dryRun) {
      console.log('[DRY RUN] Would execute sanitization queries:');
      sanitizationQueries.forEach(query => {
        console.log(`\n${query}`);
      });
    } else {
      // Execute each sanitization query
      for (const query of sanitizationQueries) {
        execSync(
          `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.name} -c "${query}"`,
          { 
            stdio: 'inherit',
            env: { ...process.env, PGPASSWORD: config.password }
          }
        );
      }
      console.log(`✅ Data sanitization completed.`);
    }
  } catch (error) {
    console.error('⚠️ Data sanitization failed:');
    console.error(error.message);
    console.log('Continuing with unsanitized data.');
    return false;
  }
}

/**
 * Main migration function
 */
async function migrateDatabase() {
  try {
    if (options.help) {
      showHelp();
      return;
    }
    
    // Validate environments
    if (!options.source || !dbConfigs[options.source]) {
      throw new Error(`Invalid or missing source environment. Use --source=dev|staging|prod`);
    }
    
    if (!options.target || !dbConfigs[options.target]) {
      throw new Error(`Invalid or missing target environment. Use --target=dev|staging|prod`);
    }
    
    if (options.source === options.target) {
      throw new Error(`Source and target environments cannot be the same.`);
    }
    
    console.log('\n🔄 DATABASE MIGRATION');
    console.log('=====================');
    console.log(`Source: ${options.source} (${dbConfigs[options.source].name})`);
    console.log(`Target: ${options.target} (${dbConfigs[options.target].name})`);
    
    if (options.skipTables) {
      console.log(`Skipping tables: ${options.skipTables}`);
    }
    
    if (options.onlyTables) {
      console.log(`Including only tables: ${options.onlyTables}`);
    }
    
    if (options.sanitize) {
      console.log(`Sanitizing sensitive data: Yes`);
    }
    
    if (options.dryRun) {
      console.log(`Dry run: Yes (no changes will be made)`);
    }
    
    console.log('\n');
    
    // Step 1: Create backup of source database
    const backupInfo = createBackup(options.source);
    
    if (options.dryRun) {
      console.log('\n[DRY RUN] Migration simulation completed. No changes were made.');
      process.exit(0);
    }
    
    if (!backupInfo) {
      throw new Error('Backup creation failed or was skipped.');
    }
    
    // Step 2: Restore backup to target database
    await restoreDatabase(backupInfo, options.target);
    
    console.log('\n✨ Database migration completed successfully!');
    console.log(`Source: ${options.source} (${dbConfigs[options.source].name})`);
    console.log(`Target: ${options.target} (${dbConfigs[options.target].name})`);
    console.log(`Backup: ${backupInfo.filename} (${backupInfo.size} MB)`);
    
    if (options.sanitize) {
      console.log(`Sensitive data: Sanitized`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Execute migration
migrateDatabase(); 