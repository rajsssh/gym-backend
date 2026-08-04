import { pool } from './src/config/db.js';
pool.query(`
  UPDATE message_templates 
  SET 
    subject = 'New Plan Upgrade Request',
    message = 'Admin: {AdminName}\\nGym: {GymName}\\nCurrent Plan: {CurrentPlan}\\nRequested Plan: {RequestedPlan}\\nBilling: Monthly / Yearly\\nRequested At: {DateTime}\\nStatus: Pending',
    variables = '["AdminName", "GymName", "CurrentPlan", "RequestedPlan", "DateTime"]',
    channel = 'EMAIL,IN_APP'
  WHERE eventKey = 'PLAN_UPGRADE_REQUEST'
`).then(res => { console.log("Updated PLAN_UPGRADE_REQUEST successfully."); process.exit(); });
