import { listar } from "../lib/registro.js";

// Protección simple con un secreto compartido — no es un sistema de login,
// pero alcanza mientras seas la única persona administrando esto.
// Configuralo como variable de entorno ADMIN_SECRET en Vercel.
export default async function handler(req, res) {
  const secret = req.query.secret;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false, mensaje: "No autorizado" });
  }

  const registro = await listar();
  const items = Object.entries(registro)
    .map(([token, entry]) => ({ token, ...entry }))
    .sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || ""));

  res.json({ ok: true, items });
}
