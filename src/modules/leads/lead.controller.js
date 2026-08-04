import {
  addLeadService,
  getAllLeadsService,
  updateLeadService,
  deleteLeadService,
  getSuperAdminLeadsService,
  getSuperAdminLeadStatsService,
  addSaasLeadService,
  getLeadsByStaffService,
  bulkAllocateLeadsService,
  getLeadDistributionService,
} from "./lead.service.js";

// Create a new lead
export const addLead = async (req, res, next) => {
  try {
    const data = await addLeadService(req.body);
    res.status(201).json({
      success: true,
      message: "Lead added successfully",
      lead: data,
    });
  } catch (err) {
    next(err);
  }
};

// Get all leads for an admin
export const getAllLeads = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    if (!adminId) {
      return res.status(400).json({ success: false, message: "adminId is required" });
    }
    const leads = await getAllLeadsService(adminId);
    res.json({ success: true, leads });
  } catch (err) {
    next(err);
  }
};

// Get all SAAS leads globally for Super Admin
export const getSuperAdminLeads = async (req, res, next) => {
  try {
    const leads = await getSuperAdminLeadsService();
    res.json({ success: true, leads });
  } catch (err) {
    next(err);
  }
};

// Get SAAS lead stats for Super Admin CRM dashboard
export const getSuperAdminLeadStats = async (req, res, next) => {
  try {
    const stats = await getSuperAdminLeadStatsService();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

// PUBLIC (no auth) — Submit a SaaS lead from landing page
export const addSaasLead = async (req, res, next) => {
  try {
    const data = await addSaasLeadService(req.body);
    res.status(201).json({ success: true, message: 'Thanks! We will contact you soon.', lead: data });
  } catch (err) {
    next(err);
  }
};

// Update a lead
export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedLead = await updateLeadService(id, req.body);
    res.json({
      success: true,
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (err) {
    next(err);
  }
};

// Delete a lead
export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteLeadService(id);
    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /leads/staff/:staffId
 * Sales Agent: Fetch ONLY leads assigned to this staff (Clash-Free CRM)
 */
export const getLeadsByStaff = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    if (!staffId) {
      return res.status(400).json({ success: false, message: "staffId is required" });
    }
    const leads = await getLeadsByStaffService(staffId);
    res.json({ success: true, leads });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /leads/bulk-allocate
 * Admin: Bulk distribute N unassigned leads to one sales agent
 */
export const bulkAllocateLeads = async (req, res, next) => {
  try {
    const { adminId, staffId, count } = req.body;
    if (!adminId || !staffId || !count) {
      return res.status(400).json({
        success: false,
        message: "adminId, staffId, and count are required",
      });
    }
    const result = await bulkAllocateLeadsService({ adminId, staffId, count });
    res.json({
      success: true,
      message: `${result.allocatedCount} leads successfully allocated`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /leads/distribution/:adminId
 * Admin: Get lead distribution summary across all sales agents
 */
export const getLeadDistribution = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    if (!adminId) {
      return res.status(400).json({ success: false, message: "adminId is required" });
    }
    const data = await getLeadDistributionService(adminId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
