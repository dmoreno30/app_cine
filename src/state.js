import { CANALES, ENTIDADES, MONEDAS } from "./data/config.js";
import { REPORTES_PROSPECTOS, REPORTES_NEGOCIACIONES } from "./data/reportes.js";

const STORAGE_KEY = "icine_captura_draft_v2";

function defaultPipelineEntity() {
  return {
    etapasProgreso: [""],
    etapasFallo: [""],
    camposPersonalizados: [{ nombre: "", tipo: "Texto" }],
    automatizacion: "",
    flujo: ""
  };
}
function defaultSimpleEntity() {
  return { camposPersonalizados: [{ nombre: "", tipo: "Texto" }] };
}
function defaultPostventaEntity() {
  return { facturaERP: false, erpNombre: "", deseaIntegracion: false, detalleIntegracion: "", procesoDescripcion: "" };
}

export function defaultState() {
  const canales = {};
  CANALES.forEach((c) => { canales[c.key] = false; });

  const entidadesHabilitadas = {};
  const entidades = {};
  Object.keys(ENTIDADES).forEach((key) => {
    const cfg = ENTIDADES[key];
    // Las obligatorias siempre están habilitadas; las opcionales arrancan en false
    // salvo Prospectos, que es la más común (ajustable por el cliente).
    entidadesHabilitadas[key] = cfg.obligatorio ? true : (key === "prospectos");

    if (cfg.type === "pipeline") {
      entidades[key] = defaultPipelineEntity();
      if (key === "cotizaciones") {
        entidades[key].origenExterno = { usaOtroSoftware: false, cual: "", continuidad: "" };
      }
    } else if (cfg.type === "simple") {
      entidades[key] = defaultSimpleEntity();
    } else if (cfg.type === "postventa") {
      entidades[key] = defaultPostventaEntity();
    }
  });

  return {
    cliente: "",
    ne: { descripcion: "" },
    empresa: {
      tipoProductos: "",
      monedas: Object.fromEntries(MONEDAS.map((m) => [m.key, false])),
      otrasMonedas: "",
      impuestos: []
    },
    captacion: {
      canales, otros: "", distribucion: "",
      paginawebUrl: "", tiendavirtualUrl: "",
      chatbot: { necesita: false, descripcion: "" }
    },
    entidadesHabilitadas,
    entidades,
    reporteria: {
      prospectos: Object.fromEntries(REPORTES_PROSPECTOS.map((r) => [r.key, false])),
      negociaciones: Object.fromEntries(REPORTES_NEGOCIACIONES.map((r) => [r.key, false])),
      otros: ""
    }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    const parsedEntidades = parsed.entidades || {};
    const entidades = {};
    Object.keys(base.entidades).forEach((key) => {
      entidades[key] = { ...base.entidades[key], ...(parsedEntidades[key] || {}) };
      if (base.entidades[key].origenExterno) {
        entidades[key].origenExterno = {
          ...base.entidades[key].origenExterno,
          ...((parsedEntidades[key] || {}).origenExterno || {})
        };
      }
    });

    return {
      ...base,
      ...parsed,
      ne: { ...base.ne, ...(parsed.ne || {}) },
      empresa: {
        ...base.empresa,
        ...(parsed.empresa || {}),
        monedas: { ...base.empresa.monedas, ...((parsed.empresa || {}).monedas || {}) },
        impuestos: Array.isArray((parsed.empresa || {}).impuestos) ? parsed.empresa.impuestos : base.empresa.impuestos
      },
      captacion: {
        ...base.captacion,
        ...(parsed.captacion || {}),
        canales: { ...base.captacion.canales, ...((parsed.captacion || {}).canales || {}) },
        chatbot: { ...base.captacion.chatbot, ...((parsed.captacion || {}).chatbot || {}) }
      },
      entidadesHabilitadas: { ...base.entidadesHabilitadas, ...(parsed.entidadesHabilitadas || {}) },
      entidades,
      reporteria: {
        ...base.reporteria,
        ...(parsed.reporteria || {}),
        prospectos: { ...base.reporteria.prospectos, ...((parsed.reporteria || {}).prospectos || {}) },
        negociaciones: { ...base.reporteria.negociaciones, ...((parsed.reporteria || {}).negociaciones || {}) }
      }
    };
  } catch (e) {
    console.warn("No se pudo leer el borrador guardado:", e);
    return defaultState();
  }
}

