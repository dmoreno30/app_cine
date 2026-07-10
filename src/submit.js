// Ruta relativa: en Vercel, /api/captura.js vive en el mismo dominio que el
// formulario, así que no hace falta configurar CORS ni una URL absoluta.
// En local con `vercel dev`, también funciona igual.
export const SUBMIT_ENDPOINT = "/api/captura";

export async function submitCaptura(json) {
  try {
    const res = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, reason: "rejected", mensaje: data.mensaje || "No se pudo enviar." };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "network_error", error: e.message };
  }
}
