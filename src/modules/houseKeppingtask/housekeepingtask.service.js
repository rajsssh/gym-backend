import { pool } from "../../config/db.js";

import { sendAppNotification } from "../../utils/notificationHelper.js";

export const createTaskService = async (data) => {
  const { assignedTo, roleId, adminId, branchId, taskTitle, dueDate, priority, description } =
    data;
  try {
    if (!adminId) throw new Error("adminId is required");

    // Step 3: Insert the task into the tasks table
    const [result] = await pool.query(
      `INSERT INTO tasks (assignedTo, roleId, branchId, taskTitle, dueDate, priority, description, status, createdById)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Assigned', ?)`,
      [
        assignedTo,
        roleId,
        branchId,
        taskTitle,
        dueDate,
        priority,
        description,
        adminId, 
      ]
    );

    // Step 4: Fetch the newly created task to return
    const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [
      result.insertId,
    ]);

    const newTask = rows[0];

    // Notification Logic
    if (assignedTo) {
      // Find userId for assigned staff
      const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id = ?`, [assignedTo]);
      if (staffRows.length > 0) {
        const staffUserId = staffRows[0].userId;
        const msg = `A new task has been assigned to you by Admin.
Task Name: ${taskTitle}
Priority: ${priority}
Due Date: ${dueDate}
Status: Assigned`;

        await sendAppNotification(staffUserId, msg, {
          title: "New Task Assigned",
          sender_id: adminId,
          reference_type: "TASK",
          reference_id: result.insertId
        });
      }
    }

    return newTask;
  } catch (error) {
    throw new Error("Error creating task: " + error.message);
  }
};

export const getTasksByAdminIdService = async (adminId) => {
  try {
    // Step 1: Fetch tasks created by the admin (createdById = adminId)
    const [tasks] = await pool.query(
      "SELECT * FROM tasks WHERE createdById = ?",
      [adminId]
    );

    // If no tasks found, return an empty array
    if (!tasks || tasks.length === 0) {
      return [];
    }

    // Step 2: Fetch admin details from users table based on createdById (adminId)
    const [adminDetails] = await pool.query(
      "SELECT id, fullName, email, phone FROM user WHERE id = ?",
      [adminId]
    );

    // Step 3: For each task, fetch staff (assignedTo) details or role details
    for (let task of tasks) {
      if (task.assignedTo) {
        // Fetch staff details using assignedTo (staffId)
        const [staffDetails] = await pool.query(
          "SELECT id, userId, gender, dateOfBirth, joinDate, status FROM staff WHERE id = ?",
          [task.assignedTo]
        );

        if (staffDetails && staffDetails.length > 0) {
          const staff = staffDetails[0];

          // Fetch user details for the staff based on userId
          const [userDetails] = await pool.query(
            "SELECT id, fullName, email, phone, roleId FROM user WHERE id = ?",
            [staff.userId]
          );

          // Add staff and user details to the task
          task.staff = {
            ...staff,
            fullName: userDetails[0].fullName,
            email: userDetails[0].email,
            phone: userDetails[0].phone,
            roleId: userDetails[0].roleId,
          };
        }
      } else if (task.roleId) {
        const [roleDetails] = await pool.query(
          "SELECT id, name FROM role WHERE id = ?",
          [task.roleId]
        );
        if (roleDetails && roleDetails.length > 0) {
          task.role = roleDetails[0];
        }
      }

      // Add the admin details to the task
      task.admin = adminDetails ? adminDetails[0] : null;
    }

    return tasks;
  } catch (error) {
    throw new Error(
      "Error fetching tasks with admin and staff details: " + error.message
    );
  }
};
export const getAllTasksService = async (adminId, userRole) => {
  let query = `SELECT * FROM tasks ORDER BY id DESC`;
  let params = [];
  if (userRole !== "Superadmin") {
    query = `SELECT * FROM tasks WHERE createdById = ? ORDER BY id DESC`;
    params = [adminId];
  }
  const [rows] = await pool.query(query, params);
  return rows;
};

export const getTaskByBranchIdService = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT * FROM tasks WHERE branchId=? ORDER BY id DESC`,
    [branchId]
  );
  return rows;
};

export const getTaskAsignedService = async (userId) => {
  // Fetch staffId and roleId based on userId
  const [staffRows] = await pool.query(
    `SELECT staff.id as staffId, staff.adminId, user.roleId 
     FROM user 
     LEFT JOIN staff ON staff.userId = user.id 
     WHERE user.id = ?`,
    [userId]
  );
  
  if (!staffRows || staffRows.length === 0) {
    return [];
  }
  
  const staffId = staffRows[0].staffId;
  const roleId = staffRows[0].roleId;
  const adminId = staffRows[0].adminId;

  const [rows] = await pool.query(
    `SELECT * FROM tasks WHERE createdById = ? AND (assignedTo = ? OR roleId = ?) ORDER BY id DESC`,
    [adminId, staffId, roleId]
  );
  return rows;
};
export const getTaskByIdService = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return rows[0];
};

