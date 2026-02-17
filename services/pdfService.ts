import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, PaymentStatus, AppSettings, Customer } from "../types";

// Helper to format currency with comma separators
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper to convert image URL to base64 (Flattened to White Background)
const getImageBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous'; // Handle potential CORS if served from external
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        // Fill white background to prevent black-box transparency issues in PDF
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw image on top
        ctx.drawImage(img, 0, 0);
        // Return as JPEG to ensure opacity
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = (e) => reject(e);
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
};

// Helper to generate the jsPDF instance
const createInvoiceDoc = async (invoice: Invoice, settings: AppSettings, logoUrl?: string, createdBy: string = 'Admin'): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // --- BRANDING CONFIG ---
  const isMirrorzone = invoice.company === 'mirrorzone';
  const brandColor: [number, number, number] = isMirrorzone ? [15, 23, 42] : [220, 38, 38];
  const textColor: [number, number, number] = [0, 0, 0];

  // Helper for lines
  const drawHorizLine = (y: number, thickness: number = 0.1) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(thickness);
    doc.line(margin, y, pageWidth - margin, y);
  };

  let yPos = 0;

  // 1. DIAGONAL BANNER (Top Left) - Thin ribbon strip
  const isPaid = invoice.status === PaymentStatus.PAID;
  const statusText = isPaid ? "PAID" : "UNPAID";
  const bannerColor = isPaid ? [34, 197, 94] : [249, 115, 22];

  // Draw thin diagonal ribbon using rotated rectangle
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);

  // Create a thin ribbon: width=70mm, height=12mm, rotated -45deg
  const ribbonLength = 70;
  const ribbonThickness = 12;
  const angle = -45 * (Math.PI / 180);

  // Starting position (offset from corner)
  const startX = -10;
  const startY = 25;

  // Calculate the 4 corners of the ribbon rectangle
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const p1 = { x: startX, y: startY };
  const p2 = { x: startX + ribbonLength * cos, y: startY + ribbonLength * sin };
  const p3 = { x: p2.x - ribbonThickness * sin, y: p2.y + ribbonThickness * cos };
  const p4 = { x: p1.x - ribbonThickness * sin, y: p1.y + ribbonThickness * cos };

  // Draw the ribbon polygon
  doc.moveTo(p1.x, p1.y);
  doc.lineTo(p2.x, p2.y);
  doc.lineTo(p3.x, p3.y);
  doc.lineTo(p4.x, p4.y);
  doc.close();
  doc.fill();

  // Add text on ribbon using transform
  doc.saveGraphicsState();

  // Move to center of ribbon and rotate
  const textX = 15; // Centered
  const textY = 15; // Centered

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255); // White color

  // Translate to position, rotate, then draw text
  const rotateAngle = 45;

  doc.text(statusText, textX, textY, {
    angle: rotateAngle,
    align: 'center',
    baseline: 'middle'
  });

  doc.restoreGraphicsState();

  // 2. HEADER: Title Left, Logo Right
  yPos = 25; // Moved up from 35
  const docTitle = invoice.documentType === 'quote' ? 'Quote' : 'Invoice';

  // Title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(20);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(docTitle, margin, yPos);

  // Number
  doc.setFontSize(12);
  doc.text(invoice.invoiceNumber, margin, yPos + 7);

  // Logo (Top Right)
  // Logo (Top Right)
  const logoPath = isMirrorzone ? '/mirrorzone-logo.png' : '/clonmel-logo.png';
  const format = 'JPEG'; // Converted to JPEG with white bg to fix transparency issues

  try {
    const logoBase64 = await getImageBase64(logoPath);
    if (logoBase64) {
      // Helper: Get true dimensions
      const getImageDimensions = (src: string): Promise<{ w: number, h: number }> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.src = src;
        });
      };

      const dims = await getImageDimensions(logoBase64);
      const ratio = dims.w / dims.h;

      // Restrict Max Dimensions - Reduced to prevent "too big" look
      const maxW = isMirrorzone ? 70 : 50;
      const maxH = 22; // Reduced from 35 back to 22 to keep it tidy

      let logoW = maxW;
      let logoH = maxW / ratio;

      // Constrain by height if needed
      if (logoH > maxH) {
        logoH = maxH;
        logoW = maxH * ratio;
      }

      const logoX = pageWidth - margin - logoW;
      doc.addImage(logoBase64, format, logoX, yPos - 10, logoW, logoH);
    }
  } catch (error) {
    console.error('Error adding logo:', error);
  }

  yPos += 20;
  drawHorizLine(yPos);

  // 3. ADDRESS SECTION (3 Columns)
  yPos += 8;
  const colWidth = contentWidth / 3;

  doc.setFontSize(8);

  // Col 1: Quote/Invoice To
  doc.setFont("helvetica", "bold");
  doc.text(`${docTitle} To:`, margin, yPos);

  doc.setFont("helvetica", "normal");
  const addressParts = (invoice.customerAddress || '').split(',').map(s => s.trim()).filter(Boolean);
  const formattedAddressLines = addressParts.flatMap(part => doc.splitTextToSize(part, colWidth - 5));

  const billLines = [
    invoice.customerName,
    ...formattedAddressLines
  ].filter(Boolean);

  let billY = yPos + 5;
  billLines.forEach(l => { doc.text(l, margin, billY); billY += 4; });

  // Col 2: Deliver To
  const col2X = margin + colWidth;
  doc.setFont("helvetica", "bold");
  doc.text("Deliver To:", col2X, yPos);

  doc.setFont("helvetica", "normal");
  let shipY = yPos + 5;
  billLines.forEach(l => { doc.text(l, col2X, shipY); shipY += 4; });

  // Col 3: Company Details
  const col3X = margin + (colWidth * 2);
  doc.setFont("helvetica", "bold");
  const companyName = isMirrorzone
    ? (settings.mirrorZoneName || "MirrorZone")
    : (settings.companyName || "Clonmel Glass & Mirrors Ltd");
  doc.text(companyName, col3X, yPos);

  doc.setFont("helvetica", "normal");
  const companyInfo = isMirrorzone ? [
    settings.mirrorZoneAddress || "24 Mary Street, Clonmel, Co. Tipperary, E91 YV52",
    "",
    `Tel: ${settings.mirrorZonePhone || "(052) 61 26306"}`,
    `Email: ${settings.mirrorZoneEmail || "info@mirrorzone.ie"}`,
    settings.mirrorZoneWebsite || "Web: www.mirrorzone.ie"
  ] : [
    settings.companyAddress || "24 Mary Street, Clonmel, Co. Tipperary",
    "",
    `Tel: ${settings.companyPhone || "(052) 612 6306"}`,
    `Email: ${settings.companyEmail || "info@clonmelglassandmirrors.com"}`,
    settings.companyWebsite ? `Web: ${settings.companyWebsite}` : ""
  ].filter(Boolean);
  let compY = yPos + 5;
  companyInfo.forEach(l => {
    // Wrap text if it's too long for the column
    const wrappedLines = doc.splitTextToSize(l, colWidth - 5);
    wrappedLines.forEach((line: string) => {
      doc.text(line, col3X, compY);
      compY += 4;
    });
  });

  yPos = Math.max(billY, shipY, compY) + 5;

  // 4. INFO STRIP (Horizontal)
  drawHorizLine(yPos);
  yPos += 6;

  const infoCols = [
    { label: `${docTitle} Date`, val: new Date(invoice.dateIssued).toLocaleDateString('en-GB') },
    { label: "Ref. No.", val: invoice.invoiceNumber },
    { label: "Account Manager", val: createdBy },
    { label: "VAT No.", val: settings.vatNumber || "IE8252470Q" },
    { label: "Payment Due", val: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : "On Receipt" },
    { label: "Credit Terms", val: "30 Days" }
  ];

  const infoWidth = contentWidth / infoCols.length;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  infoCols.forEach((col, i) => {
    doc.text(col.label, margin + (i * infoWidth), yPos);
  });

  yPos += 5;
  doc.setFont("helvetica", "normal");
  infoCols.forEach((col, i) => {
    doc.text(col.val, margin + (i * infoWidth), yPos);
  });

  yPos += 5;
  drawHorizLine(yPos);

  // 5. ITEMS TABLE
  yPos += 10;

  const tableHead = [["Description", "Quantity", "Price", "VAT Rate", "Total"]];
  const tableBody = invoice.items.map(item => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    `23.00%`,
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 8,
      font: "helvetica",
      textColor: textColor,
      cellPadding: 5,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [243, 244, 246] as any, // Gray-100
      textColor: [31, 41, 55] as any,    // Gray-800
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index > 0) {
          data.cell.styles.halign = 'right';
        }
      }
    }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 10;

  // 6. VAT ANALYSIS TABLE (Left) & TOTALS (Right)
  const leftColX = margin;
  const rightColX = pageWidth - margin - 80;

  // VAT Analysis Table
  const vatRows = [
    ["23.00%", `€${formatCurrency(invoice.subtotal)}`, `€${formatCurrency(invoice.taxAmount)}`, `€${formatCurrency(invoice.total)}`]
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VAT Analysis", leftColX, yPos - 2);

  autoTable(doc, {
    startY: yPos,
    margin: { left: leftColX },
    tableWidth: 90,
    head: [["VAT Rate %", "Net", "VAT", "Gross"]],
    body: vatRows,
    theme: 'plain',
    styles: {
      fontSize: 8,
      font: "helvetica",
      textColor: textColor,
      cellPadding: 3,
      lineColor: [229, 231, 235] as any,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [243, 244, 246] as any,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  // TOTALS SECTION (Right Side)
  let totalsY = yPos;
  const valX = pageWidth - margin;
  const labX = pageWidth - margin - 60;

  const drawTotalLine = (label: string, value: string, isBold: boolean = false, isFinal: boolean = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold && isFinal ? 11 : 9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    doc.text(label, labX, totalsY + 4);
    doc.text(value, valX, totalsY + 4, { align: 'right' });
    totalsY += 6;
  };

  // Border Top
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(labX, totalsY, valX, totalsY);

  drawTotalLine("Total Net", `€${formatCurrency(invoice.subtotal)}`);
  drawTotalLine("Total Discount", `€${formatCurrency(0)}`);
  drawTotalLine("Total VAT", `€${formatCurrency(invoice.taxAmount)}`);

  // Total Gross
  totalsY += 4;
  doc.line(labX, totalsY, valX, totalsY);
  totalsY += 2;
  drawTotalLine("Total Gross", `€${formatCurrency(invoice.total)}`, true);

  // Less Deposit Section
  totalsY += 2;
  doc.line(labX, totalsY, valX, totalsY);
  totalsY += 2; // Extra breathing room before "Less Deposit"

  const deposit = invoice.amountPaid || 0;
  drawTotalLine("Less Deposit", `€${formatCurrency(deposit)}`);

  // Total Payable
  totalsY += 4;
  doc.setDrawColor(31, 41, 55);
  doc.setLineWidth(0.5);
  doc.line(labX, totalsY, valX, totalsY); // Thick line

  totalsY += 2;
  drawTotalLine("Total Payable", `€${formatCurrency(invoice.balanceDue)}`, true, true);

  // 7. FOOTER SECTION
  // @ts-ignore
  const vatTableEnd = doc.lastAutoTable.finalY;
  yPos = Math.max(vatTableEnd, totalsY) + 15;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  const leftFooterX = margin;
  const rightFooterX = pageWidth - margin - 70; // Positioned on right side

  // Payment Terms - REMOVED as per request, just showing Notes if present
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  if (invoice.notes) {
    doc.text("Notes:", leftFooterX, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const notes = doc.splitTextToSize(invoice.notes || "", 80);
    doc.text(notes, leftFooterX, yPos);
  }

  // Bank Details
  yPos += 10; // Add space between Notes and Bank Details

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Bank Details", leftFooterX, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const bankLines = isMirrorzone ? [
    { l: "Account Name:", v: settings.mirrorZoneAccountName || "MirrorZone" },
    { l: "Bank Name:", v: settings.mirrorZoneBankName || "Bank of Ireland" },
    { l: "BIC/SWIFT:", v: settings.mirrorZoneBic || "BOFIIE2D" },
    { l: "IBAN:", v: settings.mirrorZoneIban || "IE12BOFI90001010101234" },
  ] : [
    { l: "Account Name:", v: settings.accountName || "Clonmel Glass & Mirrors" },
    { l: "Bank Name:", v: settings.bankName || "PTSB" },
    { l: "BIC/SWIFT:", v: settings.bic || "PTSBIE2D" },
    { l: "IBAN:", v: settings.iban || "IE98IPBS99071010105209" },
  ];

  bankLines.forEach(line => {
    doc.setFont("helvetica", "bold");
    doc.text(line.l, leftFooterX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(line.v, leftFooterX + 25, yPos);
    yPos += 4;
  });

  // Bottom Footer
  const pageBottom = pageHeight - 10;
  doc.setFillColor(243, 244, 246);
  doc.rect(0, pageBottom - 5, pageWidth, 15, 'F');

  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  const todayDate = new Date().toLocaleDateString('en-GB');
  doc.text(`Printed as: ${todayDate} | Page 1 of 1`, margin, pageBottom + 2);
  doc.text("Created by Clonmel Glass Invoice Hub", pageWidth - margin, pageBottom + 2, { align: 'right' });

  return doc;
};

// Exported Actions
export const downloadInvoicePDF = async (invoice: Invoice, settings: AppSettings, logoUrl?: string, createdBy: string = 'Admin') => {
  const doc = await createInvoiceDoc(invoice, settings, logoUrl, createdBy);

  // Mobile-friendly download handling
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } else {
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }
};

export const generatePreviewUrl = async (invoice: Invoice, settings: AppSettings, logoUrl?: string, createdBy: string = 'Admin'): Promise<string> => {
  const doc = await createInvoiceDoc(invoice, settings, logoUrl, createdBy);
  return doc.output('bloburl').toString();
};

export const sendInvoiceViaWebhook = async (
  invoice: Invoice,
  settings: AppSettings,
  logoUrl?: string,
  customer?: Customer,
  notificationType?: string, // "First Mail" or "Reminder"
  createdBy: string = 'Admin'
): Promise<boolean> => {
  if (!settings.webhookUrl) {
    throw new Error("Webhook URL not configured in Settings.");
  }

  try {
    const doc = await createInvoiceDoc(invoice, settings, logoUrl, createdBy);

    // Get PDF as Base64 string
    const pdfDataUri = doc.output('datauristring');
    const pdfBase64 = pdfDataUri.split(',')[1];

    const payload = {
      // Metadata
      generatedAt: new Date().toISOString(),
      webhookType: 'INVOICE_SEND',
      notificationType: notificationType || 'Manual Send', // e.g. "First Mail", "Follow-up / Reminder"

      // Document
      filename: `${invoice.invoiceNumber}.pdf`,
      pdfBase64: pdfBase64,

      // Invoice Details
      invoice: {
        id: invoice.id,
        number: invoice.invoiceNumber,
        status: invoice.status,
        dateIssued: invoice.dateIssued.split('T')[0].split('-').reverse().join('-'), // YYYY-MM-DD -> DD-MM-YYYY
        dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0].split('-').reverse().join('-') : "",
        currency: 'EUR',
        notes: invoice.notes,
        reminderCount: invoice.reminderCount || 0, // Include count

        // Financials (Formatted as Strings for N8N)
        totals: {
          subtotal: `€${invoice.subtotal.toFixed(2)}`,
          taxRate: invoice.taxRate,
          taxAmount: `€${invoice.taxAmount.toFixed(2)}`,
          total: `€${invoice.total.toFixed(2)}`,
          amountPaid: `€${(invoice.amountPaid || 0).toFixed(2)}`,
          balanceDue: `€${(invoice.balanceDue || 0).toFixed(2)}`
        },

        // Line Items
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: `€${item.unitPrice.toFixed(2)}`,
          total: `€${item.total.toFixed(2)}`,
          unit: item.unit
        }))
      },

      // Customer Data (Merged from Invoice Snapshot and CRM Record)
      customer: {
        id: invoice.customerId,
        name: invoice.customerName,
        firstName: invoice.customerName ? invoice.customerName.split(' ')[0] : "",
        lastName: invoice.customerName ? invoice.customerName.split(' ').slice(1).join(' ') : "",
        email: invoice.customerEmail,
        phone: invoice.customerPhone,
        address: invoice.customerAddress,

        // Extended CRM Data (if available)
        city: customer?.city,
        postalCode: customer?.postalCode,
        country: customer?.country,
        companyName: customer?.company,
        tags: customer?.tags,
        crmNotes: customer?.notes
      },

      // Sender Info
      sender: {
        company: invoice.company || 'clonmel',
        taxId: settings.vatNumber
      }
    };

    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Webhook sending failed:", error);
    throw error;
  }
};