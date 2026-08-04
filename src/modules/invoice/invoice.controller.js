import PDFDocument from "pdfkit";
import { getInvoiceDataService } from "./invoice.service.js";
import { numberToWords } from "../../utils/numberToWords.js";

export const generateInvoicePdf = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await getInvoiceDataService(paymentId);

    // A4 size: 210mm x 297mm with golden border
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50 
    });

    // Draw golden border around the entire page
    doc
      .lineWidth(3)
      .strokeColor('#d4af37')
      .rect(50, 50, 495, 697) // A4 size minus margins
      .stroke();

    // HTTP headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${payment.invoiceNo}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Company details - Priority: admin profile gymName > settings gymName > adminName
    const companyName = payment.adminGymName || payment.settingsGymName || payment.adminName || payment.branchName || "Gym Name";
    // Priority: admin profile gymAddress > branchAddress
    const companyAddress = payment.adminGymAddress || payment.branchAddress || "Gym Address";
    const companyGST = payment.adminGstNumber || "";
    const companyPhone = payment.adminPhone || "";
    const companyEmail = payment.adminEmail || "";

    // Member details
    const cleanStr = (s) => (s && s !== "null" && s !== "undefined" ? String(s) : "");
    const memberName = cleanStr(payment.memberName) || "Valued Member";
    const memberPhone = cleanStr(payment.memberPhone);
    const memberEmail = cleanStr(payment.memberEmail);
    const memberAddress = cleanStr(payment.memberAddress);
    
    // Extract state from address for Place of Supply
    const addressParts = companyAddress.split(',');
    const placeOfSupply = addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim() || "Telangana";
    
    // Calculate balance and amount in words
    const balance = payment.totalAmount - payment.amount;
    const amountInWords = numberToWords(Math.floor(payment.totalAmount));

    // ---------- HEADER: Logo + Company Details + Invoice Title ----------
    const headerY = 60;
    const logoBoxSize = 60;
    const logoBoxX = 50;
    const logoBoxY = headerY;
    const detailsX = logoBoxX + logoBoxSize + 15;
    const detailsWidth = 350;
    const invoiceTitleX = 450;
    
    // Logo box (placeholder - logo can be added if available)
    doc
      .lineWidth(1)
      .strokeColor('#d4af37')
      .rect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize)
      .stroke();
    
    // Company Name
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(companyName, detailsX, headerY, { width: detailsWidth });
    
    // GSTIN
    if (companyGST) {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`GSTIN ${companyGST}`, detailsX, headerY + 22);
    }
    
    // Phone
    let currentY = headerY + 36;
    if (companyPhone) {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`Mobile No: ${companyPhone}`, detailsX, currentY);
      currentY += 14;
    }
    
    // Email
    if (companyEmail) {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`Email: ${companyEmail}`, detailsX, currentY);
      currentY += 14;
    }
    
    // Address
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(`Address: ${companyAddress}`, detailsX, currentY, { width: detailsWidth });
    
    // Invoice Title (Right aligned)
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text("TAX INVOICE", invoiceTitleX, headerY + 10, { align: "right", width: 100 });
    
    // Golden separator line
    doc.y = headerY + logoBoxSize + 15;
    doc
      .lineWidth(2)
      .strokeColor('#d4af37')
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    
    doc.y += 20;

    // ---------- INVOICE INFO ----------
    const invoiceDate = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Invoice No. ${payment.invoiceNo}`, 50, doc.y)
      .text(`Invoice Date ${invoiceDate}`, { align: "right" })
      .moveDown(1.5);

    // ---------- BILL TO SECTION ----------
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text("Bill To", 50, doc.y);
    
    doc.y += 12;
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(memberName, 50, doc.y);
    if (memberAddress) {
      doc.text(memberAddress, 50, doc.y + 14, { width: 500 });
    }
    if (memberPhone) {
      doc.text(`Mobile: ${memberPhone}`, 50, doc.y + 14);
    }
    doc.y += 20;
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Place of Supply ${placeOfSupply}`, 50, doc.y);
    
    doc.y += 20;

    // ---------- ITEMS TABLE ----------
    const tableTop = doc.y;
    const itemHeight = 30;
    const tableWidth = 500;
    
    // Table Header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('black');
    
    // Header background
    doc
      .rect(50, tableTop, tableWidth, itemHeight)
      .fill('#f0f0f0')
      .strokeColor('#d0d0d0')
      .stroke();
    
    // Header text
    doc.text("No", 58, tableTop + 10);
    doc.text("SERVICES", 100, tableTop + 10);
    doc.text("Qty.", 350, tableTop + 10, { align: "center" });
    doc.text("Rate", 400, tableTop + 10, { align: "right" });
    doc.text("Tax", 450, tableTop + 10, { align: "right" });
    doc.text("Total", 500, tableTop + 10, { align: "right" });

    // Vertical lines in header
    doc
      .strokeColor('#d0d0d0')
      .moveTo(90, tableTop)
      .lineTo(90, tableTop + itemHeight)
      .stroke();
    doc
      .moveTo(340, tableTop)
      .lineTo(340, tableTop + itemHeight)
      .stroke();
    doc
      .moveTo(390, tableTop)
      .lineTo(390, tableTop + itemHeight)
      .stroke();
    doc
      .moveTo(440, tableTop)
      .lineTo(440, tableTop + itemHeight)
      .stroke();
    doc
      .moveTo(490, tableTop)
      .lineTo(490, tableTop + itemHeight)
      .stroke();

    // Table Row
    const rowY = tableTop + itemHeight;
    doc
      .strokeColor('#d0d0d0')
      .rect(50, rowY, tableWidth, itemHeight)
      .stroke();
    
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('black')
      .text("1", 58, rowY + 10)
      .text(payment.planName || "Membership Plan", 100, rowY + 6, { width: 230 })
      .fontSize(8)
      .text(
        payment.planDuration
          ? `${payment.planDuration} Months (${payment.planValidity || 0} Days Validity)`
          : `${payment.planValidity || 30} Days Plan`,
        100,
        rowY + 18,
        { width: 230 }
      )
      .fontSize(10)
      .text("1 PCS", 350, rowY + 10, { align: "center" })
      .text(`${Math.floor(payment.subtotal).toLocaleString('en-IN')}`, 400, rowY + 10, { align: "right" })
      .text(`${Math.floor(payment.taxAmount)}`, 450, rowY + 6, { align: "right" })
      .fontSize(8)
      .text(`(${payment.taxRate}%)`, 450, rowY + 18, { align: "right" })
      .fontSize(10)
      .text(`${Math.floor(payment.totalAmount).toLocaleString('en-IN')}`, 500, rowY + 10, { align: "right" });

    // Vertical lines in row
    doc
      .strokeColor('#d0d0d0')
      .moveTo(90, rowY)
      .lineTo(90, rowY + itemHeight)
      .stroke();
    doc
      .moveTo(340, rowY)
      .lineTo(340, rowY + itemHeight)
      .stroke();
    doc
      .moveTo(390, rowY)
      .lineTo(390, rowY + itemHeight)
      .stroke();
    doc
      .moveTo(440, rowY)
      .lineTo(440, rowY + itemHeight)
      .stroke();
    doc
      .moveTo(490, rowY)
      .lineTo(490, rowY + itemHeight)
      .stroke();

    doc.y = rowY + itemHeight + 20;

    // ---------- TAX BREAKDOWN AND TOTAL (Right Aligned with Golden Border) ----------
    const summaryX = 300;
    const summaryY = doc.y;
    const summaryWidth = 245;
    
    // Box with golden border
    doc
      .lineWidth(1)
      .strokeColor('#d4af37')
      .rect(summaryX - 10, summaryY - 5, summaryWidth + 20, 100)
      .stroke();
    
    // Background for total
    doc
      .rect(summaryX - 10, summaryY + 70, summaryWidth + 20, 25)
      .fill('#fef3c7');
    
    doc
      .fillColor('#000000')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text("SUBTOTAL", summaryX, summaryY)
      .font('Helvetica')
      .text(`₹ ${Math.floor(payment.subtotal).toLocaleString('en-IN')}`, summaryX + summaryWidth, summaryY, { align: "right" });
    
    doc.y += 15;
    doc
      .font('Helvetica-Bold')
      .text("Taxable Amount", summaryX, doc.y)
      .font('Helvetica')
      .text(`₹ ${Math.floor(payment.subtotal).toLocaleString('en-IN')}`, summaryX + summaryWidth, doc.y, { align: "right" });
    
    doc.y += 15;
    doc
      .font('Helvetica')
      .text(`CGST @${(payment.taxRate/2).toFixed(1)}%`, summaryX, doc.y)
      .text(`₹ ${Math.floor(payment.cgstAmount)}`, summaryX + summaryWidth, doc.y, { align: "right" });
    
    doc.y += 15;
    doc
      .text(`SGST @${(payment.taxRate/2).toFixed(1)}%`, summaryX, doc.y)
      .text(`₹ ${Math.floor(payment.sgstAmount)}`, summaryX + summaryWidth, doc.y, { align: "right" });
    
    doc.y += 20;
    // Total Amount (highlighted with golden border)
    doc
      .lineWidth(2)
      .strokeColor('#d4af37')
      .moveTo(summaryX - 10, doc.y - 5)
      .lineTo(summaryX + summaryWidth + 10, doc.y - 5)
      .stroke();
    
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text("Total Amount", summaryX, doc.y)
      .text(`₹ ${Math.floor(payment.totalAmount).toLocaleString('en-IN')}`, summaryX + summaryWidth, doc.y, { align: "right" });
    
    doc
      .lineWidth(2)
      .strokeColor('#d4af37')
      .moveTo(summaryX - 10, doc.y + 15)
      .lineTo(summaryX + summaryWidth + 10, doc.y + 15)
      .stroke();
    
    doc.y += 30;

    // ---------- TERMS & CONDITIONS BOX (with Golden Border) ----------
    const termsBoxY = doc.y;
    const termsBoxHeight = 50;
    
    doc
      .lineWidth(1)
      .strokeColor('#d4af37')
      .rect(50, termsBoxY, 500, termsBoxHeight)
      .fill('#fffef7')
      .stroke();
    
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text("Terms & Conditions", 58, termsBoxY + 8);
    
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text("1. Goods once sold will not be taken back or exchanged", 58, termsBoxY + 22)
      .text(`2. All disputes are subject to ${placeOfSupply} jurisdiction only`, 58, termsBoxY + 35);

    doc.y = termsBoxY + termsBoxHeight + 20;

    // ---------- PAYMENT SUMMARY (Received Amount, Balance, Amount in Words) with Golden Borders ----------
    const paymentSummaryY = doc.y;
    const boxHeight = 35;
    const boxWidth = 150;
    
    // Received Amount Box
    doc
      .lineWidth(1)
      .strokeColor('#d4af37')
      .rect(50, paymentSummaryY, boxWidth, boxHeight)
      .fill('#fffef7')
      .stroke();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#4b5563')
      .text("Received Amount", 58, paymentSummaryY + 5);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(`₹${Math.floor(payment.amount).toLocaleString('en-IN')}`, 58, paymentSummaryY + 18);
    
    // Balance Box
    doc
      .lineWidth(1)
      .strokeColor('#d4af37')
      .rect(220, paymentSummaryY, boxWidth, boxHeight)
      .fill('#fffef7')
      .stroke();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#4b5563')
      .text("Balance", 228, paymentSummaryY + 5);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(`₹${Math.floor(balance)}`, 228, paymentSummaryY + 18);
    
    // Total Amount in words Box
    doc
      .lineWidth(1)
      .strokeColor('#d4af37')
      .rect(390, paymentSummaryY, 160, boxHeight)
      .fill('#fffef7')
      .stroke();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#4b5563')
      .text("Total Amount (in words)", 398, paymentSummaryY + 5);
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(amountInWords, 398, paymentSummaryY + 18, { width: 144 });

    doc.y = paymentSummaryY + boxHeight + 20;

    // ---------- SIGNATURE SECTION (with Golden Line) ----------
    const signatureX = 350;
    const signatureY = doc.y + 30;
    
    doc
      .lineWidth(2)
      .strokeColor('#d4af37')
      .moveTo(signatureX, signatureY)
      .lineTo(signatureX + 150, signatureY)
      .stroke();
    
    doc.y = signatureY + 8;
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text("Signature", signatureX + 75, doc.y, { align: "center" });
    
    doc.y += 15;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(companyName, signatureX + 75, doc.y, { align: "center" });

    // End & send
    doc.end();
  } catch (err) {
    next(err);
  }
};
