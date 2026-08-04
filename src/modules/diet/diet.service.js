import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import { sendAppNotification } from "../../utils/notificationHelper.js";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";

// ----- CREATE DIET PLAN -----
export const createDietPlanService = async ({ title, notes, branchId, createdBy, meals, dietType }) => {
  if (!title) throw { status: 400, message: "Diet plan title is required" };

  // Insert diet plan
  const [planResult] = await pool.query(
    "INSERT INTO dietplan (title, notes, branchId, createdBy, dietType) VALUES (?, ?, ?, ?, ?)",
    [title, notes || "", branchId || 0, createdBy || 0, dietType || 'Any']
  );
  const dietPlanId = planResult.insertId;

  // Insert meals if provided
  if (meals && meals.length) {
    const mealValues = meals.map(m => [dietPlanId, m.time || "", m.food || ""]);
    await pool.query(
      "INSERT INTO dietmeal (dietPlanId, time, food) VALUES ?",
      [mealValues]
    );
  }

  return getDietPlanByIdService(dietPlanId);
};

// ----- GET ALL DIET PLANS (FOR TRAINER/ADMIN) -----
export const getAllDietPlansService = async (branchId, createdBy) => {
  let query = "SELECT * FROM dietplan ORDER BY id DESC";
  let params = [];
  
  if (branchId) {
    query = "SELECT * FROM dietplan WHERE branchId = ? ORDER BY id DESC";
    params = [branchId];
  }

  const [plans] = await pool.query(query, params);

  if (plans.length === 0) return [];

  const planIds = plans.map(p => p.id);
  const [meals] = await pool.query(
    "SELECT * FROM dietmeal WHERE dietPlanId IN (?)",
    [planIds]
  );

  return plans.map(plan => ({
    ...plan,
    meals: meals.filter(m => m.dietPlanId === plan.id)
  }));
};

// ----- GET DIET PLAN BY ID -----
export const getDietPlanByIdService = async (id) => {
  const [planRows] = await pool.query("SELECT * FROM dietplan WHERE id = ?", [id]);
  if (planRows.length === 0) throw { status: 404, message: "Diet plan not found" };

  const [meals] = await pool.query("SELECT * FROM dietmeal WHERE dietPlanId = ?", [id]);
  return { ...planRows[0], meals };
};

// ----- UPDATE DIET PLAN -----
export const updateDietPlanService = async (id, { title, notes, meals, dietType }) => {
  const [existing] = await pool.query("SELECT * FROM dietplan WHERE id = ?", [id]);
  if (existing.length === 0) throw { status: 404, message: "Diet plan not found" };

  if (title !== undefined || notes !== undefined || dietType !== undefined) {
    await pool.query(
      "UPDATE dietplan SET title = COALESCE(?, title), notes = COALESCE(?, notes), dietType = COALESCE(?, dietType) WHERE id = ?",
      [title, notes, dietType, id]
    );
  }

  if (meals && Array.isArray(meals)) {
    await pool.query("DELETE FROM dietmeal WHERE dietPlanId = ?", [id]);
    
    if (meals.length > 0) {
      const mealValues = meals.map(m => [id, m.time || "", m.food || ""]);
      await pool.query(
        "INSERT INTO dietmeal (dietPlanId, time, food) VALUES ?",
        [mealValues]
      );
    }
  }

  return getDietPlanByIdService(id);
};

