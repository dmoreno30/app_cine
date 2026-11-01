// Lectura de contexto desde Bitrix24 (app embebida y REGISTRADA como app local).
// Devuelve: proyectoId (placement), usuario actual (desarrollador),
// proyectoNombre y jefeId (propietario del grupo) vía sonet_group.get.
export function enBitrix() {
  return typeof window !== "undefined" && typeof window.BX24 !== "undefined";
}
export function initBitrix() {
  return new Promise((resolve) => {
    if (!enBitrix()) return resolve(false);
    try { window.BX24.init(() => resolve(true)); } catch (e) { resolve(false); }
  });
}
function call(method, params) {
  return new Promise((resolve) => {
    try {
      window.BX24.callMethod(method, params, (r) => resolve((r && !r.error()) ? r.data() : null));
    } catch (e) { resolve(null); }
  });
}
export async function obtenerContextoBX() {
  if (!enBitrix()) return { proyectoId: null, usuario: null, proyectoNombre: "", jefeId: "", esExtranet: false };
  let proyectoId = null;
  try {
    const info = window.BX24.placement.info() || {};
    const o = info.options || {};
    proyectoId = o.groupId || o.GROUP_ID || o.group_id || o.ID || o.id || null;
  } catch (e) { /* sin placement */ }

  const u = await call("user.current", {});
  const usuario = u ? { id: u.ID, nombre: `${u.NAME || ""} ${u.LAST_NAME || ""}`.trim() } : null;

  // Extranet: USER_TYPE === "extranet". user.current no siempre lo trae,
  // así que si falta lo consultamos con user.get por ID.
  let esExtranet = false;
  try {
    let userType = u && u.USER_TYPE;
    if (userType === undefined && u && u.ID) {
      const ug = await call("user.get", { FILTER: { ID: u.ID } });
      const uu = Array.isArray(ug) ? ug[0] : (ug && Object.values(ug)[0]);
      userType = uu && uu.USER_TYPE;
    }
    esExtranet = String(userType || "").toLowerCase() === "extranet";
  } catch (e) { esExtranet = false; }

  let proyectoNombre = "", jefeId = "", jefeNombre = "";
  if (proyectoId) {
    const g = await call("sonet_group.get", { FILTER: { ID: proyectoId } });
    const grupo = Array.isArray(g) ? g[0] : (g && Object.values(g)[0]);
    if (grupo) { proyectoNombre = grupo.NAME || ""; jefeId = grupo.OWNER_ID || ""; }
    if (jefeId) {
      const ju = await call("user.get", { ID: jefeId });
      const j = Array.isArray(ju) ? ju[0] : (ju && Object.values(ju)[0]);
      if (j) jefeNombre = `${j.NAME || ""} ${j.LAST_NAME || ""}`.trim();
    }
  }
  return { proyectoId, usuario, proyectoNombre, jefeId, jefeNombre, esExtranet };
}