let saveTimer = null;
export function scheduleSave(state, onStatus) {
  if (onStatus) onStatus("Guardando…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (onStatus) onStatus("Guardado " + new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      console.error("Error guardando el borrador:", e);
      if (onStatus) onStatus("No se pudo guardar localmente");
    }
  }, 400);
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultState();
}

function cleanStages(arr) { return arr.map((s) => s.trim()).filter(Boolean); }
function cleanFields(arr) { return arr.filter((f) => f.nombre.trim()).map((f) => ({ nombre: f.nombre.trim(), tipo: f.tipo })); }

export function buildCanonicalJSON(state) {
  const out = {
    cliente: state.cliente.trim(),
    necesidadEspecifica: {
      descripcion: state.ne.descripcion.trim()
    },
    // Datos de "Sobre la empresa". Se capturan y guardan, pero el generador
    // (lib/build.js) todavía no los muestra en el iCINE — se hará más adelante.
    empresa: {
      tipoProductos: state.empresa.tipoProductos.trim(),
      monedas: Object.keys(state.empresa.monedas).filter((k) => state.empresa.monedas[k]),
      otrasMonedas: state.empresa.otrasMonedas.trim(),
      impuestos: state.empresa.impuestos
        .filter((t) => (t.nombre || "").trim())
        .map((t) => ({ nombre: t.nombre.trim(), porcentaje: String(t.porcentaje == null ? "" : t.porcentaje).trim() }))
    },
    captacionDeClientes: {
      canales: Object.keys(state.captacion.canales).filter((k) => state.captacion.canales[k]),
      otrosCanales: state.captacion.otros.trim(),
      distribucion: state.captacion.distribucion.trim(),
      paginawebUrl: state.captacion.paginawebUrl.trim(),
      tiendavirtualUrl: state.captacion.tiendavirtualUrl.trim(),
      chatbot: {
        necesita: !!state.captacion.chatbot.necesita,
        descripcion: state.captacion.chatbot.descripcion.trim()
      }
    },
    procesoComercial: { entidades: {} }
  };

  Object.keys(ENTIDADES).forEach((key) => {
    if (!state.entidadesHabilitadas[key]) return;
    const cfg = ENTIDADES[key];
    const data = state.entidades[key];
    if (cfg.type === "pipeline") {
      const entry = {
        flujo: data.flujo.trim(),
        etapasProgreso: cleanStages(data.etapasProgreso),
        etapasFallo: cleanStages(data.etapasFallo),
        camposPersonalizados: cleanFields(data.camposPersonalizados),
        automatizacion: data.automatizacion.trim()
      };
      if (key === "cotizaciones" && data.origenExterno) {
        entry.origenExterno = {
          usaOtroSoftware: !!data.origenExterno.usaOtroSoftware,
          cual: data.origenExterno.cual.trim(),
          continuidad: data.origenExterno.continuidad.trim()
        };
      }
      out.procesoComercial.entidades[key] = entry;
    } else if (cfg.type === "simple") {
      out.procesoComercial.entidades[key] = { camposPersonalizados: cleanFields(data.camposPersonalizados) };
    } else if (cfg.type === "postventa") {
      out.procesoComercial.entidades[key] = {
        facturaERP: !!data.facturaERP,
        erpNombre: data.erpNombre.trim(),
        deseaIntegracion: !!data.deseaIntegracion,
        detalleIntegracion: data.detalleIntegracion.trim(),
        procesoDescripcion: data.procesoDescripcion.trim()
      };
    }
  });

  out.reporteria = {
    prospectos: Object.keys(state.reporteria.prospectos).filter((k) => state.reporteria.prospectos[k]),
    negociaciones: Object.keys(state.reporteria.negociaciones).filter((k) => state.reporteria.negociaciones[k]),
    otros: state.reporteria.otros.trim()
  };

  return out;
}
