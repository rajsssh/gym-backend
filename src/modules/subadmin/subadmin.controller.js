import {
  createSubAdminService,
  getAllSubAdminsService,
  updateSubAdminService,
  deleteSubAdminService
} from "./subadmin.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

export const createSubAdmin = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.files && req.files.profileImage) {
      payload.profileImage = await uploadToCloudinary(req.files.profileImage, "users/profile");
    }
    const subAdmin = await createSubAdminService(payload);
    return res.status(201).json({ success: true, message: "Sub-Admin created successfully", data: subAdmin });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const getAllSubAdmins = async (req, res) => {
  try {
    const list = await getAllSubAdminsService();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (req.files && req.files.profileImage) {
      payload.profileImage = await uploadToCloudinary(req.files.profileImage, "users/profile");
    }
    const updated = await updateSubAdminService(id, payload);
    return res.status(200).json({ success: true, message: "Sub-Admin updated successfully", data: updated });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteSubAdminService(id);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
