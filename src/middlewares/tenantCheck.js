import { pool } from "../config/db.js";

/**
 * Middleware to check if the tenant exists and is active.
 * Assuming the tenant ID is passed either as `adminId` in the request body, or `req.user.adminId`, `req.user.id` depending on the auth layer.
 */
export const checkTenantStatus = async (req, res, next) => {
  try {
    let tenantId = req.body.adminId || req.query.adminId || req.user?.adminId;
    
    // If it's a gym owner themselves making the request, tenantId is their own ID
    if (!tenantId && req.user?.roleId === 2) {
      tenantId = req.user.id;
    }

    if (!tenantId) {
      // For global routes or when we don't have tenant context yet, we skip or handle accordingly
      return next(); 
    }

    const [rows] = await pool.query(
      "SELECT status, trialStatus, licenseExpiryDate FROM user WHERE id = ?",
      [tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Gym Owner account not found." });
    }

    const tenant = rows[0];

    if (tenant.status !== "Active") {
      return res.status(403).json({ success: false, message: "Gym Owner account is inactive." });
    }

    // Optional: check subscription validity if required for the operations
    const now = new Date();
    const expiry = new Date(tenant.licenseExpiryDate);
    if (tenant.licenseExpiryDate && expiry < now) {
      return res.status(402).json({ success: false, message: "Gym Owner subscription has expired." });
    }

    next();
  } catch (error) {
    console.error("Tenant Check Error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify Gym Owner status." });
  }
};
