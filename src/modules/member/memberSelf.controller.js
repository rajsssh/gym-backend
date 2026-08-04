// Import required service functions
import {
  getMemberProfileService,
  updateMemberPersonalService,
  changeMemberPasswordService
} from "./memberSelf.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

/****************************************************
 * GET MEMBER PROFILE (using userId)
 * Step-by-step: Controller → Service → DB → Response
 ****************************************************/
export const getMemberProfile = async (req, res, next) => {
  try {
    // URL se userId nikalna (/:userId)
    const userId = req.params.userId;

    // Service function call — ye DB se profile deta hai
    const profile = await getMemberProfileService(userId);

    // Final response
    res.json({
      success: true,
      profile
    });
  } catch (err) {
    next(err); // Error ko express middleware ko pass karo
  }
};

/****************************************************
 * UPDATE PERSONAL DETAILS (using userId)
 ****************************************************/

export const updateMemberPersonal = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    let payload = { ...req.body };

    // ✅ profile image upload
    if (req.files?.profileImage) {
      const imageUrl = await uploadToCloudinary(
        req.files.profileImage,
        "users/profile"
      );

      payload.profileImage = imageUrl;
    }

    const updatedUser = await updateMemberPersonalService(userId, payload);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

/****************************************************
 * CHANGE PASSWORD (using userId)
 ****************************************************/
export const changeMemberPassword = async (req, res, next) => {
  try {
    // userId URL se
    const userId = req.params.userId;

    // Body se current password + new password
    const { current, new: newPassword } = req.body;

    console.log("=== changeMemberPassword Debug ===");
    console.log("userId:", userId);
    console.log("currentPassword:", current);
    console.log("newPassword:", newPassword);

    // Password change service
    const result = await changeMemberPasswordService(
      userId,
      current,
      newPassword
    );

    res.json({
      success: true,
      ...result // message: "Password updated successfully"
    });
  } catch (err) {
    next(err);
  }
};
