import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  createDietPlan,
  getAllDietPlans,
  updateDietPlan,
  deleteDietPlan,
  assignDietPlan,
  getMemberDietPlan
} from "./diet.controller.js";

const router = Router();

// Only trainer, admin, superadmin can create/edit/delete
router.post("/create", verifyToken(), createDietPlan);
router.get("/all", verifyToken(), getAllDietPlans);
router.put("/update/:id", verifyToken(), updateDietPlan);
router.delete("/delete/:id", verifyToken(), deleteDietPlan);

// Assign diet plan to member
router.post("/assign", verifyToken(), assignDietPlan);

// Member diet history
router.get("/member/:memberId", verifyToken(), getMemberDietPlan);

export default router;
