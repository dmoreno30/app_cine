// Lectura de contexto desde Bitrix24 (app embebida). Solo LEE: proyecto y usuario.
// La escritura en la Lista NO va por acá (va por el backend, porque guardamos en
// otro sitio / producción).
export function enBitrix() {
  return typeof window !== "undefined" && typeof window.BX24 !== "undefined";
}
export function initBitrix() {
  return new Promise((resolve) => {
    if (!enBitrix()) return resolve(false);
    try { window.BX24.init(() => resolve(true)); } catch (e) { resolve(false); }
  });
}
export function obtenerContextoBX() {
  return new Promise((resolve) => {
    if (!enBitrix()) return resolve({ proyectoId: null, usuario: null, placement: null });
    let proyectoId = null, placement = null;
    try {
      const info = window.BX24.placement.info() || {};
      placement = info;
      const o = info.options || {};
      proyectoId = o.groupId || o.GROUP_ID || o.group_id || o.ID || o.id || null;
    } catch (e) { /* sin placement */ }
    try {
      window.BX24.callMethod("user.current", {}, (r) => {
        const u = (r && !r.error()) ? r.data() : null;
        resolve({ proyectoId, placement, usuario: u ? { id: u.ID, nombre: `${u.NAME || ""} ${u.LAST_NAME || ""}`.trim() } : null });
      });
    } catch (e) { resolve({ proyectoId, placement, usuario: null }); }
  });
}
