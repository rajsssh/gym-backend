import { Router } from "express";

// Controller functions import
import {
  getMemberProfile,
  updateMemberPersonal,
  changeMemberPassword
} from "./memberSelf.controller.js";

// Router object create
const router = Router();

/****************************************************
 * GET MEMBER PROFILE
 * URL example: /member/profile/24
 * userId → req.params.userId
 ****************************************************/
router.get("/profile/:userId", getMemberProfile);

/****************************************************
 * UPDATE PERSONAL INFORMATION
 * URL example: /member/personal/24
 * req.body → updated fields
 ****************************************************/
router.put("/profile/:userId", updateMemberPersonal);

/****************************************************
 * CHANGE PASSWORD
 * URL example: /member/password/24
 * req.body → { current, new }
 ****************************************************/
router.put("/password/:userId", changeMemberPassword);

// Router ko export karna
export default router;
