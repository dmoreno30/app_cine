// Handler de la app embebida en Bitrix24.
// Bitrix carga la app con POST; esta función responde el HTML de la SPA en
// cualquier método. Inyecta <base href="/"> para que los assets (JS/CSS) se
// resuelvan desde la raíz aunque el documento se sirva en /api/handler.
// Apuntá el handler de Bitrix a:  https://TU-APP.vercel.app/api/handler
export default async function handler(req, res) {
  res.setHeader("Content-Security-Policy",
    "frame-ancestors 'self' https://*.bitrix24.com https://*.bitrix24.es https://*.bitrix24.mx https://*.bitrix24.ru");
  try {
    let html = await fetch(`https://${req.headers.host}/index.html`).then((r) => r.text());
    // Forzar que los recursos relativos (assets/...) se resuelvan desde la raíz.
    if (!/<base\s/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, (m) => `${m}<base href="/">`);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send('<!doctype html><meta charset="utf-8"><script>location.replace("/index.html")</script>');
  }
}
