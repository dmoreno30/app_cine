// Handler de la raíz para apps embebidas en Bitrix24.
// Bitrix carga la app con POST; un sitio estático devolvería 405. Esta función
// responde el HTML de la SPA en CUALQUIER método (GET o POST), así el iframe
// carga bien. La autenticación la re-establece el SDK BX24 desde el frame padre.
export default async function handler(req, res) {
  try {
    const host = req.headers.host;
    // Traemos el index.html estático (esto NO está reescrito, así que no hay bucle)
    const r = await fetch(`https://${host}/index.html`);
    const html = await r.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send('<!doctype html><meta charset="utf-8"><script>location.replace("/index.html")</script>');
  }
}
