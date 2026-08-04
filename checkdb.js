import mysql from "mysql2/promise";

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'gym_db'
    });
    
    console.log("Connected successfully!");
    
    const [rows] = await conn.query("SELECT id, memberId, amount, invoiceNo, paymentDate FROM payment ORDER BY id DESC LIMIT 5");
    console.log("--- RECENT PAYMENTS ---");
    console.table(rows);
    
    const [sums] = await conn.query("SELECT SUM(amount) as total FROM payment");
    console.log("--- TOTAL REVENUE IN DB ---", sums[0].total);
    
    conn.end();
  } catch (err) {
    console.error(err);
  }
}

run();
