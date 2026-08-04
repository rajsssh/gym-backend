


import { uploadToCloudinary } from "../../config/cloudinary.js";
import {
  createStaffService,
  listStaffService,
  staffDetailService,
  updateStaffService,
  deleteStaffService,
  getAllStaffService,
  getTrainerByIdService 
} from "./staff.service.js";
import bcrypt from "bcryptjs";

export const createStaff = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      roleId,
      gender,
      dateOfBirth,
      joinDate,
      exitDate,
      profilePhoto,
      status,
      adminId: adminIdFromBody, // optional fallback
    } = req.body;

    // adminId priority: token → body
    const adminId = req.user?.id || adminIdFromBody;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    if (
      !fullName ||
      !email ||
      !password ||
      !roleId ||
      !gender ||
      !dateOfBirth ||
      !joinDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    let imageUrl = null;
    if (req.files?.profilePhoto) {
      imageUrl = await uploadToCloudinary(req.files.profilePhoto, 'staff/profile');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await createStaffService({
      fullName,
      email,
      phone,
      password: hashedPassword,
      roleId,
      adminId, // ✅ always saved
      gender,
      dateOfBirth,
      joinDate,
      exitDate: exitDate || null,
      profilePhoto: imageUrl || null,
      status,
    });

    res.json({
      success: true,
      message: "Staff created successfully",
      staff,
    });
  } catch (err) {
    next(err);
  }
};


export const getTrainerById = async (req, res, next) => {
  try {
    const trainerId = parseInt(req.params.id);

    const trainer = await getTrainerByIdService(trainerId);

    res.json({
      success: true,
      trainer,
    });
  } catch (err) {
    next(err);
  }
};

export const listStaff = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const staff = await listStaffService(adminId);

    res.json({
      success: true,
      staff,
    });
  } catch (err) {
    next(err);
  }
};



export const staffDetail = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.id);

    const staff = await staffDetailService(staffId);

    // ✅ AUTH NAHI HAI → koi admin check mat lagao
    // req.user undefined ho sakta hai, isliye direct access avoid

    res.json({
      success: true,
      staff,
    });
  } catch (err) {
    next(err);
  }
};




export const updateStaff = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.id);
    const data = req.body;

    // hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (req.files?.profilePhoto) {
      const imageUrl = await uploadToCloudinary(req.files.profilePhoto, 'staff/profile');
      data.profilePhoto = imageUrl;  // Assign the new image URL
    }

    // ✅ AUTH NAHI HAI → adminId force mat karo
    // Sirf tab set karo jab req.user available ho
    if (req.user && req.user.id) {
      data.adminId = req.user.id;
    }

    const staff = await updateStaffService(staffId, data);

    res.json({
      success: true,
      message: "Staff updated successfully",
      staff,
    });
  } catch (err) {
    next(err);
  }
};



export const getAllStaff = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const staff = await getAllStaffService(adminId);

    res.json({
      success: true,
      staff,
    });
  } catch (err) {
    next(err);
  }
};



export const deleteStaff = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff id",
      });
    }

    await deleteStaffService(id);

    res.json({
      success: true,
      message: "Staff & trainer deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};


export const getAdminStaff = async (req, res, next) => {
  try {
    const adminId = req.user.id;  // Logged admin ka ID

    const staff = await getAdminStaffService(adminId);

    res.json({
      success: true,
      staff,
    });
  } catch (err) {
    next(err);
  }
};
