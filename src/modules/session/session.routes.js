import { Router } from "express";
import {
  createSession,
  listSessions,
  updateSession,
  updateSessionStatus,
  deleteSession,
  getMemberSessions,
  joinSession,
  getSessionMembers
} from "./session.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// ➤ Create new session (Only Superadmin + Admin)
router.post(
  "/create",
  verifyToken(["Superadmin", "Admin"]),
  createSession
);

// ➤ Member routes
router.get("/member/:memberId", verifyToken(["Member", "Admin", "Superadmin", "Staff"]), getMemberSessions);
router.post("/join", verifyToken(["Member", "Admin", "Superadmin", "Staff"]), joinSession);

// ➤ List sessions (Superadmin + Admin + Staff)
router.get("/:adminId/:trainerId?", verifyToken(["Superadmin", "Admin", "Staff"]), listSessions);

// ➤ Edit full session (Superadmin + Admin + Staff)
router.put(
  "/update/:sessionId",
  verifyToken(["Superadmin", "Admin", "Staff"]),
  updateSession
);

// ➤ Update only session status (Superadmin + Admin + Staff)
router.put(
  "/status/:sessionId",
  verifyToken(["Superadmin", "Admin", "Staff"]),
  updateSessionStatus
);

// ➤ Delete session (Superadmin + Admin + Staff)
router.delete(
  "/delete/:sessionId",
  verifyToken(["Superadmin", "Admin", "Staff"]),
  deleteSession
);

// ➤ View Session Members (Admin/Trainer)
router.get("/:sessionId/members", verifyToken(["Superadmin", "Admin", "Staff"]), getSessionMembers);

export default router;
