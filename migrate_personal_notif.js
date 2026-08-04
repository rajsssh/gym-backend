import { pool } from './src/config/db.js';

async function migrate() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS personal_notification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        memberId INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        sentBy INT,
        isRead TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (memberId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    await pool.query(sql);
    console.log('personal_notification table created!');
  } catch(e) { 
    console.error(e.message); 
  }
  process.exit();
}
migrate();
