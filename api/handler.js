// Handler de la app embebida en Bitrix24.
// Bitrix carga la app con POST; esta función responde el HTML de la SPA en
// CUALQUIER método y permite el iframe de Bitrix. Apuntá el handler de Bitrix
// a ESTA URL:  https://TU-APP.vercel.app/api/handler
export default async function handler(req, res) {
  // Permitir que Bitrix24 muestre la app dentro de su iframe
  res.setHeader("Content-Security-Policy",
    "frame-ancestors 'self' https://*.bitrix24.com https://*.bitrix24.es https://*.bitrix24.mx https://*.bitrix24.ru");
  try {
    const html = await fetch(`https://${req.headers.host}/index.html`).then((r) => r.text());
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send('<!doctype html><meta charset="utf-8"><script>location.replace("/index.html")</script>');
  }
}
