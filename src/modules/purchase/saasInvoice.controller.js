import PDFDocument from "pdfkit";
import { pool } from "../../config/db.js";
import { numberToWords } from "../../utils/numberToWords.js";

export const generateSaasInvoicePdf = async (req, res, next) => {
  try {
    const purchaseId = parseInt(req.params.id);
    const [rows] = await pool.query("SELECT * FROM purchase WHERE id = ?", [purchaseId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase record not found" });
    }

    const purchase = rows[0];

    // A4 size: 210mm x 297mm with golden border
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // Draw golden border around the entire page
    doc
      .lineWidth(3)
      .strokeColor("#d4af37")
      .rect(50, 50, 495, 697) // A4 size minus margins
      .stroke();

    // HTTP headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=saas-invoice-${purchase.transactionId || purchase.id}.pdf`
    );

    doc.pipe(res);

    // Platform / Super Admin details (Fetch from user with roleId = 1)
    const [saRows] = await pool.query("SELECT gymName, gymAddress, gstNumber, phone, email FROM user WHERE roleId = 1 LIMIT 1");
    const sa = saRows[0] || {};
    const companyName = sa.gymName || "GymSoft Software Solutions";
    const companyAddress = sa.gymAddress || "GymSoft HQ, India";
    const companyGST = sa.gstNumber || "29ABCDE1234F1Z5";
    const companyPhone = sa.phone || "+91 9876543210";
    const companyEmail = sa.email || "support@speedfitness.com";

    // Gym Owner / Buyer details
    const cleanStr = (s) => (s && s !== "null" && s !== "undefined" ? String(s) : "");
    const buyerName = cleanStr(purchase.companyName) || cleanStr(purchase.adminName) || "Gym Owner";
    const buyerContact = cleanStr(purchase.adminName) || cleanStr(purchase.email);
    const buyerPhone = cleanStr(purchase.phone);
    const buyerEmail = cleanStr(purchase.email);
    const buyerCity = cleanStr(purchase.city) || "India";
    const buyerGST = cleanStr(purchase.gstNumber);

    const subtotal = parseFloat(purchase.amount || 0);
    // Assuming 18% inclusive or exclusive tax calculation
    const taxRate = 18;
    const taxAmount = Math.round((subtotal * taxRate) / (100 + taxRate));
    const taxableAmount = subtotal - taxAmount;

    // ---------- HEADER ----------
    const headerY = 60;
    const logoBoxSize = 60;
    const logoBoxX = 50;
    const detailsX = logoBoxX + logoBoxSize + 15;
    const detailsWidth = 350;
    const invoiceTitleX = 350;

    // Logo box placeholder
    doc
      .lineWidth(1)
      .strokeColor("#d4af37")
      .rect(logoBoxX, headerY, logoBoxSize, logoBoxSize)
      .stroke();

    // Company Name
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#1e3a8a")
      .text(companyName, detailsX, headerY, { width: detailsWidth });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#4b5563")
      .text(`GSTIN: ${companyGST}`, detailsX, headerY + 22)
      .text(`Mobile No: ${companyPhone} | Email: ${companyEmail}`, detailsX, headerY + 36)
      .text(`Address: ${companyAddress}`, detailsX, headerY + 50, { width: detailsWidth });

    // Invoice Title
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#1e3a8a")
      .text("TAX INVOICE", invoiceTitleX, headerY + 10, { align: "right", width: 195 });

    // Separator line
    doc.y = headerY + logoBoxSize + 15;
    doc
      .lineWidth(2)
      .strokeColor("#d4af37")
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.y += 20;

    // ---------- INVOICE INFO ----------
    const invoiceNo = purchase.transactionId || `SAAS-INV-${purchase.id}`;
    const invoiceDate = purchase.startDate
      ? new Date(purchase.startDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-IN");

    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#000000")
      .text(`Invoice No: ${invoiceNo}`, 50, doc.y)
      .text(`Invoice Date: ${invoiceDate}`, { align: "right" })
      .moveDown(1.5);

    // ---------- BILL TO ----------
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Bill To (Gym Owner)", 50, doc.y);

    doc.y += 12;
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(buyerName, 50, doc.y);
    if (buyerContact && buyerContact !== buyerName) {
      doc.text(`Contact: ${buyerContact}`, 50, doc.y + 14);
    }
    if (buyerPhone) {
      doc.text(`Phone: ${buyerPhone}`, 50, doc.y + 14);
    }
    if (buyerGST) {
      doc.text(`GSTIN: ${buyerGST}`, 50, doc.y + 14);
    }
    doc.y += 20;

    // ---------- ITEMS TABLE ----------
    const tableTop = doc.y;
    const itemHeight = 35;
    const tableWidth = 495;

    // Table Header
    doc
      .rect(50, tableTop, tableWidth, itemHeight)
      .fill("#f0f0f0")
      .strokeColor("#d0d0d0")
      .stroke();

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("No", 58, tableTop + 12)
      .text("SOFTWARE SUBSCRIPTION PLAN", 95, tableTop + 12)
      .text("Duration", 310, tableTop + 12, { width: 60, align: "center" })
      .text("Tax (18%)", 390, tableTop + 12, { width: 60, align: "right" })
      .text("Total", 470, tableTop + 12, { width: 60, align: "right" });

    // Table Row
    const rowY = tableTop + itemHeight;
    doc
      .strokeColor("#d0d0d0")
      .rect(50, rowY, tableWidth, itemHeight + 10)
      .stroke();

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("1", 58, rowY + 10)
      .text(purchase.selectedPlan || "SaaS Gym Management Plan", 95, rowY + 8, { width: 210 })
      .fontSize(8)
      .fillColor("#4b5563")
      .text("Gym Owner Cloud Management Software Subscription", 95, rowY + 22, { width: 210 })
      .fontSize(10)
      .fillColor("#000000")
      .text(purchase.billingDuration || "Monthly", 310, rowY + 12, { width: 60, align: "center" })
      .text(`INR ${taxAmount.toLocaleString("en-IN")}`, 390, rowY + 12, { width: 60, align: "right" })
      .text(`INR ${subtotal.toLocaleString("en-IN")}`, 470, rowY + 12, { width: 60, align: "right" });

    doc.y = rowY + itemHeight + 30;

    // ---------- SUMMARY BOX ----------
    const summaryX = 300;
    const summaryY = doc.y;
    const summaryWidth = 245;

    doc
      .lineWidth(1)
      .strokeColor("#d4af37")
      .rect(summaryX, summaryY - 5, summaryWidth, 85)
      .stroke();

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Taxable Value", summaryX + 10, summaryY + 5)
      .text(`INR ${taxableAmount.toLocaleString("en-IN")}`, summaryX, summaryY + 5, { width: summaryWidth - 10, align: "right" });

    doc
      .text("IGST / CGST+SGST (18%)", summaryX + 10, summaryY + 25)
      .text(`INR ${taxAmount.toLocaleString("en-IN")}`, summaryX, summaryY + 25, { width: summaryWidth - 10, align: "right" });

    doc
      .rect(summaryX, summaryY + 48, summaryWidth, 25)
      .fill("#fef3c7");

    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("TOTAL AMOUNT", summaryX + 10, summaryY + 55)
      .text(`INR ${subtotal.toLocaleString("en-IN")}`, summaryX, summaryY + 55, { width: summaryWidth - 10, align: "right" });

    doc.y = summaryY + 95;

    // Amount in Words
    const words = numberToWords(Math.floor(subtotal));
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Amount in Words: INR ${words} Only`, 50, doc.y);

    doc.y += 40;

    // ---------- FOOTER / SIGNATURE ----------
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#4b5563")
      .text("Thank you for using GymSoft Cloud Software!", 50, doc.y, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Error generating SaaS invoice PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
