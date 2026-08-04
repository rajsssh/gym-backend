// import express from "express";
// import { createSalary,getAllSalaries,getSalaryById,deleteSalary,
// updateSalary,getSalaryByStaffId } from "./salary.controller.js";

// const router = express.Router();

// // CREATE SALARY
// router.post("/create", createSalary);

// // (Optional future routes)
//  router.get("/", getAllSalaries);
//  router.get("/:id", getSalaryById);
//  router.get("/staff/:staffId", getSalaryByStaffId);
//  router.delete("/:salaryId", deleteSalary);
//  router.put("/:id", updateSalary);

// export default router;
 

import express from "express";
import {
  createSalary,
  getAllSalaries,
  getSalaryById,
  deleteSalary,
  updateSalary,
  getSalaryByStaffId
} from "./salary.controller.js";

const router = express.Router();

// CREATE SALARY
router.post("/create", createSalary);

// GET ALL
router.get("/:adminId", getAllSalaries);

// GET BY STAFF (specific -> keep before :salaryId)
router.get("/staff/:staffId", getSalaryByStaffId);

// GET / UPDATE / DELETE by salaryId (use same param name everywhere)
router.get("/:salaryId", getSalaryById);
router.put("/:salaryId", updateSalary);
router.delete("/:salaryId", deleteSalary);

export default router;
