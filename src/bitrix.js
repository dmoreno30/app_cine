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

  // Tipo de usuario: empleado (intranet / consultor) vs extranet (cliente).
  // Es un control de VISIBILIDAD: el extranet SOLO debe ver sus formularios.
  // Por eso la lógica es "fail-safe": tratamos al usuario como extranet salvo que
  // podamos CONFIRMAR que es empleado (USER_TYPE "employee" o pertenece a un
  // departamento). Ante cualquier duda o error → extranet (solo formularios).
  let esExtranet = true;
  try {
    let userType = u && u.USER_TYPE;
    let dept = u && u.UF_DEPARTMENT;
    if (userType === undefined && u && u.ID) {
      const ug = await call("user.get", { FILTER: { ID: u.ID } });
      const uu = Array.isArray(ug) ? ug[0] : (ug && Object.values(ug)[0]);
      if (uu) { userType = uu.USER_TYPE; if (dept === undefined) dept = uu.UF_DEPARTMENT; }
    }
    const tipo = String(userType || "").toLowerCase();
    const tieneDepto = Array.isArray(dept) ? dept.filter(Boolean).length > 0 : !!dept;
    // Empleado SOLO si lo confirmamos; extranet/email nunca lo son.
    const esEmpleado = tipo === "employee" || (tipo !== "extranet" && tipo !== "email" && tieneDepto);
    esExtranet = !esEmpleado;
  } catch (e) { esExtranet = true; }

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
