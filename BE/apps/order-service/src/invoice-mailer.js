import nodemailer from "nodemailer";
import { config } from "../../../packages/shared/src/config.js";

export async function sendCodInvoiceEmail(order) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.log(`COD invoice email skipped for ${order.customerEmail || "missing email"}: SMTP is not configured`);
    return { delivered: false };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  const invoicePdf = createInvoicePdf(order);

  await transporter.sendMail({
    from: config.mailFrom,
    to: order.customerEmail,
    subject: `Hoa don Fruitweb - ${order.orderId}`,
    html: `
      <p>Xin chao ${escapeHtml(order.customerName)},</p>
      <p>Fruitweb da nhan don hang COD cua ban. File hoa don PDF duoc dinh kem trong email nay.</p>
      <p><strong>Ma don:</strong> ${order.orderId}</p>
      <p><strong>Tong tien:</strong> ${formatMoney(order.total)}</p>
    `,
    attachments: [
      {
        filename: `fruitweb-invoice-${order.orderId}.pdf`,
        content: invoicePdf,
        contentType: "application/pdf"
      }
    ]
  });

  return { delivered: true };
}

function createInvoicePdf(order) {
  const lines = [
    "FRUITWEB INVOICE",
    `Order ID: ${order.orderId}`,
    `Customer: ${normalizeText(order.customerName)}`,
    `Email: ${normalizeText(order.customerEmail || "")}`,
    `Phone: ${normalizeText(order.phone || "")}`,
    `Address: ${normalizeText(order.address || "")}`,
    `Payment: COD`,
    `Created at: ${new Date(order.createdAt || Date.now()).toLocaleString("vi-VN")}`,
    "",
    "Items:"
  ];

  for (const item of order.items || []) {
    lines.push(
      `- ${normalizeText(item.name)} x${item.quantity} | ${formatMoney(item.price)} | ${formatMoney(item.price * item.quantity)}`
    );
  }

  lines.push("", `Total: ${formatMoney(order.total)}`, "", "Thank you for shopping at Fruitweb.");

  return buildSimplePdf(lines);
}

function buildSimplePdf(lines) {
  const objects = [];
  const content = lines
    .map((line, index) => `BT /F1 12 Tf 50 ${780 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
    .join("\n");

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)} VND`;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value) {
  return normalizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
