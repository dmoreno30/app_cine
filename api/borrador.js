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
const PROP_FORM          = "PROPERTY_2411"; // Estado del formulario del cliente (lista)

const TIPO = { icine: "3099", t24: "3100" };
const STATUS = { borrador: "3101", desarrollo: "3102" };
const FORM = { pendiente: "3128", enviado: "3129" }; // estado del formulario (extranet)
// Tolerante: Bitrix Listas puede devolver el CÓDIGO (3128/3129) o el TEXTO del valor
// ("pendiente" / "enviado-bloqueado"), según el campo. Normalizamos ambos.
function formKeyRobusto(raw) {
  const k = formKey(raw);
  if (k) return k;
  return String(raw == null ? "" : raw).trim() ? "pendiente" : "";
}
function formKey(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!s) return "";
  if (s === FORM.enviado || s.includes("envi") || s.includes("bloque")) return "enviado";
  if (s === FORM.pendiente || s.includes("pend")) return "pendiente";
  return "";
}

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
  if (typeof p === "string" || typeof p === "number") return String(p);
  if (typeof p === "object") {
    const v = Object.values(p);
    let first = v.length ? v[0] : "";
    if (first && typeof first === "object") { const vv = Object.values(first); first = vv.length ? vv[0] : ""; }
    return first == null ? "" : String(first);
  }
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
  // Estado de formulario (campo de tipo lista): se envía como arreglo de IDs del valor
  // (ver doc lists.element.add). Solo se escribe cuando se indica explícitamente,
  // para no pisarlo en guardados normales del desarrollador.
  if (b.formStatus && FORM[b.formStatus]) f[PROP_FORM] = [FORM[b.formStatus]];
  return f;
}
// Lee el estado de formulario actual de un elemento (o "" si no es formulario).
async function leerFormStatus(elementId) {
  const r = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER: { ID: elementId }, SELECT: ["ID", PROP_FORM] });
  const el = Array.isArray(r) ? r[0] : (r && Object.values(r)[0]);
  return el ? formKey(val(el[PROP_FORM])) : "";
}

// Lee el elemento completo (todos los campos que debemos preservar en un update).
async function leerElemento(elementId) {
  const r = await callBitrix("lists.element.get", {
    IBLOCK_TYPE_ID, IBLOCK_ID, FILTER: { ID: elementId },
    SELECT: ["ID", "NAME", PROP_PROYECTO, PROP_NE_TEXTO, PROP_TIPO, PROP_JEFE, PROP_DESARROLLADOR, PROP_STATUS, PROP_FORM]
  });
  return Array.isArray(r) ? r[0] : (r && Object.values(r)[0]);
}

