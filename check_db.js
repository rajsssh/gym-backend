import { pool } from "./src/config/db.js";

async function check() {
  try {
    const [result] = await pool.query("ALTER TABLE plan ADD COLUMN discountPercent INT DEFAULT 0;");
    console.log("Column added successfully:", result);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error("Error adding column:", error);
    }
  }
  process.exit(0);
}

check();

check();
