#!/usr/bin/env node

/**
 * Multi-Tenant Migration Runner
 * Executes the database migration to multi-tenant architecture
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'cinema_management',
  user: process.env.DB_USER || 'cinema_user',
  password: process.env.DB_PASSWORD || 'cinema_pass',
};

class MigrationRunner {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.migrationDir = path.join(__dirname, '..', 'migrations');
  }

  async connect() {
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Connected to database successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  async createBackup() {
    console.log('📦 Creating database backup...');

    const backupFilename = `backup_${Date.now()}.sql`;
    const backupPath = path.join(__dirname, '..', 'backups', backupFilename);

    // Create backups directory if it doesn't exist
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Execute pg_dump
    const { exec } = require('child_process');
    const dumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} > ${backupPath}`;

    return new Promise((resolve, reject) => {
      exec(dumpCommand, { env: { ...process.env, PGPASSWORD: dbConfig.password } }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Backup failed:', error.message);
          reject(error);
        } else {
          console.log(`✅ Backup created: ${backupPath}`);
          resolve(backupPath);
        }
      });
    });
  }

  async runMigrationFile(filename) {
    const filePath = path.join(this.migrationDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`🔄 Executing migration: ${filename}`);

    try {
      await this.pool.query(sql);
      console.log(`✅ Migration completed: ${filename}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${filename}`);
      console.error('Error:', error.message);
      throw error;
    }
  }

  async runAllMigrations() {
    const migrationFiles = [
      '001_add_multitenant_core.sql',
      '002_add_company_columns.sql',
      '003_update_constraints_and_indexes.sql'
    ];

    console.log('🚀 Starting multi-tenant migration...');
    console.log(`📋 Found ${migrationFiles.length} migration files`);

    for (const filename of migrationFiles) {
      await this.runMigrationFile(filename);
    }

    console.log('✅ All migrations completed successfully!');
  }

  async validateMigration() {
    console.log('🔍 Validating migration...');

    try {
      // Check if core tables exist
      const coreTablesQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('company', 'company_subscription', 'system_admin')
        ORDER BY table_name;
      `;

      const { rows: coreTables } = await this.pool.query(coreTablesQuery);

      if (coreTables.length !== 3) {
        throw new Error('Core multi-tenant tables not found');
      }

      // Check if company_id columns were added
      const companyColumnsQuery = `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'company_id'
        AND table_name IN (
          'customer', 'employee', 'movie', 'room', 'session',
          'ticket', 'inventory_item', 'discount_code', 'sale',
          'payment', 'audit_log', 'time_entry'
        )
        ORDER BY table_name;
      `;

      const { rows: companyColumns } = await this.pool.query(companyColumnsQuery);

      if (companyColumns.length < 10) {
        throw new Error('company_id columns not added to all required tables');
      }

      // Check default company exists
      const defaultCompanyQuery = `
        SELECT id, name FROM company
        WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
      `;

      const { rows: defaultCompany } = await this.pool.query(defaultCompanyQuery);

      if (defaultCompany.length !== 1) {
        throw new Error('Default company not found');
      }

      // Check data migration
      const dataCheckQuery = `
        SELECT
          (SELECT COUNT(*) FROM customer WHERE company_id IS NOT NULL) as customers,
          (SELECT COUNT(*) FROM employee WHERE company_id IS NOT NULL) as employees,
          (SELECT COUNT(*) FROM movie WHERE company_id IS NOT NULL) as movies;
      `;

      const { rows: dataCounts } = await this.pool.query(dataCheckQuery);
      console.log('📊 Migration data counts:', dataCounts[0]);

      console.log('✅ Migration validation successful!');
      return true;

    } catch (error) {
      console.error('❌ Migration validation failed:', error.message);
      return false;
    }
  }

  async generateReport() {
    console.log('📋 Generating migration report...');

    try {
      // Get company info
      const companyQuery = 'SELECT id, name, cnpj, is_active FROM company ORDER BY created_at';
      const { rows: companies } = await this.pool.query(companyQuery);

      // Get table record counts
      const countQueries = [
        'SELECT COUNT(*) as count FROM customer',
        'SELECT COUNT(*) as count FROM employee',
        'SELECT COUNT(*) as count FROM movie',
        'SELECT COUNT(*) as count FROM room',
        'SELECT COUNT(*) as count FROM session',
        'SELECT COUNT(*) as count FROM ticket',
        'SELECT COUNT(*) as count FROM inventory_item',
        'SELECT COUNT(*) as count FROM sale'
      ];

      const counts = {};
      const tableNames = ['customer', 'employee', 'movie', 'room', 'session', 'ticket', 'inventory_item', 'sale'];

      for (let i = 0; i < countQueries.length; i++) {
        const { rows } = await this.pool.query(countQueries[i]);
        counts[tableNames[i]] = parseInt(rows[0].count);
      }

      console.log('\n📊 Migration Report');
      console.log('==================');
      console.log(`🏢 Companies: ${companies.length}`);
      companies.forEach(company => {
        console.log(`   - ${company.name} (${company.cnpj}) - Active: ${company.is_active}`);
      });

      console.log('\n📈 Record Counts:');
      Object.entries(counts).forEach(([table, count]) => {
        console.log(`   - ${table}: ${count} records`);
      });

      console.log('\n✅ Migration completed successfully!');
      console.log('🎯 Next steps:');
      console.log('   1. Update your Prisma schema file');
      console.log('   2. Update application code for multi-tenancy');
      console.log('   3. Test the application thoroughly');
      console.log('   4. Update authentication middleware');

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
    }
  }

  async disconnect() {
    await this.pool.end();
    console.log('👋 Database connection closed');
  }
}

async function main() {
  const runner = new MigrationRunner();

  try {
    // Connect to database
    await runner.connect();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const skipBackup = args.includes('--skip-backup');
    const validateOnly = args.includes('--validate-only');
    const dryRun = args.includes('--dry-run');

    if (validateOnly) {
      console.log('🔍 Running validation only...');
      const isValid = await runner.validateMigration();
      process.exit(isValid ? 0 : 1);
    }

    if (dryRun) {
      console.log('🧪 Dry run mode - no changes will be made');
      console.log('Migration files that would be executed:');
      const migrationFiles = ['001_add_multitenant_core.sql', '002_add_company_columns.sql', '003_update_constraints_and_indexes.sql'];
      migrationFiles.forEach(file => console.log(`   - ${file}`));
      await runner.disconnect();
      return;
    }

    // Create backup unless skipped
    if (!skipBackup) {
      await runner.createBackup();
    }

    // Run migrations
    await runner.runAllMigrations();

    // Validate migration
    const isValid = await runner.validateMigration();
    if (!isValid) {
      console.error('❌ Migration validation failed - please check the database state');
      process.exit(1);
    }

    // Generate report
    await runner.generateReport();

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('\n🔄 Rollback options:');
    console.error('   1. Restore from backup if available');
    console.error('   2. Manual database cleanup may be required');
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MigrationRunner;