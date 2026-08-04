import mysql from 'mysql2/promise';

async function alterTable() {
  try {
    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "gym_db",
      port: 3307
    });

    await pool.query('ALTER TABLE leads ADD COLUMN followUpDate DATE;');
    console.log("Column followUpDate added successfully.");
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Column followUpDate already exists.");
      process.exit(0);
    }
    console.error("Error:", error);
    process.exit(1);
  }
}

alterTable();
