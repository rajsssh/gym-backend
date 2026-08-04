import { Router } from "express";
// import { verifyToken } from "../../middlewares/auth.js";

import {
  createClassType,
  listClassTypes,
  createSchedule,
  listSchedules,
  bookClass,
  cancelBooking,
  memberBookings,
  getAllScheduledClasses,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getTrainers ,
  getPersonalAndGeneralTrainers   ,
  getScheduledClassesWithBookingStatus             
} from "./class.controller.js";

const router = Router();

router.get("/trainers", getTrainers);

router.put("/scheduled/update/:id", updateSchedule);
router.delete("/scheduled/delete/:id", deleteSchedule);

router.get("/scheduled/all/:adminId", getAllScheduledClasses);
router.get("/scheduled/aan /:id", getScheduleById);
router.get('/trainers/personal-general', getPersonalAndGeneralTrainers);

// CLASS TYPES
router.post(
  "/classtype/create",
 
  createClassType
);

router.get(
  "/classtype",
 
  listClassTypes
);

// CLASS SCHEDULE
router.post(
  "/schedule/create",

  createSchedule
);

router.get(
  "/schedule/branch/:branchId",
 
  listSchedules
);
router.get(
  "/classes/member/:memberId",
  getScheduledClassesWithBookingStatus
);

// BOOKING
router.post(
  "/book",

  bookClass
);

router.post(
  "/cancel",

  cancelBooking
);

router.get(
  "/member/:memberId",
  
  memberBookings
);



export default router;
