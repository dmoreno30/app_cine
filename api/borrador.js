// ============================================================================
//  api/borrador.js — Persistencia del iCINE/T24 en una Lista de Bitrix24
//  La app corre en un sitio (prueba) y guarda en OTRO sitio (producción) vía
//  webhook de producción. Por eso las llamadas van por webhook y no por BX24.
// ============================================================================
//  Único SECRETO → variable de entorno del servidor (NO va a Git):
const WEBHOOK = process.env.BITRIX_WEBHOOK;

//  IDs de la Lista (NO secretos) → constantes en el código:
const IBLOCK_TYPE_ID = "lists";
const IBLOCK_ID = "534";                // ← ID de la Lista (producción)

const PROP_PROYECTO = "PROPERTY_2397";  // proyectoID
const PROP_NOMBRE_PROY = "PROPERTY_2402"; // Nombre de proyecto
const PROP_TIPO = "PROPERTY_2398";      // Tipo de implementación (lista)
const PROP_JEFE = "PROPERTY_2399";      // Jefe de proyecto (empleado)
const PROP_JSON = "PROPERTY_2400";      // respuestas (texto largo) ← el borrador
const PROP_STATUS = "PROPERTY_2401";    // Status (lista)

const TIPO = { icine: "3099", t24: "3100" };
const STATUS = { borrador: "3101", desarrollo: "3102" };

async function callBitrix(method, params) {
  if (!WEBHOOK) throw new Error("Falta BITRIX_WEBHOOK");
  const url = `${WEBHOOK.replace(/\/?$/, "/")}${method}.json`;
  const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
  const data = await resp.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description || ""}`);
  return data.result;
}
function val(p) {
  if (p == null) return "";
  if (typeof p === "string") return p;
  if (typeof p === "object") { const v = Object.values(p); return v.length ? v[0] : ""; }
  return "";
}
function armarFields({ nombre, proyectoId, nombreProyecto, jefeId, borrador, tipo, status }) {
  const f = {};
  f.NAME = nombre || `iCINE — ${(borrador && borrador.cliente) || "en creación"}`;
  f[PROP_PROYECTO] = String(proyectoId == null ? "" : proyectoId);
  if (nombreProyecto != null) f[PROP_NOMBRE_PROY] = String(nombreProyecto);
  if (jefeId) f[PROP_JEFE] = String(jefeId);
  f[PROP_JSON] = JSON.stringify(borrador || {});
  f[PROP_TIPO] = TIPO[tipo] || TIPO.icine;
  f[PROP_STATUS] = STATUS[status] || STATUS.borrador;
  return f;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, mensaje: "Método no permitido" });
  const b = req.body || {};
  const { action } = b;
  try {
    if (action === "fields") {
      const result = await callBitrix("lists.field.get", { IBLOCK_TYPE_ID, IBLOCK_ID });
      return res.json({ ok: true, campos: Object.entries(result || {}).map(([code, f]) => ({ code, nombre: f.NAME, tipo: f.TYPE })) });
    }
    if (action === "list") {
      if (!b.proyectoId) return res.status(400).json({ ok: false, mensaje: "Falta proyectoId." });
      const FILTER = { ["=" + PROP_PROYECTO]: String(b.proyectoId) };
      if (b.soloBorradores !== false) FILTER["=" + PROP_STATUS] = STATUS.borrador;
      const result = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER, SELECT: ["ID", "NAME", PROP_TIPO, PROP_STATUS, PROP_PROYECTO] });
      const items = (Array.isArray(result) ? result : Object.values(result || {})).map((el) => ({
        id: el.ID, nombre: el.NAME,
        tipo: val(el[PROP_TIPO]) === TIPO.t24 ? "t24" : "icine",
        status: val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador"
      }));
      return res.json({ ok: true, items });
    }
    if (action === "create") {
      if (!b.proyectoId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del proyecto." });
      const FIELDS = armarFields({ nombre: b.nombre, proyectoId: b.proyectoId, nombreProyecto: b.nombreProyecto, jefeId: b.responsableId, borrador: b.borrador || {}, tipo: b.tipo || "icine", status: "borrador" });
      const newId = await callBitrix("lists.element.add", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_CODE: `dev_${Date.now()}`, FIELDS });
      return res.json({ ok: true, elementId: newId });
    }
    if (action === "save") {
      if (!b.elementId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del registro." });
      const FIELDS = armarFields({ nombre: b.nombre, proyectoId: b.proyectoId, nombreProyecto: b.nombreProyecto, jefeId: b.responsableId, borrador: b.borrador || {}, tipo: b.tipo || "icine", status: b.status || "borrador" });
      await callBitrix("lists.element.update", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: b.elementId, FIELDS });
      return res.json({ ok: true, elementId: b.elementId });
    }
    if (action === "load") {
      if (!b.elementId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del registro." });
      const result = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER: { ID: b.elementId } });
      const el = Array.isArray(result) ? result[0] : (result && Object.values(result)[0]);
      if (!el) return res.status(404).json({ ok: false, mensaje: "No se encontró ese desarrollo." });
      let draft = null;
      try { draft = JSON.parse(val(el[PROP_JSON])); } catch { draft = null; }
      return res.json({ ok: true, elementId: el.ID, nombre: el.NAME, proyectoId: val(el[PROP_PROYECTO]), tipo: val(el[PROP_TIPO]) === TIPO.t24 ? "t24" : "icine", status: val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador", borrador: draft });
    }
    return res.status(400).json({ ok: false, mensaje: "Acción no reconocida (list / create / save / load / fields)." });
  } catch (err) {
    console.error("borrador.js error:", err.message);
    return res.status(500).json({ ok: false, mensaje: "No se pudo conectar con Bitrix24. Revisá la configuración." });
  }
}
