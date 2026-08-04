import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import listEndpoints from "express-list-endpoints";
import app from "./src/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDocs() {
  console.log("Generating documentation...");

  // 1. Generate API Spectrum
  try {
    const endpoints = listEndpoints(app);
    let apiMdContent = "# API Spectrum\n\n> This file is auto-generated based on the Express Router logic. Do not edit manually.\n\n";
    apiMdContent += "To update this file after making API changes, run `npm run docs`.\n\n";
    apiMdContent += "| Route Path | Methods | Middleware |\n";
    apiMdContent += "|------------|---------|------------|\n";

    for (const endpoint of endpoints) {
      const methods = endpoint.methods.join(", ");
      const middlewares = endpoint.middlewares.join(", ") || "None";
      apiMdContent += `| \`${endpoint.path}\` | ${methods} | ${middlewares} |\n`;
    }

    fs.writeFileSync(path.join(__dirname, "Api_spectrum.md"), apiMdContent);
    console.log("✅ Api_spectrum.md generated successfully!");
  } catch (error) {
    console.error("❌ Failed to generate API doc:", error.message);
  }

  // 2. Generate Database and RBAC Docs dynamically from MySQL
  let connection;
  try {
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "gym_db",
      port: 3306,
    });

    const [tables] = await connection.query("SHOW TABLES");
    let dbMdContent = "# Database Schema\n\n> This file is auto-generated based on the current MySQL database tables. Do not edit manually.\n\n";
    dbMdContent += "To update this file after making Database changes, run `npm run docs`.\n\n";

    let rolesFound = [];

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      dbMdContent += `## Table: \`${tableName}\`\n\n`;
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
      
      dbMdContent += "| Field | Type | Null | Key | Default | Extra |\n";
      dbMdContent += "|-------|------|------|-----|---------|-------|\n";
      for (const col of columns) {
        dbMdContent += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'} | ${col.Extra} |\n`;
      }
      dbMdContent += "\n";
    }

    fs.writeFileSync(path.join(__dirname, "database.md"), dbMdContent);
    console.log("✅ database.md generated successfully!");

    // Generate RBAC.md
    let rbacContent = "# Role Based Access Control (RBAC)\n\n> This file is auto-generated to keep track of security levels.\n\n";
    rbacContent += "To update this file, run `npm run docs`.\n\n";
    rbacContent += "### User Roles\n\nThe Gym System relies on middleware `verifyToken` from `src/middlewares/auth.js` to manage access.\n\n";
    rbacContent += "Common roles include:\n- `Admin` / `Superadmin`\n- `Staff`\n- `Member`\n\n";
    rbacContent += "### Entity Access Policies\n\n";
    rbacContent += "- **Members**: Can view their own profiles, attendances, and plans.\n";
    rbacContent += "- **Staff/Trainers**: Can manage members, view classes, and manage attendances.\n";
    rbacContent += "- **Admin**: Full access to all endpoints, branches, payments, and system settings.\n";
    
    fs.writeFileSync(path.join(__dirname, "RBAC.md"), rbacContent);
    console.log("✅ RBAC.md generated successfully!");

    // Generate flow.md
    let flowContent = "# System Flow Document\n\n> This document explains the primary operational workflows of the Backend.\n\n";
    flowContent += "To update this file, run `npm run docs`.\n\n";
    flowContent += "## 1. Authentication Flow\n";
    flowContent += "- User calls `/api/auth/login` (Admin/Staff/Member).\n";
    flowContent += "- System validates credentials and returns a JWT Token.\n";
    flowContent += "- User uses `Authorization: Bearer <token>` for protected endpoints.\n\n";
    flowContent += "## 2. Membership & Plan Flow\n";
    flowContent += "- Admin/Staff creates Plans via `/api/plans`.\n";
    flowContent += "- Member is registered via `/api/members`.\n";
    flowContent += "- Plan is assigned to Member via `/api/member-plan-assignments`.\n";
    flowContent += "- System Cron job checks for plan expiry every day.\n\n";
    flowContent += "## 3. Attendance Flow\n";
    flowContent += "- Universal QR System scans member/staff.\n";
    flowContent += "- Request goes to `/api/attendance` (for members) or `/api/staff-attendance` (for staff).\n";
    flowContent += "- Database logs check-in/check-out time.\n\n";

    fs.writeFileSync(path.join(__dirname, "flow.md"), flowContent);
    console.log("✅ flow.md generated successfully!");

  } catch (error) {
    console.error("❌ Failed to generate Database/RBAC docs:", error.message);
  } finally {
    if (connection) await connection.end();
  }
  
  process.exit(0);
}

generateDocs();
