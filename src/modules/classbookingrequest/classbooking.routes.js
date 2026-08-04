import { Router } from "express";
import { 
  createBookingRequest,
  getAllBookingRequests,
  approveBooking,
  rejectBooking,
  getBookingRequestsByBranch,
  getBookingRequestsByAdmin,
  createGroupBooking,
  createPTBooking,
  getGroupBookingsByBranch,
getPTBookingsByBranch,
getPTBookingById,
// getPTBookingsByMember,
getPTBookingsByTrainer,
updatePTBooking,
deletePTBooking,
getGroupBookingById,
getGroupBookingsByMember,
updateGroupBooking,
deleteGroupBooking,
// 
createUnifiedBooking,
  getUnifiedBookingsByBranch,
  getUnifiedBookingsByMember,
  getUnifiedBookingsByTrainer,
//   getPTBookingById,
  updateUnifiedBooking,
  deleteUnifiedBooking,
  getUnifiedBookingById,
  getPTBookingsByAdminId,
  getBookingRequestsByMember,
  getUnifiedPersonalAndGeneralTrainersService,
  getBookingRequestsForAdmin,
  approveBookingRequest
} from "./classbooking.controller.js";
// import { verifyToken } from "./classbookingrequest.js";   // adminId lene ke liye

const router = Router();

/* ----------------------------------------------------
   MEMBER → CREATE BOOKING REQUEST
---------------------------------------------------- */
router.post("/create", createBookingRequest);
router.get(
  "/admin/booking-requests/:adminId",
  getBookingRequestsForAdmin
);
router.post(
  "/approve/:bookingRequestId",
  approveBookingRequest
);

/* ----------------------------------------------------
   ADMIN → GET ALL BOOKING REQUESTS
---------------------------------------------------- */
router.get("/requests", getAllBookingRequests);
router.get("/branch/:branchId", getBookingRequestsByBranch);
router.get("/admin/:adminId", getBookingRequestsByAdmin);
router.get("/member/:memberId", getBookingRequestsByMember);

/* ----------------------------------------------------
   ADMIN → APPROVE BOOKING REQUEST
---------------------------------------------------- */
router.put("/approve/:requestId", approveBooking);

/* ----------------------------------------------------
   ADMIN → REJECT BOOKING REQUEST
---------------------------------------------------- */
router.put("/reject/:requestId", rejectBooking); 


// // group class booking
// router.post("/group", createGroupBooking);
// router.post("/pt", createPTBooking);
// router.get("/group/:branchId", getGroupBookingsByBranch);
// router.get("/pt/:branchId", getPTBookingsByBranch);

// // |||

// router.get("/pt/:bookingId", getPTBookingById);

// router.get("/pt/member/:memberId", getPTBookingsByMember);

// router.get("/pt/trainer/:trainerId", getPTBookingsByTrainer);

// router.put("/pt/update/:bookingId", updatePTBooking);

// router.delete("/pt/delete/:bookingId", deletePTBooking);



// router.get("/group/:bookingId", getGroupBookingById);

// router.get("/group/member/:memberId", getGroupBookingsByMember);

// router.put("/group/update/:bookingId", updateGroupBooking);

// router.delete("/group/delete/:bookingId", deleteGroupBooking);



// unified
router.post("/unified/create", createUnifiedBooking);

/* -----------------------------------------------------
    ⭐ GET BOOKINGS BY BRANCH (PT + GROUP)
----------------------------------------------------- */
router.get("/unifiedbybranch/:adminId", getUnifiedBookingsByBranch);

/* -----------------------------------------------------
    ⭐ GET BOOKINGS BY MEMBER (PT + GROUP)
----------------------------------------------------- */
router.get("/unifiedbymember/:memberId", getUnifiedBookingsByMember);

/* -----------------------------------------------------
    ⭐ GET BOOKINGS BY TRAINER (PT ONLY)
----------------------------------------------------- */
router.get("/unifiedbytrainer/:trainerId", getUnifiedBookingsByTrainer);

router.get("/unifiedbyPersonalGeneral/:adminId",getUnifiedPersonalAndGeneralTrainersService)

/* -----------------------------------------------------
    ⭐ GET SINGLE BOOKING BY ID
----------------------------------------------------- */
router.get("/unifiedbybookin/:bookingId", getPTBookingById);

router.get("/unifiedbybooking/:id", getUnifiedBookingById);


/* -----------------------------------------------------
    ⭐ UPDATE BOOKING (PT + GROUP)
----------------------------------------------------- */
router.put("/unifiedupdate/:id", updateUnifiedBooking);

/* -----------------------------------------------------
    ⭐ DELETE BOOKING (PT + GROUP)
----------------------------------------------------- */
router.delete("/deleteunified/:bookingId", deleteUnifiedBooking);

router.get("/getptDetailsByAdminId/:adminId", getPTBookingsByAdminId);

/* -----------------------------------------------------
    ⭐ GET BOOKING DETAILS FOR ADMIN/TRAINER
----------------------------------------------------- */
import { getBookingDetails } from "./classbooking.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

router.get("/admin-details/:adminId", verifyToken(["Superadmin", "Admin", "Staff", "PersonalTrainer", "GeneralTrainer"]), getBookingDetails);
router.get("/admin-details/:adminId/:trainerId", verifyToken(["Superadmin", "Admin", "Staff", "PersonalTrainer", "GeneralTrainer"]), getBookingDetails);

export default router;
