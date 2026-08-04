import cron from "node-cron";
import { pool } from "../config/db.js";
export const startMemberExpiryCron = () => {
  cron.schedule("0 3 * * *", async () => {
    let lockAcquired = false;

    try {
      const [[lock]] = await pool.query(
        `SELECT GET_LOCK('member_expiry_cron', 0) AS acquired`
      );

      if (!lock.acquired) {
        console.log("⏭️ Membership expiry cron skipped (lock held)");
        return;
      }

      lockAcquired = true;

      const istTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      console.log(`⏳ Membership expiry cron started | IST: ${istTime}`);

      await pool.query(`
        UPDATE member
        SET status = 'Inactive'
        WHERE status = 'Active'
          AND membershipTo IS NOT NULL
          AND membershipTo < CONVERT_TZ(NOW(), '+00:00', '+05:30')
      `);

      console.log(`✅ Membership expiry completed | IST: ${istTime}`);
    } catch (err) {
      console.error("❌ Membership expiry cron failed", err);
    } finally {
      if (lockAcquired) {
        await pool.query(`SELECT RELEASE_LOCK('member_expiry_cron')`);
      }
    }
  });
};

// export const startPTAutoCompleteCron = () => {
//   cron.schedule("*/1 * * * *", async () => {
//     let lockAcquired = false;

//     try {
//       const [[lock]] = await pool.query(
//         `SELECT GET_LOCK('pt_auto_complete_cron', 0) AS acquired`
//       );

//       if (!lock.acquired) {
//         console.log("⏭️ PT auto-complete cron skipped (lock held)");
//         return;
//       }

//       lockAcquired = true;

//       // THE FIX: Set the connection timezone to match the server's OS timezone (IST)
//       await pool.query(`SET time_zone = '+05:30';`);

//       console.log(
//         `⏳ PT auto-complete cron started | DB Timezone: IST | Timestamp: ${new Date().toISOString()}`
//       );

//       // Define the calculated session times. No need for CONVERT_TZ anymore.
//       const sessionStart = `TIMESTAMP(DATE(date), time)`;
//       const sessionEnd = `TIMESTAMP(DATE(date), ADDTIME(time, SEC_TO_TIME(duration * 60)))`;

//       /* =====================================
//          1️⃣ UPCOMING → ACTIVE
//       ===================================== */
//       const [activeResult] = await pool.query(`
//         UPDATE session
//         SET status = 'Active'
//         WHERE status = 'Upcoming'
//           AND NOW() >= ${sessionStart}
//           AND NOW() < ${sessionEnd}
//       `);

//       if (activeResult.affectedRows > 0) {
//         console.log(`🔄 Sessions marked as Active: ${activeResult.affectedRows}`);
//       }

//       /* =====================================
//          2️⃣ ACTIVE → COMPLETE
//       ===================================== */
//       const [completeResult] = await pool.query(`
//         UPDATE session
//         SET status = 'Complete'
//         WHERE status = 'Active'
//           AND NOW() > ${sessionEnd}
//       `);

//       if (completeResult.affectedRows > 0) {
//         console.log(`🏁 Sessions completed: ${completeResult.affectedRows}`);
//       }

//       /* =====================================
//          3️⃣ UPCOMING → COMPLETE (MISSED)
//       ===================================== */
//       const [missedResult] = await pool.query(`
//         UPDATE session
//         SET status = 'Complete'
//         WHERE status = 'Upcoming'
//           AND NOW() > ${sessionEnd}
//       `);

//       if (missedResult.affectedRows > 0) {
//         console.log(`⚠️ Missed sessions auto-completed: ${missedResult.affectedRows}`);
//       }

//     } catch (err) {
//       console.error("❌ PT auto-complete cron failed", err);
//     } finally {
//       if (lockAcquired) {
//         await pool.query(`SELECT RELEASE_LOCK('pt_auto_complete_cron')`);
//       }
//     }
//   });
// };

const SERVER_TIME_CORRECTION_HOURS = 5;
const SERVER_TIME_CORRECTION_MINUTES = 30;
// =======================================================

export const startPTAutoCompleteCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    let lockAcquired = false;

    try {
      const [[lock]] = await pool.query(
        `SELECT GET_LOCK('pt_auto_complete_cron', 0) AS acquired`
      );

      if (!lock.acquired) {
        console.log("⏭️ PT auto-complete cron skipped (lock held)");
        return;
      }

      lockAcquired = true;

      // Use the manually configured correction with MariaDB-compatible syntax
      const correctedNowUTC = `DATE_SUB(DATE_SUB(NOW(), INTERVAL ${SERVER_TIME_CORRECTION_HOURS} HOUR), INTERVAL ${SERVER_TIME_CORRECTION_MINUTES} MINUTE)`;

      console.log(
        `⏳ PT auto-complete cron started | Using server-corrected time (Interval: ${SERVER_TIME_CORRECTION_HOURS}h ${SERVER_TIME_CORRECTION_MINUTES}m)`
      );

      // Your session data is stored in IST (+05:30). We convert it to UTC for comparison.
      const sourceTimezone = '+05:30';
      const sessionStartUTC = `CONVERT_TZ(TIMESTAMP(DATE(date), time), '${sourceTimezone}', '+00:00')`;
      const sessionEndUTC = `CONVERT_TZ(TIMESTAMP(DATE(date), ADDTIME(time, SEC_TO_TIME(duration * 60))), '${sourceTimezone}', '+00:00')`;

      /* =====================================
         1️⃣ UPCOMING → ACTIVE
      ===================================== */
      const [activeResult] = await pool.query(`
        UPDATE session
        SET status = 'Active'
        WHERE status = 'Upcoming'
          AND ${correctedNowUTC} >= ${sessionStartUTC}
          AND ${correctedNowUTC} < ${sessionEndUTC}
      `);

      if (activeResult.affectedRows > 0) {
        console.log(`🔄 Sessions marked as Active: ${activeResult.affectedRows}`);
      }

      /* =====================================
         2️⃣ ACTIVE → COMPLETE
      ===================================== */
      const [completeResult] = await pool.query(`
        UPDATE session
        SET status = 'Complete'
        WHERE status = 'Active'
          AND ${correctedNowUTC} > ${sessionEndUTC}
      `);

      if (completeResult.affectedRows > 0) {
        console.log(`🏁 Sessions completed: ${completeResult.affectedRows}`);
      }

      /* =====================================
         3️⃣ UPCOMING → COMPLETE (MISSED)
      ===================================== */
      const [missedResult] = await pool.query(`
        UPDATE session
        SET status = 'Complete'
        WHERE status = 'Upcoming'
          AND ${correctedNowUTC} > ${sessionEndUTC}
      `);

      if (missedResult.affectedRows > 0) {
        console.log(`⚠️ Missed sessions auto-completed: ${missedResult.affectedRows}`);
      }

    } catch (err) {
      console.error("❌ PT auto-complete cron failed", err);
    } finally {
      if (lockAcquired) {
        await pool.query(`SELECT RELEASE_LOCK('pt_auto_complete_cron')`);
      }
    }
  });
};