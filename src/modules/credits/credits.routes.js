import express from 'express';
import { 
  createPackage, 
  updatePackage, 
  deletePackage, 
  getPackages, 
  getCreditBalance, 
  getTransactions, 
  purchaseCredits, 
  verifyPurchase 
} from './credits.controller.js';
import { verifyToken } from '../../middlewares/auth.js';

const router = express.Router();

// Middleware: roleId 1 = Superadmin, roleId 9 = Sub-admin
const requireSuperadmin = (req, res, next) => {
  if (req.user && (Number(req.user.roleId) === 1 || Number(req.user.roleId) === 9)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Superadmin only.' });
};

// Apply token verification to all routes
router.use(verifyToken());

// Superadmin Only Routes (Manage Packages)
router.post('/packages', requireSuperadmin, createPackage);
router.put('/packages/:id', requireSuperadmin, updatePackage);
router.delete('/packages/:id', requireSuperadmin, deletePackage);

// All Authenticated Users (Gym Owner / Admin)
router.get('/packages', getPackages);
router.get('/balance', getCreditBalance);
router.get('/transactions', getTransactions);
router.post('/purchase', purchaseCredits);
router.post('/verify', verifyPurchase);

export default router;
