// Handler de la app embebida en Bitrix24 (incluye on-premise en dominio propio).
// Sirve el HTML de la SPA en cualquier método (Bitrix la abre por POST) e inyecta
// <base href="/"> para que los assets se resuelvan desde la raíz.
// El CSP frame-ancestors debe incluir el dominio del portal de Bitrix.
const FRAME_ANCESTORS = "frame-ancestors 'self' " + [
  "https://*.bitrix24.com",
  "https://*.bitrix24.es",
  "https://*.bitrix24.mx",
  "https://*.bitrix24.ru",
  "https://asesores-e.net",
  "https://*.asesores-e.net"
].join(" ");

export default async function handler(req, res) {
  res.setHeader("Content-Security-Policy", FRAME_ANCESTORS);
  try {
    let html = await fetch(`https://${req.headers.host}/index.html`).then((r) => r.text());
    if (!/<base\s/i.test(html)) html = html.replace(/<head([^>]*)>/i, (m) => `${m}<base href="/">`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send('<!doctype html><meta charset="utf-8"><script>location.replace("/index.html")</script>');
  }
}
