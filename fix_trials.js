import { pool } from './src/config/db.js';
pool.query("UPDATE user SET subscriptionPlan = '7-Day Trial', isTrial = 1 WHERE roleId = 2 AND (planName LIKE '%trial%' OR planName LIKE '%free%' OR price = 0)")
  .then(() => {
    console.log('Fixed existing trials in DB');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
