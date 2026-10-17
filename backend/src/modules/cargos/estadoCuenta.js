const PDFDocument = require("pdfkit");
const pool = require("../../config/db");

const INK = "#0A2F38";
const MUTED = "#5B6B70";
const LINE = "#C9D6D8";

function money(value) {
  const n = Number(value) || 0;
  return "Q " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value, tz) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("es-GT", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
  } catch { return "-"; }
}

async function loadCenter() {
  const defaults = { centerName: "Centro Médico", address: "", phone: "", email: "", timezone: "America/Guatemala" };
  try {
    const r = await pool.query("SELECT datos FROM configuracion_centro WHERE id = 1");
    return { ...defaults, ...(r.rows[0]?.datos || {}) };
  } catch { return defaults; }
}

async function loadAccount(idPaciente) {
  const pac = await pool.query(
    "SELECT id_paciente, nombre, dni, telefono, email, residencia FROM pacientes WHERE id_paciente = $1",
    [idPaciente]
  );
  if (!pac.rows[0]) return null;
  const cargos = await pool.query(
    `SELECT id_cargo, origen, descripcion, total, saldo, estado_pago, created_at
     FROM cargos_paciente WHERE id_paciente = $1 ORDER BY created_at ASC, id_cargo ASC`,
    [idPaciente]
  );
  const pagos = await pool.query(
    `SELECT id_pago, id_cargo, monto, metodo, fecha_pago
     FROM pagos WHERE id_paciente = $1 ORDER BY fecha_pago ASC, id_pago ASC`,
    [idPaciente]
  );
  return { paciente: pac.rows[0], cargos: cargos.rows, pagos: pagos.rows };
}

function row(doc, y, cols, opts = {}) {
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 9).fillColor(opts.color || "#000");
  cols.forEach(c => doc.text(String(c.text), c.x, y, { width: c.w, align: c.align || "left", lineBreak: false, ellipsis: true }));
}

function build(doc, center, data, issuedBy) {
  const tz = center.timezone;
  const { paciente, cargos, pagos } = data;
  const left = 50, right = 562;

  doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(center.centerName, left, 50);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  const contact = [center.address, center.phone, center.email].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact, left, 72, { width: 512 });
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text("ESTADO DE CUENTA DEL PACIENTE", left, 98);
  doc.moveTo(left, 118).lineTo(right, 118).strokeColor(INK).lineWidth(1.5).stroke();

  doc.font("Helvetica").fontSize(10).fillColor("#000");
  doc.text("Paciente: ", left, 128, { continued: true }).font("Helvetica-Bold").text(paciente.nombre);
  doc.font("Helvetica").text("DPI / Documento: " + paciente.dni, left, 143);
  if (paciente.telefono) doc.text("Teléfono: " + paciente.telefono, left, 158);
  doc.text("Fecha de emisión: " + fmtDate(new Date(), tz), 380, 128, { width: 182, align: "right" });

  let y = 185;
  const X = { fecha: 50, desc: 105, tipo: 300, total: 365, pagado: 420, saldo: 485, estado: 530 };
  const header = () => {
    doc.rect(left, y - 4, right - left, 18).fill("#E6F1F0");
    row(doc, y, [
      { x: X.fecha, w: 52, text: "Fecha" }, { x: X.desc, w: 190, text: "Concepto" },
      { x: X.tipo, w: 60, text: "Origen" }, { x: X.total, w: 52, text: "Total", align: "right" },
      { x: X.pagado, w: 60, text: "Pagado", align: "right" }, { x: X.saldo, w: 42, text: "Saldo", align: "right" },
    ], { bold: true, color: INK, size: 8.5 });
    y += 20;
  };
  header();

  const pagadoPorCargo = new Map();
  for (const p of pagos) pagadoPorCargo.set(p.id_cargo, (pagadoPorCargo.get(p.id_cargo) || 0) + Number(p.monto));

  let totalCargos = 0, totalPagado = 0, totalSaldo = 0;
  for (const c of cargos) {
    if (y > 720) { doc.addPage(); y = 50; header(); }
    const pagado = pagadoPorCargo.get(c.id_cargo) || 0;
    totalCargos += Number(c.total); totalPagado += pagado; totalSaldo += Number(c.saldo);
    row(doc, y, [
      { x: X.fecha, w: 52, text: fmtDate(c.created_at, tz) }, { x: X.desc, w: 190, text: c.descripcion || "-" },
      { x: X.tipo, w: 60, text: c.origen || "-" }, { x: X.total, w: 52, text: money(c.total).replace("Q ", ""), align: "right" },
      { x: X.pagado, w: 60, text: money(pagado).replace("Q ", ""), align: "right" },
      { x: X.saldo, w: 42, text: money(c.saldo).replace("Q ", ""), align: "right" },
    ]);
    y += 16;
    doc.moveTo(left, y - 3).lineTo(right, y - 3).strokeColor(LINE).lineWidth(0.5).stroke();
  }
  if (!cargos.length) { doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text("Este paciente no tiene cargos registrados.", left, y); y += 16; }

  if (pagos.length) {
    y += 14;
    if (y > 680) { doc.addPage(); y = 50; }
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Pagos recibidos", left, y); y += 18;
    for (const p of pagos) {
      if (y > 740) { doc.addPage(); y = 50; }
      row(doc, y, [
        { x: 50, w: 70, text: fmtDate(p.fecha_pago, tz) }, { x: 125, w: 150, text: "Pago al cargo #" + p.id_cargo },
        { x: 280, w: 100, text: p.metodo || "-" }, { x: 430, w: 132, text: money(p.monto), align: "right" },
      ]);
      y += 15;
    }
  }

  y += 16;
  if (y > 690) { doc.addPage(); y = 50; }
  doc.rect(330, y, 232, 62).fill("#E6F1F0");
  doc.font("Helvetica").fontSize(10).fillColor("#000");
  doc.text("Total de cargos:", 340, y + 8, { width: 110 }).text(money(totalCargos), 450, y + 8, { width: 104, align: "right" });
  doc.text("Total pagado:", 340, y + 24, { width: 110 }).text(money(totalPagado), 450, y + 24, { width: 104, align: "right" });
  doc.font("Helvetica-Bold").fillColor(INK).text("Saldo pendiente:", 340, y + 42, { width: 110 }).text(money(totalSaldo), 450, y + 42, { width: 104, align: "right" });

  doc.font("Helvetica-Oblique").fontSize(8).fillColor(MUTED).text(
    "Documento informativo del estado de cuenta. No constituye factura fiscal ni tiene validez ante la SAT. Emitido por: " + issuedBy + ".",
    left, 748, { width: 512, align: "center" }
  );
}

async function streamEstadoCuenta(idPaciente, issuedBy, res) {
  const data = await loadAccount(idPaciente);
  if (!data) return false;
  const center = await loadCenter();
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 50, bottom: 30, left: 50, right: 50 }, info: { Title: "Estado de cuenta", Author: center.centerName } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="estado-cuenta-paciente-${data.paciente.id_paciente}.pdf"`);
  res.setHeader("Cache-Control", "no-store");
  doc.pipe(res);
  build(doc, center, data, issuedBy);
  doc.end();
  return true;
}

module.exports = { streamEstadoCuenta };
