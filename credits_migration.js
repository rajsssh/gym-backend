import { pool } from './src/config/db.js';

const runMigration = async () => {
  try {
    console.log("Starting Notification Credits Migration...");

    // 1. Create credit_packages table
    const createCreditPackagesTable = `
      CREATE TABLE IF NOT EXISTS credit_packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        packageName VARCHAR(100) NOT NULL,
        credits INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createCreditPackagesTable);
    console.log("✅ credit_packages table created or already exists.");

    // Insert default packages if none exist
    const [existingPackages] = await pool.query(`SELECT COUNT(*) as count FROM credit_packages`);
    if (existingPackages[0].count === 0) {
      await pool.query(`
        INSERT INTO credit_packages (packageName, credits, price, isActive) VALUES 
        ('Bronze Package', 1000, 1000.00, true),
        ('Silver Package', 5000, 4500.00, true),
        ('Gold Package', 10000, 8000.00, true)
      `);
      console.log("✅ Inserted default credit packages.");
    }

    // 2. Ensure whatsapp_credit_transactions has correct columns
    const [columns] = await pool.query(`SHOW COLUMNS FROM whatsapp_credit_transactions`);
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('transactionType')) {
      await pool.query(`ALTER TABLE whatsapp_credit_transactions ADD COLUMN transactionType ENUM('PURCHASE', 'USAGE', 'REFUND') DEFAULT 'USAGE'`);
      console.log("✅ Added transactionType to whatsapp_credit_transactions");
    }
    if (!columnNames.includes('description')) {
      await pool.query(`ALTER TABLE whatsapp_credit_transactions ADD COLUMN description VARCHAR(255)`);
      console.log("✅ Added description to whatsapp_credit_transactions");
    }
    if (!columnNames.includes('userId')) {
       await pool.query(`ALTER TABLE whatsapp_credit_transactions ADD COLUMN userId INT NOT NULL`);
       console.log("✅ Added userId to whatsapp_credit_transactions");
    }
    if (!columnNames.includes('creditsAdded')) {
       await pool.query(`ALTER TABLE whatsapp_credit_transactions ADD COLUMN creditsAdded INT DEFAULT 0`);
       console.log("✅ Added creditsAdded to whatsapp_credit_transactions");
    }
    if (!columnNames.includes('creditsUsed')) {
       await pool.query(`ALTER TABLE whatsapp_credit_transactions ADD COLUMN creditsUsed INT DEFAULT 0`);
       console.log("✅ Added creditsUsed to whatsapp_credit_transactions");
    }

    // 3. Add lowCreditThreshold to automation_settings if not exists
    const [autoCols] = await pool.query(`SHOW COLUMNS FROM automation_settings`);
    const autoColNames = autoCols.map(c => c.Field);
    if (!autoColNames.includes('lowCreditThreshold')) {
      await pool.query(`ALTER TABLE automation_settings ADD COLUMN lowCreditThreshold INT DEFAULT 50`);
      console.log("✅ Added lowCreditThreshold to automation_settings");
    }

    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
