import {
  createTaskService,
  getAllTasksService,
  getTaskByIdService,
  updateTaskService,
  updateTaskStatusService,
  deleteTaskService,
  getTaskByBranchIdService,
  getTaskAsignedService,
  getTasksByAdminIdService,
} from "./housekeepingtask.service.js";
import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";

export const createTask = async (req, res) => {
  try {
    const {
      assignedTo,
      roleId,
      adminId,
      branchId = null,
      taskTitle,
      dueDate,
      priority,
      description,
    } = req.body;

    if ((!assignedTo && !roleId) || !adminId || !taskTitle || !dueDate || !priority || !description) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    const task = await createTaskService({
      assignedTo: assignedTo || null,
      roleId: roleId || null,
      adminId,
      branchId,
      taskTitle,
      dueDate,
      priority,
      description,
    });

    // 🚀 Handle Notifications
    try {
      let targetUsers = [];
      if (assignedTo) {
        // Fetch specific staff member's user details
        const [userRows] = await pool.query(
          "SELECT u.id, u.email, u.phone, u.fullName FROM staff s JOIN user u ON s.userId = u.id WHERE s.id = ?",
          [assignedTo]
        );
        targetUsers = userRows;
      } else if (roleId) {
        // Fetch all staff members in that department for this admin
        const [userRows] = await pool.query(
          "SELECT u.id, u.email, u.phone, u.fullName FROM staff s JOIN user u ON s.userId = u.id WHERE s.adminId = ? AND u.roleId = ?",
          [adminId, roleId]
        );
        targetUsers = userRows;
      }

      // Send notifications to all targets
      for (const u of targetUsers) {
        await dispatchNotification({
          category: "welcome_note", // Fallback category that is likely enabled
          toEmail: u.email,
          toPhone: u.phone,
          toUserId: u.id,
          adminIdForCredits: adminId,
          subject: `New Task Assigned: ${taskTitle}`,
          message: `Hello ${u.fullName},\n\nYou have been assigned a new task: "${taskTitle}".\nDue Date: ${dueDate}\nPriority: ${priority}\nDescription: ${description || 'N/A'}\n\nPlease check your dashboard to review it.`,
        });
      }
    } catch (notifErr) {
      console.error("Error sending task notifications:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully!",
      data: task,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const getTasksByAdminId = async (req, res) => {
  try {
    // Destructure adminId from the query params
    const { adminId } = req.params;

    // Validate if the adminId is provided
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    // Call the service to get tasks assigned by the admin
    const tasks = await getTasksByAdminIdService(adminId);

    if (!tasks || tasks.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No tasks found for this admin",
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      data: tasks,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const adminId = req.user?.adminId || req.user?.id;
    const userRole = req.user?.role;
    const tasks = await getAllTasksService(adminId, userRole);
    return res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTaskByBranchID = async (req, res) => {
  const task = await getTaskByBranchIdService(req.params.branchId);
  try {
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskAsignedTo = async (req, res) => {
  const task = await getTaskAsignedService(req.params.asignedtoID);
  try {
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const task = await getTaskByIdService(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const updated = await updateTaskService(req.params.id, req.body);
    return res.json({
      success: true,
      message: "Task updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body; // "Approved" | "Rejected" | "Completed"
    const id = req.params.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const updated = await updateTaskStatusService(id, status);

    return res.json({
      success: true,
      message: ` Task ${status} successfully`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    await deleteTaskService(req.params.id);
    return res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
