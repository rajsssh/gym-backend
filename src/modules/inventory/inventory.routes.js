import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  createProduct,
  listProducts,
  updateProduct,
  adjustStock,
  productHistory,
} from "./inventory.controller.js";

const router = Router();

/**
 * Create new product (supplement, merch, etc.)
 * Only Admin / Superadmin
 */
router.post(
  "/product/create",
  verifyToken(["Admin", "Superadmin"]),
  createProduct
);

/**
 * Branch-wise product list (+ optional search)
 */
router.get(
  "/product/branch/:branchId",
  verifyToken(["Admin", "Superadmin", "Staff"]),
  listProducts
);

/**
 * Update product info
 */
router.put(
  "/product/update/:id",
  verifyToken(["Admin", "Superadmin"]),
  updateProduct
);

/**
 * Adjust stock (purchase, sale, adjustment)
 * body: { productId, type, quantity, note }
 */
router.post("/stock/adjust", verifyToken(["Admin", "Superadmin"]), adjustStock);

/**
 * Product details + stock movement history
 */
router.get(
  "/product/history/:productId",
  verifyToken(["Admin", "Superadmin", "Staff"]),
  productHistory
);

export default router;
