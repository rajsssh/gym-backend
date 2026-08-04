import { pool } from "./src/config/db.js";

const createTables = async () => {
  try {
    const connection = await pool.getConnection();

    console.log("Creating gym_equipment table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gym_equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity INT DEFAULT 1,
        \`condition\` VARCHAR(50) DEFAULT 'Good',
        purchaseDate DATE,
        purchaseCost DECIMAL(10,2),
        location VARCHAR(255),
        nextMaintenanceDate DATE,
        branchId INT NOT NULL,
        notes TEXT,
        isActive TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating equipment_requests table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requestedBy INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        itemName VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity INT DEFAULT 1,
        reason TEXT,
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
        adminRemarks TEXT,
        branchId INT NOT NULL,
        adminId INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("Tables created successfully.");
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
};

createTables();
