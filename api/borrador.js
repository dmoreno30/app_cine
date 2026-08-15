// ============================================================================
//  api/borrador.js — Guardar / retomar el borrador en una Lista de Bitrix24
// ============================================================================
//
//  QUÉ HACE
//  - action "save":  crea el registro la primera vez (devuelve su ID) o, si ya
//                    tiene ID, actualiza el mismo registro con el JSON al día.
//  - action "load":  dado el ID del registro, devuelve el JSON del borrador y
//                    el ID del proyecto/grupo, para rehidratar el formulario.
//
//  LISTA DE BITRIX24 — campos a crear (una sola vez, en Bitrix24):
//    · Nombre            (NAME, nativo)
//    · ID                (ID, nativo — es el "código para continuar")
//    · Creador           (CREATED_BY, nativo)
//    · Responsable       (propiedad tipo Usuario)
//    · JSON del borrador  (propiedad tipo "cadena / texto" MULTILÍNEA)
//    · ID del proyecto    (propiedad tipo cadena, requerido)
//
//  VARIABLES DE ENTORNO EN VERCEL (no pongas secretos en el código):
//    BITRIX_WEBHOOK          URL del webhook entrante (.../rest/<uid>/<code>/)
//    BITRIX_IBLOCK_TYPE_ID   normalmente "lists"  (o "bitrix_processes")
//    BITRIX_IBLOCK_ID        el ID de la Lista creada
//    BITRIX_PROP_JSON        código de la propiedad "JSON del borrador"
//    BITRIX_PROP_PROYECTO    código de la propiedad "ID del proyecto"
//    BITRIX_PROP_RESPONSABLE código de la propiedad "Responsable"
//    BITRIX_RESPONSABLE_DEFAULT  (opcional) ID de usuario por defecto
//
//  El webhook vive SOLO en el servidor (esta función). El navegador nunca lo ve.
// ============================================================================

const WEBHOOK = process.env.BITRIX_WEBHOOK;
const IBLOCK_TYPE_ID = process.env.BITRIX_IBLOCK_TYPE_ID || "lists";
const IBLOCK_ID = process.env.BITRIX_IBLOCK_ID;
const PROP_JSON = process.env.BITRIX_PROP_JSON;
const PROP_PROYECTO = process.env.BITRIX_PROP_PROYECTO;
const PROP_RESPONSABLE = process.env.BITRIX_PROP_RESPONSABLE;
const RESPONSABLE_DEFAULT = process.env.BITRIX_RESPONSABLE_DEFAULT || "";

async function callBitrix(method, params) {
  if (!WEBHOOK) throw new Error("Falta BITRIX_WEBHOOK");
  const url = `${WEBHOOK.replace(/\/?$/, "/")}${method}.json`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = await resp.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description || ""}`);
  return data.result;
}

// Los valores de propiedad vienen como { idValor: valor }. Tomamos el primero.
function primerValor(prop) {
  if (prop == null) return "";
  if (typeof prop === "string") return prop;
  if (typeof prop === "object") { const v = Object.values(prop); return v.length ? v[0] : ""; }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, mensaje: "Método no permitido" });
  }
  if (!IBLOCK_ID || !PROP_JSON) {
    return res.status(500).json({ ok: false, mensaje: "Persistencia no configurada (faltan variables de entorno de Bitrix24)." });
  }

  const { action, elementId, proyectoId, responsableId, nombre, borrador } = req.body || {};

  try {
    // ---------------- LOAD: retomar por ID de registro ----------------
    if (action === "load") {
      if (!elementId) return res.status(400).json({ ok: false, mensaje: "Falta el número de registro." });
      const result = await callBitrix("lists.element.get", {
        IBLOCK_TYPE_ID, IBLOCK_ID, FILTER: { ID: elementId }
      });
      const el = Array.isArray(result) ? result[0] : (result && result[0]);
      if (!el) return res.status(404).json({ ok: false, mensaje: "No se encontró un borrador con ese número." });

      const jsonStr = primerValor(el[`PROPERTY_${PROP_JSON}`] ?? el[PROP_JSON]);
      let draft = null;
      try { draft = JSON.parse(jsonStr); } catch { draft = null; }
      const proyecto = primerValor(el[`PROPERTY_${PROP_PROYECTO}`] ?? el[PROP_PROYECTO]);

      return res.json({ ok: true, elementId: el.ID, proyectoId: proyecto, borrador: draft });
    }

    // ---------------- SAVE: crear o actualizar ----------------
    if (action === "save") {
      if (!borrador) return res.status(400).json({ ok: false, mensaje: "Falta el borrador a guardar." });

      const FIELDS = { NAME: nombre || `Borrador iCINE — ${borrador.cliente || "sin nombre"}` };
      FIELDS[`PROPERTY_${PROP_JSON}`] = JSON.stringify(borrador);
      if (PROP_PROYECTO && proyectoId != null) FIELDS[`PROPERTY_${PROP_PROYECTO}`] = String(proyectoId);
      if (PROP_RESPONSABLE) FIELDS[`PROPERTY_${PROP_RESPONSABLE}`] = String(responsableId || RESPONSABLE_DEFAULT || "");

      if (elementId) {
        await callBitrix("lists.element.update", {
          IBLOCK_TYPE_ID, IBLOCK_ID, ELEMENT_ID: elementId, FIELDS
        });
        return res.json({ ok: true, elementId });
      }

      const newId = await callBitrix("lists.element.add", { IBLOCK_TYPE_ID, IBLOCK_ID, FIELDS });
      return res.json({ ok: true, elementId: newId });
    }

    return res.status(400).json({ ok: false, mensaje: "Acción no reconocida (usá 'save' o 'load')." });
  } catch (err) {
    console.error("borrador.js error:", err.message);
    return res.status(500).json({ ok: false, mensaje: "No se pudo conectar con Bitrix24. Revisá la configuración." });
  }
}
