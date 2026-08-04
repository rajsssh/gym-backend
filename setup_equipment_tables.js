import { pool } from "./src/config/db.js";

async function setupTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gym_equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NULL,
        quantity INT DEFAULT 1,
        \`condition\` VARCHAR(100) DEFAULT 'Good',
        purchaseDate DATE NULL,
        purchaseCost DECIMAL(10,2) NULL,
        location VARCHAR(255) NULL,
        nextMaintenanceDate DATE NULL,
        branchId INT NOT NULL,
        notes TEXT NULL,
        imageUrl TEXT NULL,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ gym_equipment table ready!");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requestedBy INT NOT NULL,
        role VARCHAR(100) DEFAULT 'MEMBER',
        itemName VARCHAR(255) NOT NULL,
        category VARCHAR(255) DEFAULT 'Other',
        quantity INT DEFAULT 1,
        reason TEXT NULL,
        branchId INT NULL,
        adminId INT NULL,
        imageUrl TEXT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        adminRemarks TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ equipment_requests table ready!");

    // Add sample equipment if branch 48 or default branch has no items
    const [existing] = await pool.query(`SELECT COUNT(*) as count FROM gym_equipment`);
    if (existing[0].count === 0) {
      await pool.query(`
        INSERT INTO gym_equipment (name, category, quantity, \`condition\`, location, branchId) VALUES
        ('Commercial Treadmill X1', 'Cardio', 5, 'Good', 'Cardio Zone', 48),
        ('Olympic Barbell 20kg', 'Strength', 8, 'Good', 'Free Weight Area', 48),
        ('Adjustable Dumbbell Set', 'Strength', 12, 'Good', 'Dumbbell Rack', 48),
        ('Spin Bike Pro', 'Cardio', 2, 'Low Stock', 'Spinning Studio', 48)
      `);
      console.log("✅ Sample equipment inserted!");
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Setup error:", err);
    process.exit(1);
  }
}

setupTables();
