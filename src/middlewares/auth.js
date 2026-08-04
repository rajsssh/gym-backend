import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { pool } from "../config/db.js";

export const verifyToken = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || req.headers['Authorization'];
      if (!authHeader) throw { status: 401, message: "Token required" };

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, ENV.jwtSecret);
      req.user = decoded;

      if (roles.length) {
        // Fallback mapping if role name string is missing in JWT payload
        let userRoleName = decoded.role;
        if (!userRoleName && decoded.roleId) {
          if (decoded.roleId === 1) userRoleName = "SUPERADMIN";
          else if (decoded.roleId === 2) userRoleName = "ADMIN";
          else if (decoded.roleId === 4) userRoleName = "MEMBER";
          else userRoleName = "STAFF"; // covers other staff roles
        }

        // Normalize to uppercase and strip spaces/underscores for case/format-insensitive comparison
        const clean = (str) => (str || "").toUpperCase().replace(/[\s_-]/g, "");

        const normalizedUserRole = clean(userRoleName);
        const normalizedRoles = roles.map(r => clean(r));

        const staffRoles = ["GENERALTRAINER", "PERSONALTRAINER", "RECEPTIONIST", "HOUSEKEEPING", "SALESAGENT", "MANAGER", "STAFF"];

        let isAllowed = normalizedRoles.includes(normalizedUserRole);
        if (!isAllowed && normalizedRoles.includes("STAFF") && staffRoles.includes(normalizedUserRole)) {
          isAllowed = true;
        }
        if (!isAllowed && (normalizedRoles.includes("MEMBER") || normalizedRoles.includes("CUSTOMER"))) {
          if (normalizedUserRole.includes("MEMBER") || normalizedUserRole.includes("CUSTOMER") || decoded.memberId || decoded.roleId === 4) {
            isAllowed = true;
          }
        }

        if (!isAllowed) {
          throw { status: 403, message: "Access denied" };
        }
      }

      // Token Blacklist check (Forced Session Invalidation after password reset)
      const [blacklisted] = await pool.query("SELECT id FROM token_blacklist WHERE token = ? LIMIT 1", [token]);
      if (blacklisted.length > 0) {
        throw { status: 401, message: "Session expired. Please log in again." };
      }

      next();
    } catch (err) {
      if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        err.status = 401;
      }
      next(err);
    }
  };
};

// import jwt from "jsonwebtoken";
// import { ENV } from "../config/env.js";

// export const verifyToken = (roles = []) => {
//   return (req, res, next) => {
//     try {
//       const authHeader = req.headers.authorization;
//       if (!authHeader) throw { status: 401, message: "Token required" };

//       const token = authHeader.split(" ")[1];
//       const decoded = jwt.verify(token, ENV.jwtSecret);

//       req.user = decoded; // store token payload

//       // 🟢 If token belongs to a MEMBER → allow without role checking
//       if (decoded.memberId) {
//         return next();
//       }

//       // 🔵 For USER roles (Admin / Staff / Superadmin)
//       if (roles.length && !roles.includes(decoded.role)) {
//         throw { status: 403, message: "Access denied" };
//       }

//       next();
//     } catch (err) {
//       next(err);
//     }
//   };
// };
