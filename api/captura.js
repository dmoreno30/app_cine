import { put } from "@vercel/blob";
import { buildICINE } from "../lib/build.js";
import { validar, marcarEnviado } from "../lib/registro.js";

function slug(text) {
  return String(text || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, mensaje: "Método no permitido" });
  }

  const { _token, ...json } = req.body || {};

  const check = await validar(_token);
  if (!check.ok) {
    const mensaje = check.motivo === "ya_enviado"
      ? "Esta información ya fue enviada anteriormente. Si necesitas corregir algo, contacta a tu consultor."
      : "Este enlace no es válido. Contacta a tu consultor para que te comparta uno nuevo.";
    console.warn(`Envío rechazado (${check.motivo}) — token: ${_token}`);
    return res.status(409).json({ ok: false, mensaje });
  }

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `${slug(json.cliente)}-${stamp}`;

    const { buffer, nes, cliente } = await buildICINE(json);

    const docxBlob = await put(`icine/${base}.docx`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    await put(`icine/${base}.json`, JSON.stringify(json, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json"
    });

    await marcarEnviado(_token, { docxUrl: docxBlob.url, cliente });

    console.log(`Recibido y generado: ${cliente} — NEs: ${nes.join(", ")}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error generando el iCINE:", err);
    res.status(500).json({ ok: false, mensaje: "Error interno generando el documento. El equipo técnico ya fue notificado." });
  }
}
