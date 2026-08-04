import { Router } from "express";
import { getPersonalTrainerDashboard, 
            getPersonalTrainingPlansByAdmin,
            getPersonalTrainingCustomersByAdmin
 } from "./personalTrainerDashboard.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// Personal Trainer Dashboard
router.get("/trainer/:adminId", verifyToken(["Superadmin", "Admin", "personaltrainer"]), getPersonalTrainerDashboard);

router.get(
  "/admin/:adminId/plans",
  verifyToken(["Admin", "Superadmin", "personaltrainer", "generaltrainer"]),
  getPersonalTrainingPlansByAdmin
);

// Customers list for particular plan
router.get(
  "/admin/:adminId/plan/:planId/customers",
  verifyToken(["Admin", "Superadmin", "personaltrainer", "generaltrainer"]),
  getPersonalTrainingCustomersByAdmin
);

export default router;
