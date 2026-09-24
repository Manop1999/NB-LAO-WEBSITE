/**
 * Zero-dependency PDF generator — NB LAO
 * Generates simple text-based PDF documents using raw PDF format.
 * No external dependencies required.
 */

// PDF font metrics for Helvetica (built-in PDF font)
const FONT = {
  name: 'Helvetica',
  nameBold: 'Helvetica-Bold',
  widths: {
    ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667,
    "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333,
    '.': 278, '/': 278, '0': 556, '1': 556, '2': 556, '3': 556, '4': 556,
    '5': 556, '6': 556, '7': 556, '8': 556, '9': 556, ':': 278, ';': 278,
    '<': 584, '=': 584, '>': 584, '?': 556, '@': 737, 'A': 667, 'B': 667,
    'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778, 'H': 722, 'I': 278,
    'J': 500, 'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778, 'P': 667,
    'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944,
    'X': 667, 'Y': 667, 'Z': 611, '[': 333, '\\': 278, ']': 333, '^': 584,
    '_': 556, '`': 333, 'a': 556, 'b': 556, 'c': 500, 'd': 556, 'e': 556,
    'f': 278, 'g': 556, 'h': 556, 'i': 222, 'j': 222, 'k': 500, 'l': 222,
    'm': 833, 'n': 556, 'o': 556, 'p': 556, 'q': 556, 'r': 333, 's': 500,
    't': 278, 'u': 556, 'v': 500, 'w': 722, 'x': 500, 'y': 500, 'z': 500,
    '{': 333, '|': 260, '}': 333, '~': 584
  }
};

function textWidth(text, fontSize) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += (FONT.widths[text[i]] || 500) * fontSize / 1000;
  }
  return w;
}

