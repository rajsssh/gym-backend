import { Router } from "express";
import { getHousekeepingDashboard } from "./housekeepingdashboard.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

router.get("/", verifyToken(["Superadmin", "Admin", "housekeeping"]), getHousekeepingDashboard);

export default router;