// IMPORTANTE: lists.element.update SOBRESCRIBE todo el elemento y borra lo que no se
// envía. Por eso, para un guardado parcial (cliente, o envío) hay que reconstruir
// TODOS los campos a partir del elemento actual. Los campos de tipo lista
// (TIPO, STATUS, FORM) se escriben como arreglo de IDs de enum.
function camposDesde(el) {
  const tipoKey = val(el[PROP_TIPO]) === TIPO.t24 ? "t24" : "icine";
  const statusKey = val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador";
  const fields = {
    NAME: el.NAME || "Formulario iCINE",
    [PROP_PROYECTO]: val(el[PROP_PROYECTO]),
    [PROP_NE_TEXTO]: val(el[PROP_NE_TEXTO]),
    [PROP_TIPO]: TIPO[tipoKey],
    [PROP_STATUS]: STATUS[statusKey]
  };
  const jefe = val(el[PROP_JEFE]); if (jefe) fields[PROP_JEFE] = jefe;
  const dev = val(el[PROP_DESARROLLADOR]); if (dev) fields[PROP_DESARROLLADOR] = dev;
  const fs = formKey(val(el[PROP_FORM])); if (fs) fields[PROP_FORM] = [FORM[fs]];
  return { fields, formStatus: fs };
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
      const r = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER, SELECT: ["ID", "NAME", PROP_NE_TEXTO, PROP_TIPO, PROP_STATUS, PROP_FORM] });
      const items = (Array.isArray(r) ? r : Object.values(r || {})).map((el) => ({
        id: el.ID, nombre: el.NAME, neTexto: val(el[PROP_NE_TEXTO]),
        tipo: val(el[PROP_TIPO]) === TIPO.t24 ? "t24" : "icine",
        status: val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador",
        formStatus: formKeyRobusto(val(el[PROP_FORM]))
      }));
      return res.json({ ok: true, items });
    }
    // Formularios del proyecto (vista del cliente extranet): solo registros con formulario.
    if (b.action === "listForms") {
      if (!b.proyectoId) return res.status(400).json({ ok: false, mensaje: "Falta proyectoId." });
      const FILTER = { ["=" + PROP_PROYECTO]: String(b.proyectoId) };
      const r = await callBitrix("lists.element.get", { IBLOCK_TYPE_ID, IBLOCK_ID, FILTER, SELECT: ["ID", "NAME", PROP_NE_TEXTO, PROP_FORM] });
      const items = (Array.isArray(r) ? r : Object.values(r || {}))
        .map((el) => ({ id: el.ID, nombre: el.NAME, neTexto: val(el[PROP_NE_TEXTO]), formStatus: formKeyRobusto(val(el[PROP_FORM])) }))
        .filter((x) => x.formStatus); // solo los que tienen formulario habilitado
      return res.json({ ok: true, items });
    }
    if (b.action === "create") {
      if (!b.proyectoId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del proyecto." });
      // Si se crea "Formulario + iCINE", el formulario nace en estado pendiente.
      const fields = armarFields({ ...b, status: "borrador", formStatus: b.conFormulario ? "pendiente" : null });
      const newId = await callBitrix("lists.element.add", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_CODE: `dev_${Date.now()}`, FIELDS: fields });
      return res.json({ ok: true, elementId: newId });
    }
    if (b.action === "save") {
      if (!b.elementId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del registro." });
      // Guardado del cliente (extranet): cambia solo el JSON, pero reenviando TODOS
      // los demás campos (si no, el update los borra, p. ej. NAME → error de Bitrix).
      if (b.origen === "cliente") {
        const el = await leerElemento(b.elementId);
        if (!el) return res.status(404).json({ ok: false, mensaje: "No se encontró el formulario." });
        const { fields, formStatus } = camposDesde(el);
        if (formStatus === "enviado") return res.status(423).json({ ok: false, mensaje: "El formulario ya fue enviado y no se puede editar." });
        fields[PROP_JSON] = JSON.stringify(b.borrador || {});
        await callBitrix("lists.element.update", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: b.elementId, FIELDS: fields });
        return res.json({ ok: true, elementId: b.elementId, formStatus: formStatus || "pendiente" });
      }
      // Guardado del desarrollador: reenvía todos los campos y preserva PROP_FORM
      // leyendo el actual (el update borra lo que no se envíe).
      const fields = armarFields(b);
      if (!fields[PROP_FORM]) {
        try { const el = await leerElemento(b.elementId); const fs = el ? formKey(val(el[PROP_FORM])) : ""; if (fs) fields[PROP_FORM] = [FORM[fs]]; } catch (e) { /* si falla la lectura, seguimos */ }
      }
      await callBitrix("lists.element.update", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: b.elementId, FIELDS: fields });
      return res.json({ ok: true, elementId: b.elementId });
    }
    // Envío final del cliente: consolida el JSON y bloquea (enviado).
    if (b.action === "enviar") {
      if (!b.elementId) return res.status(400).json({ ok: false, mensaje: "Falta el ID del registro." });
      const el = await leerElemento(b.elementId);
      if (!el) return res.status(404).json({ ok: false, mensaje: "No se encontró el formulario." });
      const { fields, formStatus } = camposDesde(el);
      if (formStatus === "enviado") return res.status(423).json({ ok: false, mensaje: "El formulario ya fue enviado." });
      fields[PROP_JSON] = JSON.stringify(b.borrador || {});
      fields[PROP_FORM] = [FORM.enviado];  // reenvía todo + bloquea
      await callBitrix("lists.element.update", { IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: b.elementId, FIELDS: fields });
      return res.json({ ok: true, elementId: b.elementId, formStatus: "enviado" });
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
        status: val(el[PROP_STATUS]) === STATUS.desarrollo ? "desarrollo" : "borrador",
        formStatus: formKeyRobusto(val(el[PROP_FORM])), borrador: draft });
    }
    return res.status(400).json({ ok: false, mensaje: "Acción no reconocida." });
  } catch (err) {
    console.error("borrador.js error:", err && err.message);
    // Devolvemos el detalle real de Bitrix para poder diagnosticar en vez de un mensaje genérico.
    return res.status(500).json({ ok: false, mensaje: "Bitrix: " + ((err && err.message) || "error desconocido") });
  }
}
