import { pool } from "../src/config/db.js";

async function main() {
  try {
    const [planCols] = await pool.query("DESCRIBE plan");
    console.log("--- PLAN TABLE COLUMNS ---");
    console.log(planCols);

    const [planData] = await pool.query("SELECT * FROM plan LIMIT 5");
    console.log("--- PLAN DATA ---");
    console.log(planData);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
