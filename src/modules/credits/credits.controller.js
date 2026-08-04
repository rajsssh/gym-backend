import { pool } from '../../config/db.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret'
});

// ---------------------------------------------------------
// SUPER ADMIN APIs
// ---------------------------------------------------------

export const createPackage = async (req, res) => {
  try {
    const { packageName, credits, price, packageType } = req.body;
    if (!packageName || !credits || !price) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO credit_packages (packageName, credits, price, isActive, packageType) VALUES (?, ?, ?, ?, ?)`,
      [packageName, credits, price, true, packageType || 'WHATSAPP']
    );

    res.status(201).json({ success: true, message: 'Package created successfully', packageId: result.insertId });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { packageName, credits, price, isActive, packageType } = req.body;
    
    await pool.query(
      `UPDATE credit_packages SET packageName=?, credits=?, price=?, isActive=?, packageType=? WHERE id=?`,
      [packageName, credits, price, isActive, packageType || 'WHATSAPP', id]
    );

    res.status(200).json({ success: true, message: 'Package updated successfully' });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM credit_packages WHERE id=?`, [id]);
    res.status(200).json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------
// COMMON & GYM OWNER APIs
// ---------------------------------------------------------

export const getPackages = async (req, res) => {
  try {
    const { roleId } = req.user;
    const { type } = req.query; // 'WHATSAPP' or 'EMAIL'
    
    let query = `SELECT * FROM credit_packages`;
    const params = [];
    const conditions = [];

    if (roleId !== 1 && roleId !== 9) {
      conditions.push(`isActive = 1`);
    }

    if (type) {
      conditions.push(`packageType = ?`);
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY credits ASC`;

    const [packages] = await pool.query(query, params);
    res.status(200).json({ success: true, packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCreditBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [userRows] = await pool.query(`SELECT whatsappCredits, emailCredits, whatsappPlan FROM user WHERE id = ?`, [userId]);
    const currentCredits = userRows[0]?.whatsappCredits || 0;
    const currentEmailCredits = userRows[0]?.emailCredits || 0;
    const currentPlan = userRows[0]?.whatsappPlan || 'Basic';

    const [stats] = await pool.query(
      `SELECT SUM(creditsAdded) as totalPurchased, SUM(creditsUsed) as totalUsed 
       FROM whatsapp_credit_transactions WHERE userId = ? AND packageType = 'WHATSAPP'`,
      [userId]
    );

    const [emailStats] = await pool.query(
      `SELECT SUM(creditsAdded) as totalPurchased, SUM(creditsUsed) as totalUsed 
       FROM whatsapp_credit_transactions WHERE userId = ? AND packageType = 'EMAIL'`,
      [userId]
    );

    const totalPurchased = stats[0].totalPurchased || 0;
    const totalUsed = stats[0].totalUsed || 0;

    const totalEmailPurchased = emailStats[0].totalPurchased || 0;
    const totalEmailUsed = emailStats[0].totalUsed || 0;

    res.status(200).json({
      success: true,
      balance: {
        remaining: currentCredits,
        totalPurchased,
        totalUsed,
        plan: currentPlan,
        emailRemaining: currentEmailCredits,
        emailTotalPurchased: totalEmailPurchased,
        emailTotalUsed: totalEmailUsed
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const [transactions] = await pool.query(
      `SELECT * FROM whatsapp_credit_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
      [userId]
    );

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const purchaseCredits = async (req, res) => {
  try {
    const { packageId } = req.body;
    
    const [packages] = await pool.query(
      `SELECT * FROM credit_packages WHERE id = ? AND isActive = 1`,
      [packageId]
    );
    if (packages.length === 0) {
      return res.status(404).json({ success: false, message: 'Package not found or inactive.' });
    }

    const pkg = packages[0];
    const amountInPaise = Math.round(pkg.price * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: 'receipt_order_' + Date.now(),
      notes: { packageId: pkg.id, credits: pkg.credits, userId: req.user.id }
    };

    // --- MOCK FLOW FOR TESTING ---
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('dummy')) {
      return res.status(200).json({ 
        success: true, 
        order: { id: 'order_dummy_' + Date.now(), amount: amountInPaise, currency: 'INR' }, 
        key_id: 'rzp_test_dummy_key',
        package: pkg,
        isMock: true
      });
    }
    // -----------------------------

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({ 
      success: true, 
      order, 
      key_id: process.env.RAZORPAY_KEY_ID,
      package: pkg 
    });
  } catch (error) {
    console.error('Error creating razorpay order:', error);
    res.status(500).json({ success: false, message: 'Error initializing payment' });
  }
};

export const verifyPurchase = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId, isMock } = req.body;
    const userId = req.user.id;

    if (!isMock) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret';
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
      }
    }

    const [packages] = await pool.query(`SELECT * FROM credit_packages WHERE id = ?`, [packageId]);
    if (packages.length === 0) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    
    const pkg = packages[0];
    const isEmailPkg = pkg.packageType === 'EMAIL';

    // Add credits to user based on package type
    if (isEmailPkg) {
      await pool.query(
        `UPDATE user SET emailCredits = emailCredits + ? WHERE id = ?`,
        [pkg.credits, userId]
      );
    } else {
      await pool.query(
        `UPDATE user SET whatsappCredits = whatsappCredits + ? WHERE id = ?`,
        [pkg.credits, userId]
      );
    }

    // Log transaction
    const description = `Purchased ${pkg.packageName} (${pkg.packageType}) via Razorpay (${razorpay_payment_id})`;
    await pool.query(
      `INSERT INTO whatsapp_credit_transactions (userId, amountPaid, transactionType, description, creditsAdded, creditsUsed, packageType)
       VALUES (?, ?, 'PURCHASE', ?, ?, 0, ?)`,
      [userId, pkg.price, description, pkg.credits, pkg.packageType]
    );

    res.status(200).json({ success: true, message: 'Credits added successfully!', creditsAdded: pkg.credits });
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};
// EOF
