import { Router } from "express";
import {
  createMember,
  deleteMember,
  getMembersByAdminAndGeneralMemberPlanController,
  getMembersByAdminAndGroupPlanController,
  getMembersByAdminAndPlanController,
  getMembersByAdminId,
  getRenewalPreview,
  listMembers,
  listPTBookings,
  memberDetail,
  renewMembershipPlan,
  updateMember,
  updateMemberRenewalStatus,
  importMembers,
  downloadMemberTemplate,
  getMembersByTrainerIdController,
  assignTrainerToMemberController,
  searchMembersController
} from "./member.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

router.get("/trainer/:trainerId", verifyToken(["Superadmin", "Admin", "Staff", "PERSONALTRAINER", "GENERALTRAINER", "personal trainer", "general trainer", "personaltrainer", "generaltrainer"]), getMembersByTrainerIdController);
router.post("/assign-trainer", verifyToken(["Superadmin", "Admin", "Staff", "PERSONALTRAINER", "GENERALTRAINER", "personal trainer", "general trainer", "personaltrainer", "generaltrainer", "receptionist", "manager", "sales_agent"]), assignTrainerToMemberController);
router.get("/search", verifyToken(["Superadmin", "Admin", "Staff", "PERSONALTRAINER", "GENERALTRAINER", "personal trainer", "general trainer", "personaltrainer", "generaltrainer"]), searchMembersController);

router.post(
  "/create",
  verifyToken(["Superadmin", "Admin", "receptionist", "personal trainer", "personaltrainer", "PERSONALTRAINER", "general trainer", "generaltrainer", "GENERALTRAINER", "sales_agent", "manager", "Staff"]),
  createMember
);

router.put("/renew/:memberId", verifyToken(["Superadmin", "Admin", "receptionist", "personal trainer", "personaltrainer", "PERSONALTRAINER", "general trainer", "generaltrainer", "GENERALTRAINER", "sales_agent", "manager", "Staff"]), renewMembershipPlan);

/** List Members by Branch */
router.get(
  "/branch/:branchId",
  verifyToken(["Superadmin", "Admin", "Staff", "personaltrainer", "PERSONALTRAINER", "generaltrainer", "GENERALTRAINER", "receptionist"]),
  listMembers
);

router.get("/renew/:adminId", verifyToken(), getRenewalPreview);

/** Get Member Detail */
router.get(
  "/detail/:id",
  verifyToken(["Superadmin", "Admin", "Staff", "Member", "personaltrainer", "PERSONALTRAINER", "generaltrainer", "GENERALTRAINER"]),
  memberDetail
);

router.put("/admin/renewal/:memberId/status", verifyToken(["Superadmin", "Admin", "receptionist", "personal trainer", "personaltrainer", "PERSONALTRAINER", "general trainer", "generaltrainer", "GENERALTRAINER", "sales_agent", "manager", "Staff"]), updateMemberRenewalStatus);

/** Update Member */
router.put(
  "/update/:id",
  verifyToken(["Superadmin", "Admin", "receptionist", "personal trainer", "personaltrainer", "PERSONALTRAINER", "general trainer", "generaltrainer", "GENERALTRAINER", "sales_agent", "manager", "Staff"]),
  updateMember
);

/** Soft Delete / Deactivate Member */
router.delete(
  "/delete/:id",
  verifyToken([
    "Superadmin", "SuperAdmin", "SUPERADMIN",
    "Admin", "admin", "ADMIN",
    "receptionist", "Receptionist", "RECEPTIONIST",
    "manager", "Manager", "MANAGER",
    "sales_agent", "Sales Agent", "salesagent", "SALES_AGENT",
    "Staff", "staff", "STAFF"
  ]),
  deleteMember
);

router.get("/admin/:adminId", verifyToken(["Superadmin", "Admin", "Staff", "generaltrainer", "GENERALTRAINER", "personaltrainer", "PERSONALTRAINER", "receptionist", "sales_agent", "manager"]), getMembersByAdminId);
router.get("/admin/:adminId/plan", verifyToken(["Superadmin", "Admin", "Staff", "generaltrainer", "GENERALTRAINER", "personaltrainer", "PERSONALTRAINER", "receptionist", "manager"]), getMembersByAdminAndPlanController);
router.get(
  "/group-plan/:adminId/admin/:planId",
  verifyToken(["Superadmin", "Admin", "Staff", "personaltrainer", "PERSONALTRAINER", "generaltrainer", "GENERALTRAINER"]),
  getMembersByAdminAndGroupPlanController
);
router.get(
  "/member-plan/general/:adminId/admin/:planId",
  verifyToken(["Superadmin", "Admin", "Staff", "personaltrainer", "PERSONALTRAINER", "generaltrainer", "GENERALTRAINER"]),
  getMembersByAdminAndGeneralMemberPlanController
);

router.get("/pt-bookings/:branchId", verifyToken(["Superadmin", "Admin", "Staff", "personaltrainer", "PERSONALTRAINER"]), listPTBookings);

/** Excel Member Import */
router.post("/import", verifyToken(["Superadmin", "Admin"]), importMembers);
router.get("/export/template", downloadMemberTemplate);

export default router;
