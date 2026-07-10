import { get } from "@vercel/blob";
import { Readable } from "node:stream";

export default async function handler(req, res) {
  const { pathname, secret } = req.query;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false, mensaje: "No autorizado" });
  }
  if (!pathname) return res.status(400).json({ ok: false, mensaje: "Falta el parámetro pathname" });

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return res.status(404).json({ ok: false, mensaje: "No encontrado" });
  }

  res.setHeader("Content-Type", result.blob.contentType || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${pathname.split("/").pop()}"`);
  Readable.fromWeb(result.stream).pipe(res);
}
