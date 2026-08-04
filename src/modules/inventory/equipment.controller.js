import {
  createEquipmentService,
  listEquipmentService,
  listEquipmentByAdminService,
  updateEquipmentService,
  deleteEquipmentService,
  getEquipmentStatsService,
  getEquipmentStatsByAdminService,
  createItemRequestService,
  listItemRequestsService,
  updateItemRequestStatusService,
  getMemberItemRequestsService
} from "./equipment.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

// --- EQUIPMENT ---
export const createEquipment = async (req, res, next) => {
  try {
    let imageUrl = null;
    if (req.files?.image) {
      imageUrl = await uploadToCloudinary(req.files.image, "gym_equipment");
    }
    const adminId = req.user?.adminId || req.user?.id;
    const equipment = await createEquipmentService({ ...req.body, imageUrl, adminId });
    res.json({ success: true, equipment });
  } catch (err) { next(err); }
};

export const listEquipment = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { search, category } = req.query;
    const equipment = await listEquipmentService(branchId, search, category);
    res.json({ success: true, equipment });
  } catch (err) { next(err); }
};

export const getEquipmentStats = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const stats = await getEquipmentStatsService(branchId);
    res.json({ success: true, stats });
  } catch (err) { next(err); }
};

// Admin-level: list equipment across all branches
export const listEquipmentByAdmin = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const { search, category } = req.query;
    const equipment = await listEquipmentByAdminService(adminId, search, category);
    res.json({ success: true, equipment });
  } catch (err) { next(err); }
};

// Admin-level: stats across all branches
export const getEquipmentStatsByAdmin = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const stats = await getEquipmentStatsByAdminService(adminId);
    res.json({ success: true, stats });
  } catch (err) { next(err); }
};

export const updateEquipment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const equipment = await updateEquipmentService(id, req.body);
    res.json({ success: true, equipment });
  } catch (err) { next(err); }
};

export const deleteEquipment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await deleteEquipmentService(id);
    res.json({ success: true, message: "Equipment deleted" });
  } catch (err) { next(err); }
};

// --- ITEM REQUESTS ---
export const createItemRequest = async (req, res, next) => {
  try {
    let imageUrl = null;
    if (req.files?.image) {
      imageUrl = await uploadToCloudinary(req.files.image, "equipment_requests");
    }
    const requestedBy = req.body.requestedBy || req.user?.id;
    const role = req.body.role || req.user?.role;
    const request = await createItemRequestService({ 
      ...req.body, 
      requestedBy, 
      role, 
      imageUrl 
    });
    res.json({ success: true, request });
  } catch (err) { next(err); }
};

export const listItemRequests = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const { status } = req.query;
    const requests = await listItemRequestsService(adminId, status);
    res.json({ success: true, requests });
  } catch (err) { next(err); }
};

export const updateItemRequestStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminRemarks } = req.body;
    const updated = await updateItemRequestStatusService(id, status, adminRemarks);
    res.json({ success: true, request: updated });
  } catch (err) { next(err); }
};

export const getMemberItemRequests = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.memberId);
    // Determine if the user is a staff member or a regular member
    const isMember = (req.user?.role && req.user.role.toUpperCase() === "MEMBER") || req.user?.roleId === 4;
    const isStaff = !isMember;
    const requests = await getMemberItemRequestsService(userId, isStaff);
    res.json({ success: true, requests });
  } catch (err) { next(err); }
};
