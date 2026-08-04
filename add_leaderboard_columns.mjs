import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'gym_db'});

const alterations = [
  // Separate per-goal scores
  `ALTER TABLE member_assessments ADD COLUMN fat_loss_score DECIMAL(8,2) NULL`,
  `ALTER TABLE member_assessments ADD COLUMN muscle_gain_score DECIMAL(8,2) NULL`,
  `ALTER TABLE member_assessments ADD COLUMN maintenance_score DECIMAL(8,2) NULL`,
  // Stored rank (optional — still computed dynamically, but stored for caching)
  `ALTER TABLE member_assessments ADD COLUMN leaderboard_rank INT NULL`,
  // current_bf_percent alias (body_fat_percentage already exists — just add alias for clarity)
  `ALTER TABLE member_assessments ADD COLUMN current_bf_percent DECIMAL(6,2) NULL`,
  // current_lbm alias (lean_body_mass already exists — add stored alias)
  `ALTER TABLE member_assessments ADD COLUMN current_lbm DECIMAL(8,2) NULL`,
];

for (const sql of alterations) {
  try {
    await conn.query(sql);
    console.log('✅', sql.split('ADD COLUMN')[1]?.trim().split(' ')[0]);
  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('⏩ Already exists:', sql.split('ADD COLUMN')[1]?.trim().split(' ')[0]);
    } else {
      console.error('❌', e.message);
    }
  }
}

// Backfill current_bf_percent and current_lbm from existing columns
await conn.query(`UPDATE member_assessments SET current_bf_percent = body_fat_percentage WHERE current_bf_percent IS NULL`);
await conn.query(`UPDATE member_assessments SET current_lbm = lean_body_mass WHERE current_lbm IS NULL`);
console.log('✅ Backfilled current_bf_percent and current_lbm');

// Backfill separate scores from existing final_leaderboard_score where fitness_goal is known
const [rows] = await conn.query(`
  SELECT id, fitness_goal, final_leaderboard_score 
  FROM member_assessments 
  WHERE fitness_goal IS NOT NULL AND final_leaderboard_score IS NOT NULL
`);
for (const row of rows) {
  const score = Number(row.final_leaderboard_score);
  let updateSql = '';
  if (row.fitness_goal === 'fat_loss') {
    updateSql = `UPDATE member_assessments SET fat_loss_score = ${score} WHERE id = ${row.id}`;
  } else if (row.fitness_goal === 'muscle_gain') {
    updateSql = `UPDATE member_assessments SET muscle_gain_score = ${score} WHERE id = ${row.id}`;
  } else if (row.fitness_goal === 'maintenance') {
    updateSql = `UPDATE member_assessments SET maintenance_score = ${score} WHERE id = ${row.id}`;
  }
  if (updateSql) await conn.query(updateSql);
}
console.log('✅ Backfilled', rows.length, 'goal scores');

const [finalCols] = await conn.query('DESCRIBE member_assessments');
console.log('Final columns:', finalCols.map(c => c.Field));
await conn.end();
