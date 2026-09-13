// ============================================================================
//  src/bitrix.js — Capa de integración con Bitrix24 (app embebida, vía BX24)
// ============================================================================
//  Toda la lectura/escritura de la Lista pasa por acá. Las llamadas van con
//  BX24.callMethod, que corre COMO EL USUARIO LOGUEADO (no un webhook), así
//  que "Creado por" queda correcto. Igualmente capturamos user.current y lo
//  guardamos dentro del registro para tener el dato explícito.
//
//  IDs de la Lista (no son secretos → constantes acá):
const IBLOCK_TYPE_ID = "lists";
const IBLOCK_ID = "REEMPLAZAR_ID_LISTA";   // ← completar con el ID de la Lista
const PROP = {
  proyecto:   "PROPERTY_2397",  // proyectoID
  nombreProy: "PROPERTY_2402",  // Nombre de proyecto
  tipo:       "PROPERTY_2398",  // Tipo de implementación (lista)
  jefe:       "PROPERTY_2399",  // Jefe de proyecto (empleado)
  json:       "PROPERTY_2400",  // respuestas (texto largo)
  status:     "PROPERTY_2401"   // Status (lista)
};
const TIPO = { icine: "3099", t24: "3100" };
const STATUS = { borrador: "3101", desarrollo: "3102" };

// ¿Estamos dentro de Bitrix24? (el SDK BX24 solo existe embebido)
export function enBitrix() {
  return typeof window !== "undefined" && typeof window.BX24 !== "undefined";
}

export function initBitrix() {
  return new Promise((resolve) => {
    if (!enBitrix()) return resolve(false);
    window.BX24.init(() => resolve(true));
  });
}

// Envuelve BX24.callMethod en promesa (maneja paginación simple con .next()).
function call(method, params) {
  return new Promise((resolve, reject) => {
    window.BX24.callMethod(method, params, (r) => {
      if (r.error()) reject(new Error(r.error().ex ? r.error().ex.error_description : r.error()));
      else resolve(r.data());
    });
  });
}
function val(p) {
  if (p == null) return "";
  if (typeof p === "string") return p;
  if (typeof p === "object") { const v = Object.values(p); return v.length ? v[0] : ""; }
  return "";
}

// Contexto: proyecto (placement) + usuario actual + nombre/jefe del grupo.
export async function obtenerContexto() {
  const info = window.BX24.placement.info() || {};
  const opt = info.options || {};
  // El código exacto del ID de grupo depende del placement; probamos los usuales.
  const proyectoId = opt.groupId || opt.GROUP_ID || opt.group_id || opt.ID || null;

  const usuario = await call("user.current", {});
  let proyectoNombre = "", jefeId = "";
  if (proyectoId) {
    try {
      const grupos = await call("sonet_group.get", { FILTER: { ID: proyectoId } });
      const g = Array.isArray(grupos) ? grupos[0] : (grupos && Object.values(grupos)[0]);
      if (g) { proyectoNombre = g.NAME || ""; jefeId = g.OWNER_ID || ""; }
    } catch (e) { /* si no hay permiso o no es grupo, seguimos sin nombre/jefe */ }
  }
  return {
    proyectoId,
    proyectoNombre,
    jefeId,
    usuario: usuario ? { id: usuario.ID, nombre: `${usuario.NAME || ""} ${usuario.LAST_NAME || ""}`.trim() } : null
  };
}

// Lista los desarrollos del proyecto (por defecto solo en Borrador).
export async function listarDesarrollos(proyectoId, soloBorradores = true) {
  const FILTER = { ["=" + PROP.proyecto]: String(proyectoId) };
  if (soloBorradores) FILTER["=" + PROP.status] = STATUS.borrador;
  const r = await call("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER, SELECT: ["ID", "NAME", PROP.tipo, PROP.status] });
  const arr = Array.isArray(r) ? r : Object.values(r || {});
  return arr.map((el) => ({
    id: el.ID, nombre: el.NAME,
    tipo: val(el[PROP.tipo]) === TIPO.t24 ? "t24" : "icine",
    status: val(el[PROP.status]) === STATUS.desarrollo ? "desarrollo" : "borrador"
  }));
}

function armarFields({ nombre, ctx, tipo, borrador, status }) {
  return {
    NAME: nombre,
    [PROP.proyecto]: String(ctx.proyectoId || ""),
    [PROP.nombreProy]: String(ctx.proyectoNombre || ""),
    [PROP.jefe]: String(ctx.jefeId || ""),
    [PROP.tipo]: TIPO[tipo] || TIPO.icine,
    [PROP.status]: STATUS[status] || STATUS.borrador,
    [PROP.json]: JSON.stringify(borrador || {})
  };
}

// Crea un desarrollo nuevo → devuelve el ID del elemento.
export async function crearDesarrollo({ nombre, ctx, tipo, borrador }) {
  const FIELDS = armarFields({ nombre, ctx, tipo, borrador, status: "borrador" });
  return call("lists.element.add", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_CODE: `dev_${Date.now()}`, FIELDS });
}

// Guarda (update) reenviando TODOS los campos (así funcionan las Listas).
export async function guardarDesarrollo({ elementId, nombre, ctx, tipo, borrador, status }) {
  const FIELDS = armarFields({ nombre, ctx, tipo, borrador, status: status || "borrador" });
  await call("lists.element.update", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: elementId, FIELDS });
  return elementId;
}

// Carga un desarrollo por su ID.
export async function cargarDesarrollo(elementId) {
  const r = await call("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER: { ID: elementId } });
  const el = Array.isArray(r) ? r[0] : (r && Object.values(r)[0]);
  if (!el) return null;
  let borrador = null;
  try { borrador = JSON.parse(val(el[PROP.json])); } catch { borrador = null; }
  return {
    elementId: el.ID, nombre: el.NAME,
    tipo: val(el[PROP.tipo]) === TIPO.t24 ? "t24" : "icine",
    status: val(el[PROP.status]) === STATUS.desarrollo ? "desarrollo" : "borrador",
    borrador
  };
}
