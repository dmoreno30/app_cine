// ============================================================================
//  api/borrador.js — Persistencia del iCINE en la Lista de Bitrix24 (producción)
//  La app corre en el sitio de prueba y guarda en producción vía webhook.
// ============================================================================
const WEBHOOK = process.env.BITRIX_WEBHOOK;          // único secreto (env var)

const IBLOCK_TYPE_ID = "lists";
const IBLOCK_ID = "534";                              // ID de la Lista (producción)

const PROP_PROYECTO      = "PROPERTY_2397"; // ID del proyecto
const PROP_NE_TEXTO      = "PROPERTY_2402"; // Texto de las NE (lo que se ve en el select)
const PROP_TIPO          = "PROPERTY_2398"; // Tipo de implementación (lista)
const PROP_JEFE          = "PROPERTY_2399"; // Jefe de proyecto = propietario del grupo
const PROP_JSON          = "PROPERTY_2400"; // respuestas (JSON del borrador)
const PROP_STATUS        = "PROPERTY_2401"; // Status (lista)
const PROP_DESARROLLADOR = "PROPERTY_2403"; // Desarrollador = usuario actual (nuevo)

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
// Set COMPLETO de campos (update en Listas reemplaza todo).
function armarFields(b) {
  const f = {};
  f.NAME = (b.proyectoNombre || "").trim() || `iCINE — ${(b.borrador && b.borrador.cliente) || "sin nombre"}`;
  f[PROP_PROYECTO] = String(b.proyectoId == null ? "" : b.proyectoId);
  f[PROP_NE_TEXTO] = String(b.neTexto || "");
  if (b.jefeId) f[PROP_JEFE] = String(b.jefeId);
  if (b.desarrolladorId) f[PROP_DESARROLLADOR] = String(b.desarrolladorId);
  f[PROP_JSON] = JSON.stringify(b.borrador || {});
  f[PROP_TIPO] = TIPO[b.tipo] || TIPO.icine;
  f[PROP_STATUS] = STATUS[b.status] || STATUS.borrador;
  return f;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, mensaje: "Método no permitido" });
  const b = req.body || {};
  try {
    if (b.action === "fields") {
      const r = await callBitrix("lists.field.get", { IBLOCK_TYPE_ID, IBLOCK_ID });
      return res.json({ ok: true, campos: Object.entries(r || {}).map(([code, f]) => ({ code, nombre: f.NAME, tipo: f.TYPE })) });
    }
    if (b.action === "list") {
      if (!b.proyectoId) return res.status(400).json({ ok: false, mensaje: "Falta proyectoId." });
      const FILTER = { ["=" + PROP_PROYECTO]: String(b.proyectoId) };
      if (b.soloBorradores !== false) FILTER["=" + PROP_STATUS] = STATUS.borrador;
      const r = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER, SELECT: ["ID", "NAME", PROP_NE_TEXTO, PROP_TIPO, PROP_STATUS] });
      const items = (Array.isArray(r) ? r : Object.values(r || {})).map((el) => ({
        id: el.ID, nombre: el.NAME, neTexto: val(el[PROP_NE_TEXTO]),
        tipo: val(el[PROP_TIPO]) === TIPO.t24 ? "t24" : "icine",
        status: val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador"
      }));
      return res.json({ ok: true, items });
    }
    if (b.action === "create") {
      if (!b.proyectoId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del proyecto." });
      const newId = await callBitrix("lists.element.add", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_CODE: `dev_${Date.now()}`, FIELDS: armarFields({ ...b, status: "borrador" }) });
      return res.json({ ok: true, elementId: newId });
    }
    if (b.action === "save") {
      if (!b.elementId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del registro." });
      await callBitrix("lists.element.update", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: b.elementId, FIELDS: armarFields(b) });
      return res.json({ ok: true, elementId: b.elementId });
    }
    if (b.action === "load") {
      if (!b.elementId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del registro." });
      const r = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER: { ID: b.elementId } });
      const el = Array.isArray(r) ? r[0] : (r && Object.values(r)[0]);
      if (!el) return res.status(404).json({ ok: false, mensaje: "No se encontró ese desarrollo." });
      let draft = null; try { draft = JSON.parse(val(el[PROP_JSON])); } catch { draft = null; }
      return res.json({ ok: true, elementId: el.ID, nombre: el.NAME, neTexto: val(el[PROP_NE_TEXTO]),
        proyectoId: val(el[PROP_PROYECTO]),
        tipo: val(el[PROP_TIPO]) === TIPO.t24 ? "t24" : "icine",
        status: val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador", borrador: draft });
    }
    return res.status(400).json({ ok: false, mensaje: "Acción no reconocida." });
  } catch (err) {
    console.error("borrador.js error:", err.message);
    return res.status(500).json({ ok: false, mensaje: "No se pudo conectar con Bitrix24." });
  }
}
