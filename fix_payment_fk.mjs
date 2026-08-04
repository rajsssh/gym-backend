import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'gym_db'});

try {
  // 1. Drop the bad FK constraint on payment table (if it exists)
  const [fks] = await conn.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA='gym_db' AND TABLE_NAME='payment' AND CONSTRAINT_TYPE='FOREIGN KEY'
  `);
  console.log('Existing FKs:', fks);
  
  for (const fk of fks) {
    if (fk.CONSTRAINT_NAME === 'Payment_planId_fkey') {
      await conn.query(`ALTER TABLE payment DROP FOREIGN KEY Payment_planId_fkey`);
      console.log('✅ Dropped Payment_planId_fkey');
    }
  }

  // 2. Set orphan planId values to NULL (planId refs memberplan, not plan)
  const [result] = await conn.query(`UPDATE payment SET planId = NULL WHERE planId IS NOT NULL`);
  console.log('✅ Cleared planId values:', result.affectedRows, 'rows updated');

  // 3. Make planId nullable if it's not
  await conn.query(`ALTER TABLE payment MODIFY COLUMN planId INT NULL`);
  console.log('✅ Made planId nullable');

  // 4. Add collectedByName and collectedByRole if not present
  const [cols] = await conn.query('DESCRIBE payment');
  const colNames = cols.map(c => c.Field);
  console.log('Current columns:', colNames);
  
  if (!colNames.includes('collectedByName')) {
    await conn.query(`ALTER TABLE payment ADD COLUMN collectedByName VARCHAR(255) NULL`);
    console.log('✅ Added collectedByName');
  } else {
    console.log('✅ collectedByName already exists');
  }
  
  if (!colNames.includes('collectedByRole')) {
    await conn.query(`ALTER TABLE payment ADD COLUMN collectedByRole VARCHAR(100) NULL`);
    console.log('✅ Added collectedByRole');
  } else {
    console.log('✅ collectedByRole already exists');
  }

  // 5. Add memberplanId column to track memberplan relationship (instead of planId→plan)
  if (!colNames.includes('memberplanId')) {
    await conn.query(`ALTER TABLE payment ADD COLUMN memberplanId INT NULL`);
    console.log('✅ Added memberplanId');
  }

  const [finalCols] = await conn.query('DESCRIBE payment');
  console.log('Final payment columns:', finalCols.map(c => c.Field));

} catch(e) {
  console.error('Error:', e.message);
} finally {
  await conn.end();
}
