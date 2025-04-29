# Database Management Scripts

This directory contains scripts for managing the PostgreSQL database used by the Property Management System.

## Requirements

- Node.js v14+
- PostgreSQL client tools (pg_dump, pg_restore, createdb, dropdb)
- Properly configured `.env` file with database credentials

## Database Backup Script

The `db-backup.js` script creates a backup of the database and logs the operation.

### Usage

```bash
node db-backup.js
```

### Features

- Creates timestamped backup files in the `../backups` directory
- Uses pg_dump to create a comprehensive backup
- Logs backup details (timestamp, file size, database name) to `backups.log`
- Handles errors gracefully

## Database Restore Script

The `db-restore.js` script restores the database from a previously created backup.

### Usage

```bash
# List available backups and select one to restore
node db-restore.js

# Or specify a backup file directly
node db-restore.js <backup-filename>
```

### Features

- Interactive selection of available backups when run without arguments
- Lists backups sorted by date (newest first) with file sizes
- Confirms before overwriting the existing database
- Drops and recreates the database for a clean restore
- Logs restore operations to the same log file
- User-friendly error messages

## Database Migration Script

The `db-migrate.js` script provides a comprehensive solution for migrating databases between different environments (development, staging, production).

### Usage

```bash
# Basic usage
node db-migrate.js --source=prod --target=dev

# With additional options
node db-migrate.js --source=prod --target=dev --sanitize --skip-tables=logs,audit_trail

# Dry run (simulation without making changes)
node db-migrate.js --source=staging --target=dev --dry-run

# Show help information
node db-migrate.js --help
```

### Command Line Options

- `--source=<env>`: Source environment (dev, staging, prod)
- `--target=<env>`: Target environment (dev, staging, prod)
- `--skip-tables=<tables>`: Comma-separated list of tables to skip
- `--only-tables=<tables>`: Comma-separated list of tables to include
- `--sanitize`: Sanitize sensitive data (emails, phones, passwords)
- `--dry-run`: Show what would happen without making changes
- `--no-confirm`: Skip confirmation prompts
- `--help`: Display help information

### Features

- Full database migration between environments with a single command
- Environment-specific database configurations
- Selective table migration with include/exclude options
- Data sanitization for non-production environments
- Dry run mode to preview operations without making changes
- Confirmation prompts before destructive operations
- Comprehensive logging of all migration operations
- Error handling with clear messages

## Environment Variables

The scripts use the following environment variables from the `.env` file:

```
# Main database (used as fallback)
DATABASE_NAME=property_management
DATABASE_USER=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_PASSWORD=your_password

# Environment-specific databases (for migration script)
DEV_DATABASE_NAME=property_management_dev
DEV_DATABASE_USER=postgres
DEV_DATABASE_HOST=localhost
DEV_DATABASE_PORT=5432
DEV_DATABASE_PASSWORD=your_password

STAGING_DATABASE_NAME=property_management_staging
STAGING_DATABASE_USER=postgres
STAGING_DATABASE_HOST=staging-server
STAGING_DATABASE_PORT=5432
STAGING_DATABASE_PASSWORD=your_password

PROD_DATABASE_NAME=property_management
PROD_DATABASE_USER=postgres
PROD_DATABASE_HOST=production-server
PROD_DATABASE_PORT=5432
PROD_DATABASE_PASSWORD=your_password
```

## Log File

All operations are logged to `backups.log` in the backups directory with the following information:
- Timestamp of operation
- Type of operation (backup, restore, or migrate)
- File path
- Database name
- File size (for backups)
- Source and target environments (for migrations)

## Automation

Consider setting up a cron job to run the backup script automatically at regular intervals.

Example crontab entry for daily backups at 2 AM:

```
0 2 * * * cd /path/to/project/backend/scripts && /usr/bin/node db-backup.js
``` 