// ----- DELETE DIET PLAN -----
export const deleteDietPlanService = async (id) => {
  await pool.query("DELETE FROM dietplanassignment WHERE dietPlanId = ?", [id]);
  await pool.query("DELETE FROM dietmeal WHERE dietPlanId = ?", [id]);
  const [result] = await pool.query("DELETE FROM dietplan WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw { status: 404, message: "Diet plan not found" };
  return true;
};

// ----- ASSIGN DIET PLAN TO MEMBER -----
export const assignDietPlanService = async (memberId, dietPlanId) => {
  const [existing] = await pool.query(
    "SELECT * FROM dietplanassignment WHERE memberId = ? AND dietPlanId = ?",
    [memberId, dietPlanId]
  );
  if (existing.length) throw { status: 400, message: "Diet plan already assigned to member" };

  await pool.query(
    "INSERT INTO dietplanassignment (memberId, dietPlanId) VALUES (?, ?)",
    [memberId, dietPlanId]
  );

  // Fetch member & diet plan details to dispatch notifications
  try {
    const [memberRows] = await pool.query(
      "SELECT m.id, m.fullName, m.email, m.phone, m.userId, m.adminId FROM member m WHERE m.id = ?",
      [memberId]
    );
    const member = memberRows[0];

    const [planRows] = await pool.query(
      "SELECT title, createdBy FROM dietplan WHERE id = ?",
      [dietPlanId]
    );
    const plan = planRows[0];
    const planTitle = plan?.title || "Diet Plan";
    const createdBy = plan?.createdBy;

    // Fetch Diet Details
    const [mealRows] = await pool.query("SELECT time, food FROM dietmeal WHERE dietPlanId = ?", [dietPlanId]);
    let dietDetails = mealRows.map(m => `- ${m.time}: ${m.food}`).join('\\n');
    if (!dietDetails) dietDetails = "Check your dashboard for items.";

    // Fetch Gym Name and Trainer Name
    let gymName = "GymSoft";
    let trainerName = "Your Trainer";

    if (member && member.adminId) {
      const [adminRows] = await pool.query("SELECT gymName FROM user WHERE id = ?", [member.adminId]);
      if (adminRows.length > 0 && adminRows[0].gymName) {
        gymName = adminRows[0].gymName;
      }
    }
    
    if (createdBy) {
      const [creatorRows] = await pool.query("SELECT fullName FROM user WHERE id = ?", [createdBy]);
      if (creatorRows.length > 0) {
        trainerName = creatorRows[0].fullName;
      }
    }

    if (member && member.userId) {
      await sendTemplatedNotification({
        eventKey: 'DIET_PLAN_ASSIGNED',
        tenantId: member.adminId || null,
        receiverId: member.userId,
        receiverRole: 'Member',
        receiverEmail: member.email,
        receiverPhone: member.phone,
        variables: {
          Name: member.fullName,
          GymName: gymName,
          DietDetails: dietDetails,
          TrainerName: trainerName
        },
        referenceType: 'DIET_PLAN',
        referenceId: dietPlanId.toString(),
        actionUrl: '/member-dashboard/diet'
      });
    }
  } catch (err) {
    console.error("Error fetching notification details for diet assignment:", err.message);
  }

  return getDietPlanByIdService(dietPlanId);
};

// ----- GET MEMBER DIET PLANS -----
export const getMemberDietPlanService = async (memberIdParam) => {
  const memberId = parseInt(memberIdParam, 10);
  if (!memberId) return [];

  // 1. Resolve realMemberId & member details
  let realMemberId = memberId;
  let branchId = null;

  try {
    const [mRows] = await pool.query(
      `SELECT id, branchId, goal FROM member WHERE id = ? LIMIT 1`,
      [memberId]
    );
    if (mRows.length) {
      realMemberId = mRows[0].id;
      branchId = mRows[0].branchId;
    }
  } catch (e) {
    console.error("Error looking up member for diet:", e);
  }

  // 2. Query direct assignments in dietplanassignment
  const [assignments] = await pool.query(
    `SELECT a.id AS assignmentId, a.assignedAt, d.id AS dietPlanId, d.title, d.notes, d.dietType,
            m.id AS mealId, m.time AS mealTime, m.food AS mealFood
     FROM dietplanassignment a
     JOIN dietplan d ON a.dietPlanId = d.id
     LEFT JOIN dietmeal m ON d.id = m.dietPlanId
     WHERE a.memberId = ?
     ORDER BY a.id DESC`,
    [realMemberId]
  );

  const plansMap = {};
  if (assignments.length > 0) {
    assignments.forEach(a => {
      if (!plansMap[a.dietPlanId]) {
        plansMap[a.dietPlanId] = { 
          id: a.dietPlanId, 
          assignmentId: a.assignmentId,
          assignedAt: a.assignedAt,
          title: a.title, 
          notes: a.notes, 
          dietType: a.dietType || 'Any',
          meals: [] 
        };
      }
      if (a.mealId) {
        plansMap[a.dietPlanId].meals.push({
          id: a.mealId,
          time: a.mealTime,
          food: a.mealFood
        });
      }
    });
    return Object.values(plansMap);
  }

  return Object.values(plansMap);
};
