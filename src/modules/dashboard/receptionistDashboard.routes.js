import { Router } from "express";
import { getReceptionistDashboard } from "./receptionistDashboard.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

router.get("/", verifyToken(["Superadmin", "Admin", "receptionist"]), getReceptionistDashboard);

export default router;
