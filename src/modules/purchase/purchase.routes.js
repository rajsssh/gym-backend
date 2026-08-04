import express from "express";
import {updatePurchaseStatus, createPurchase, getAllPurchases, createRazorpayOrder, verifyRazorpayPayment } from "./purchase.controller.js";
import { generateSaasInvoicePdf } from "./saasInvoice.controller.js";

const router = express.Router();

router.post("/create-razorpay-order", createRazorpayOrder);
router.post("/verify-razorpay-payment", verifyRazorpayPayment);
router.post("/", createPurchase);
router.get("/", getAllPurchases);
router.put("/purchase/status/:id", updatePurchaseStatus);
router.get("/invoice/pdf/:id", generateSaasInvoicePdf);

export default router;