function escapePDF(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Build a simple PDF document
 * @param {object} opts
 * @param {string} opts.title - Document title
 * @param {Array} opts.lines - Array of {text, x, y, size, bold, color} objects
 * @param {Array} opts.tables - Array of {headers, rows, x, y, colWidths} objects
 * @param {number} opts.pageWidth - Page width in points (default 595 = A4)
 * @param {number} opts.pageHeight - Page height in points (default 842 = A4)
 */
function buildPDF(opts) {
  const pageW = opts.pageWidth || 595;
  const pageH = opts.pageHeight || 842;
  const objects = [];
  let objNum = 1;

  // Collect all text content to build content stream
  let content = 'BT\n';

  // Process lines
  if (opts.lines) {
    for (const line of opts.lines) {
      const size = line.size || 12;
      const font = line.bold ? FONT.nameBold : FONT.name;
      const color = line.color || '0 0 0';
      content += `${color} rg\n`;
      content += `/F1 ${size} Tf\n`;
      content += `${line.x || 50} ${(line.y || 750)} Td\n`;
      content += `(${escapePDF(line.text)}) Tj\n`;
      content += '0 0 Td\n';
    }
  }

  // Process tables
  if (opts.tables) {
    for (const table of opts.tables) {
      const colWidths = table.colWidths || [];
      const startX = table.x || 50;
      let curY = table.y || 700;
      const headerSize = 9;
      const cellSize = 9;
      const lineHeight = 14;

      // Draw header row
      content += '0.2 0.2 0.2 rg\n';
      content += `/F1 ${headerSize} Tf\n`;
      let curX = startX;
      for (let h = 0; h < table.headers.length; h++) {
        content += `${curX} ${curY} Td\n`;
        content += `(${escapePDF(table.headers[h])}) Tj\n`;
        curX += (colWidths[h] || 80);
        // Reset position for next cell
        content += `-${curX - startX + (colWidths[h-1] || 0)} 0 Td\n`;
      }
      curY -= lineHeight;

      // Draw header underline
      content += `0 0 0 rg\n`;
      content += `${startX} ${curY + 4} m\n`;
      content += `${startX + colWidths.reduce((a,b) => a+b, 0)} ${curY + 4} l S\n`;
      curY -= 4;

      // Draw data rows
      content += `/F1 ${cellSize} Tf\n`;
      for (const row of table.rows) {
        curX = startX;
        for (let c = 0; c < row.length; c++) {
          content += `0 0 0 Td\n`;
          // Reset to start of row
          const offset = c === 0 ? 0 : -(colWidths[c-1] || 80);
          content += `${offset} 0 Td\n`;
          content += `${curX - (c === 0 ? 0 : startX)} 0 Td\n`;
          content += `(${escapePDF(String(row[c] != null ? row[c] : ''))}) Tj\n`;
          curX += (colWidths[c] || 80);
        }
        curY -= lineHeight;
        // Reset to start of next row
        const totalWidth = colWidths.reduce((a,b) => a+b, 0);
        content += `-${totalWidth} 0 Td\n`;
      }
    }
  }

  content += 'ET\n';

  // Build PDF objects
  // Obj 1: Catalog
  objects.push({ num: objNum++, content: '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' });
  // Obj 2: Pages
  objects.push({ num: objNum++, content: '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' });
  // Obj 3: Page
  objects.push({ num: objNum++, content: `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n` });
  // Obj 4: Content stream
  const streamBytes = Buffer.byteLength(content, 'utf8');
  objects.push({ num: objNum++, content: `4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${content}endstream\nendobj\n` });
  // Obj 5: Font
  objects.push({ num: objNum++, content: '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' });

  // Assemble PDF
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (const obj of objects) {
    offsets[obj.num] = pdf.length;
    pdf += obj.content;
  }

  // Cross-reference table
  const xrefStart = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += xrefStart + '\n';
  pdf += '%%EOF';

  return Buffer.from(pdf, 'latin1');
}

/**
 * Generate an order invoice PDF
 */
function generateOrderPDF(order, items, customer) {
  const lines = [];
  const tables = [];
  let y = 780;

  // Header
  lines.push({ text: 'NB LAO', x: 50, y: y, size: 20, bold: true });
  y -= 25;
  lines.push({ text: 'Order Invoice', x: 50, y: y, size: 14, bold: true });
  y -= 30;

  // Order info
  lines.push({ text: `Order Number: ${order.orderNumber}`, x: 50, y: y, size: 11 });
  y -= 15;
  lines.push({ text: `Date: ${new Date(order.createdAt).toLocaleDateString()}`, x: 50, y: y, size: 11 });
  y -= 15;
  lines.push({ text: `Status: ${order.status}`, x: 50, y: y, size: 11 });
  y -= 25;

  // Customer info
  lines.push({ text: 'Customer Information', x: 50, y: y, size: 11, bold: true });
  y -= 15;
  lines.push({ text: `Name: ${customer.name}`, x: 50, y: y, size: 10 });
  y -= 13;
  lines.push({ text: `Email: ${customer.email}`, x: 50, y: y, size: 10 });
  y -= 13;
  if (customer.company) {
    lines.push({ text: `Company: ${customer.company}`, x: 50, y: y, size: 10 });
    y -= 13;
  }
  if (customer.phone) {
    lines.push({ text: `Phone: ${customer.phone}`, x: 50, y: y, size: 10 });
    y -= 13;
  }
  y -= 15;

  // Items table
  tables.push({
    headers: ['Product', 'Unit Price', 'Qty', 'Subtotal'],
    rows: items.map(i => [
      i.productName,
      (i.unitPrice || 0).toLocaleString() + ' KIP',
      String(i.quantity),
      ((i.unitPrice || 0) * i.quantity).toLocaleString() + ' KIP'
    ]),
    x: 50,
    y: y,
    colWidths: [250, 100, 60, 120]
  });

  // Totals
  const subtotal = items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
  y -= (items.length + 1) * 14 + 20;
  lines.push({ text: `Subtotal: ${subtotal.toLocaleString()} KIP`, x: 300, y: y, size: 11, bold: true });
  y -= 15;
  if (order.discountApplied) {
    lines.push({ text: `Discount: -${order.discountApplied.toLocaleString()} KIP`, x: 300, y: y, size: 11 });
    y -= 15;
  }
  const total = subtotal - (order.discountApplied || 0);
  lines.push({ text: `Total: ${total.toLocaleString()} KIP`, x: 300, y: y, size: 12, bold: true });

  return buildPDF({ lines, tables });
}

/**
 * Generate a quotation PDF
 */
function generateQuotationPDF(quotation, items, customer) {
  const lines = [];
  const tables = [];
  let y = 780;

  // Header
  lines.push({ text: 'NB LAO', x: 50, y: y, size: 20, bold: true });
  y -= 25;
  lines.push({ text: 'Quotation', x: 50, y: y, size: 14, bold: true });
  y -= 30;

  // Quotation info
  lines.push({ text: `Quotation Number: ${quotation.quotationNumber}`, x: 50, y: y, size: 11 });
  y -= 15;
  lines.push({ text: `Date: ${new Date(quotation.createdAt).toLocaleDateString()}`, x: 50, y: y, size: 11 });
  y -= 15;
  lines.push({ text: `Status: ${quotation.status}`, x: 50, y: y, size: 11 });
  y -= 25;

  // Customer info
  lines.push({ text: 'Customer Information', x: 50, y: y, size: 11, bold: true });
  y -= 15;
  lines.push({ text: `Name: ${customer.name}`, x: 50, y: y, size: 10 });
  y -= 13;
  lines.push({ text: `Email: ${customer.email}`, x: 50, y: y, size: 10 });
  y -= 13;
  if (customer.company) {
    lines.push({ text: `Company: ${customer.company}`, x: 50, y: y, size: 10 });
    y -= 13;
  }
  if (customer.phone) {
    lines.push({ text: `Phone: ${customer.phone}`, x: 50, y: y, size: 10 });
    y -= 13;
  }
  y -= 15;

  // Items table
  tables.push({
    headers: ['Product', 'Unit Price', 'Qty', 'Subtotal'],
    rows: items.map(i => [
      i.productName,
      (i.unitPrice || 0).toLocaleString() + ' KIP',
      String(i.quantity),
      ((i.unitPrice || 0) * i.quantity).toLocaleString() + ' KIP'
    ]),
    x: 50,
    y: y,
    colWidths: [250, 100, 60, 120]
  });

  // Totals
  const subtotal = items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
  y -= (items.length + 1) * 14 + 20;
  lines.push({ text: `Subtotal: ${subtotal.toLocaleString()} KIP`, x: 300, y: y, size: 11, bold: true });
  y -= 15;
  if (quotation.quotedAmount) {
    lines.push({ text: `Quoted Amount: ${quotation.quotedAmount.toLocaleString()} KIP`, x: 300, y: y, size: 12, bold: true });
    y -= 15;
  }
  const total = quotation.quotedAmount || subtotal;
  lines.push({ text: `Total: ${total.toLocaleString()} KIP`, x: 300, y: y, size: 12, bold: true });

  if (quotation.notes) {
    y -= 30;
    lines.push({ text: 'Notes:', x: 50, y: y, size: 10, bold: true });
    y -= 13;
    lines.push({ text: quotation.notes, x: 50, y: y, size: 10 });
  }

  return buildPDF({ lines, tables });
}

module.exports = { buildPDF, generateOrderPDF, generateQuotationPDF };
