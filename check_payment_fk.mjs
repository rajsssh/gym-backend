import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'gym_db'});

// Check payment table structure
const [cols] = await conn.query('DESCRIBE payment');
console.log('Payment columns:', cols.map(c => c.Field));

// Check existing FK constraints on payment table
const [fks] = await conn.query(`
  SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA='gym_db' AND TABLE_NAME='payment' AND REFERENCED_TABLE_NAME IS NOT NULL
`);
console.log('Foreign Keys on payment:', fks);

// Check orphan planId values in payment table
const [orphans] = await conn.query(`
  SELECT p.id, p.planId, p.memberId, p.amount 
  FROM payment p 
  LEFT JOIN plan pl ON p.planId = pl.id 
  WHERE p.planId IS NOT NULL AND pl.id IS NULL
`);
console.log('Orphan planId rows in payment:', orphans.length, orphans);

// Count total payment rows
const [[{cnt}]] = await conn.query('SELECT COUNT(*) as cnt FROM payment');
console.log('Total payment rows:', cnt);

await conn.end();