export const updateTaskService = async (id, data) => {
  // 1️⃣ Pahle old task fetch karo
  const [existing] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);

  if (!existing.length) {
    throw { status: 404, message: "Task not found" };
  }

  const old = existing[0];

  // 2️⃣ New data ko merge karo → undefined fields old values le lenge
  const updatedData = {
    assignedTo: data.assignedTo ?? old.assignedTo,
    branchId: data.branchId ?? old.branchId,
    taskTitle: data.taskTitle ?? old.taskTitle,
    dueDate: data.dueDate ?? old.dueDate,
    priority: data.priority ?? old.priority,
    description: data.description ?? old.description,
    status: data.status ?? old.status,
  };

  // 3️⃣ Now update final merged data
  await pool.query(
    `UPDATE tasks SET 
      assignedTo = ?, 
      branchId = ?, 
      taskTitle = ?, 
      dueDate = ?, 
      priority = ?, 
      description = ?, 
      status = ?
     WHERE id = ?`,
    [
      updatedData.assignedTo,
      updatedData.branchId,
      updatedData.taskTitle,
      updatedData.dueDate,
      updatedData.priority,
      updatedData.description,
      updatedData.status,
      id,
    ]
  );

  // 4️⃣ Updated data return karo
  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  const updatedTask = rows[0];

  // Notification Logic
  if (updatedData.assignedTo) {
    const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id = ?`, [updatedData.assignedTo]);
    if (staffRows.length > 0) {
      const staffUserId = staffRows[0].userId;
      const msg = `Task Updated: ${updatedData.taskTitle}
Status: ${updatedData.status}
Priority: ${updatedData.priority}`;
      
      await sendAppNotification(staffUserId, msg, {
        title: "Task Updated",
        sender_id: old.createdById,
        reference_type: "TASK",
        reference_id: id
      });
    }
  }

  return updatedTask;
};

export const updateTaskStatusService = async (id, status) => {
  const [existingRows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!existingRows.length) throw { status: 404, message: "Task not found" };
  const existing = existingRows[0];

  await pool.query(`UPDATE tasks SET status = ? WHERE id = ?`, [status, id]);

  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  const updatedTask = rows[0];

  // Notification Logic
  if (["In Progress", "Completed"].includes(status)) {
    // Notify Admin
    let staffName = "Staff";
    if (existing.assignedTo) {
      const [sRows] = await pool.query(`SELECT user.fullName FROM staff JOIN user ON staff.userId = user.id WHERE staff.id = ?`, [existing.assignedTo]);
      if (sRows.length > 0) staffName = sRows[0].fullName;
    }
    const msg = status === "Completed" ? `${staffName} completed task: ${existing.taskTitle}` : `${staffName} started task: ${existing.taskTitle}`;
    
    await sendAppNotification(existing.createdById, msg, {
      title: `Task ${status}`,
      reference_type: "TASK",
      reference_id: id
    });
  } else if (["Approved", "Rejected"].includes(status) && existing.assignedTo) {
    // Notify Staff
    const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id = ?`, [existing.assignedTo]);
    if (staffRows.length > 0) {
      const staffUserId = staffRows[0].userId;
      const msg = status === "Approved" ? `Your completed task has been approved: ${existing.taskTitle}` : `Your completed task has been rejected: ${existing.taskTitle}`;
      
      await sendAppNotification(staffUserId, msg, {
        title: `Task ${status}`,
        sender_id: existing.createdById,
        reference_type: "TASK",
        reference_id: id
      });
    }
  }

  return updatedTask;
};

export const deleteTaskService = async (id) => {
  const [existingRows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (existingRows.length > 0) {
    const existing = existingRows[0];
    if (existing.assignedTo) {
      const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id = ?`, [existing.assignedTo]);
      if (staffRows.length > 0) {
        const staffUserId = staffRows[0].userId;
        const msg = `Assigned Task Cancelled: ${existing.taskTitle}`;
        
        await sendAppNotification(staffUserId, msg, {
          title: "Task Cancelled",
          sender_id: existing.createdById,
          reference_type: "TASK",
          reference_id: id
        });
      }
    }
  }

  await pool.query(`DELETE FROM tasks WHERE id = ?`, [id]);
  return { message: "Task deleted successfully" };
};
