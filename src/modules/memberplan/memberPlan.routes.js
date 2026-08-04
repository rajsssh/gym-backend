import { Router } from "express";
import {
  createMemberPlan,
  getMemberPlans,
  getMemberPlan,
  updatePlan,
  deletePlan,
  getMemberPlansnewss
} from "../memberplan/memberPlan.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

router.get("/all", verifyToken(), getMemberPlansnewss);
router.get("/", verifyToken(), getMemberPlans);
router.get("/:id", verifyToken(), getMemberPlan);

router.post("/", verifyToken(["Admin", "Superadmin"]), createMemberPlan);
router.put("/:adminId/:planId", verifyToken(["Admin", "Superadmin"]), updatePlan);
router.delete("/:id", verifyToken(["Admin", "Superadmin"]), deletePlan);

export default router;
