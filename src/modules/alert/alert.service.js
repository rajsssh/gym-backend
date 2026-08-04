import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";

export const generateAlerts = async () => {
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 3); // 3-day pre-expiry alerts

  const todayStr = today.toISOString().slice(0, 10);
  const soonStr = soon.toISOString().slice(0, 10);

  const conn = pool;

  // --- Clear old alerts ---
  await conn.query("DELETE FROM alert");

  // --- Fetch members ---
  const [expiring] = await conn.query(
    "SELECT id, fullName, branchId FROM member WHERE membershipTo BETWEEN ? AND ?",
    [todayStr, soonStr]
  );

  const [expired] = await conn.query(
    "SELECT id, fullName, branchId FROM member WHERE membershipTo < ?",
    [todayStr]
  );

  const [noPayment] = await conn.query(
    "SELECT id, fullName, branchId FROM member WHERE planId IS NULL"
  );

  // --- Absenteeism detection ---
  // Calculates days since the last attendance check-in. If null, it means they never attended.
  // We only track people who have actively missed 3, 7, 15, or 30 consecutive days.
  const [absentMembers] = await conn.query(`
    SELECT m.id, m.fullName, m.email, m.phone, m.branchId, DATEDIFF(CURDATE(), MAX(a.checkIn)) AS daysAbsent
    FROM member m
    LEFT JOIN memberattendance a ON m.id = a.memberId
    WHERE m.status = 'ACTIVE'
    GROUP BY m.id
    HAVING daysAbsent IN (3, 7, 15, 30)
  `);

  // --- Prepare batch inserts ---
  const alerts = [];

  expiring.forEach(m => {
    alerts.push([ "EXPIRING", `${m.fullName}'s membership expires soon`, m.id, m.branchId ]);
  });

  expired.forEach(m => {
    alerts.push([ "EXPIRED", `${m.fullName}'s membership has expired`, m.id, m.branchId ]);
  });

  noPayment.forEach(m => {
    alerts.push([ "NO_PAYMENT", `${m.fullName} has no payment recorded`, m.id, m.branchId ]);
  });

  // Handle Attendance Alerts & Notifications
  for (const m of absentMembers) {
    let type = `ABSENT_${m.daysAbsent}_DAYS`;
    let message = "";
    
    if (m.daysAbsent === 3) {
      message = `${m.fullName} has been absent for 3 days`;
      // 3 Days: Alert only, no notification sent.
    } else if (m.daysAbsent === 7) {
      message = `${m.fullName} has been absent for 7 days`;
      dispatchNotification({
        category: "attendance_alert",
        toEmail: m.email,
        toPhone: m.phone,
        toUserId: m.id,
        subject: "We miss you at the Gym!",
        message: `Hi ${m.fullName}, it's been a week since your last workout. Come back soon to keep your momentum going!`,
        customChannels: ["EMAIL", "IN-APP"] // SMS/WhatsApp if integrated
      }).catch(err => console.error(err));
    } else if (m.daysAbsent === 15) {
      message = `${m.fullName} has been absent for 15 days (At-Risk)`;
      dispatchNotification({
        category: "attendance_alert",
        toEmail: m.email,
        toPhone: m.phone,
        toUserId: m.id,
        subject: "Don't give up on your goals!",
        message: `Hi ${m.fullName}, we haven't seen you in 15 days. Your fitness journey is important. Let us know if you need help getting back on track!`,
        customChannels: ["EMAIL", "IN-APP"]
      }).catch(err => console.error(err));
    } else if (m.daysAbsent === 30) {
      message = `${m.fullName} has been absent for 30 days (High Risk)`;
      dispatchNotification({
        category: "attendance_alert",
        toEmail: m.email,
        toPhone: m.phone,
        toUserId: m.id,
        subject: "Are you still with us?",
        message: `Hi ${m.fullName}, it's been a month since your last visit. We'd love to see you back. Please reach out if we can assist you!`,
        customChannels: ["EMAIL", "IN-APP"]
      }).catch(err => console.error(err));
    }
    
    alerts.push([ type, message, m.id, m.branchId ]);
  }

  if (alerts.length > 0) {
    const values = alerts.map(() => "(?, ?, ?, ?)").join(",");
    const flatValues = alerts.flat();
    await conn.query(
      `INSERT INTO alert (type, message, memberId, branchId) VALUES ${values}`,
      flatValues
    );
  }

  return true;
};
