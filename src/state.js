import { CANALES, ENTIDADES, MONEDAS } from "./data/config.js";
import { CATALOGO_RRHH, CAMPOS_RRHH } from "./data/rrhh.js";

const STORAGE_KEY = "icine_captura_draft_v2";

function defaultPipelineEntity() {
  return {
    flujo: "",
    etapasProgreso: [{ nombre: "", descripcion: "" }],
    etapasFallo: [{ nombre: "", descripcion: "" }],
    flujoPasos: [{ accion: "", responsable: "", herramienta: "", condicion: "" }],
    camposPersonalizados: [{ nombre: "", tipo: "Texto" }],
    automatizaciones: [{ parametro: "", valor: "" }]
  };
}
function toStage(x) {
  if (typeof x === "string") return { nombre: x, descripcion: "" };
  return { nombre: x.nombre || x.etapa || "", descripcion: x.descripcion || x.desc || "" };
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
    meta: { url: "", licencia: "", consultor: "", jefeProyecto: "", version: "1.0", estado: "EN CREACIÓN" },
    ne: { descripcion: "" },
    empresa: {
      tipoProductos: "",
      monedas: Object.fromEntries(MONEDAS.map((m) => [m.key, false])),
      otrasMonedas: "",
      usaImpuestos: false,
      paisImpuestos: "",
      impuestos: [],
      unidadesMedida: "",
      direccion: "",
      cantidadEmpleados: "",
      faseDos: "",                 // Fuera del alcance / Versión 2
      recomendacionInstancia: "",  // ¿la instancia alcanza o requiere upgrade?
      webService: ""               // Infraestructura / Web Services (basic/standard/advance)
    },
    // Qué desarrollos eligió documentar (pantalla "Selección de desarrollos").
    // "proceso" es un paquete: activa Captación + Proceso Comercial + Reportería.
    desarrollos: { captacion: true, proceso: true, reportes: true, chatbot: false, api: false, app: false, rrhh: false },
    // Consideraciones por NE (texto libre que se agrega al final de cada NE en el iCINE)
    consideraciones: { captacion: "", proceso: "", reporteria: "", chatbot: "", api: "", app: "", rrhh: "" },
    // Capacitación (CIP) por NE: [{ titulo, tiempo }]
    cip: { captacion: [], proceso: [], reporteria: [], chatbot: [], api: [], app: [], rrhh: [] },
    // Pruebas (solo tiempos) para la tabla del punto 5
    pruebas: { qa: "", alpha: "" },
    // Datos libres de los módulos nuevos (API y Aplicación, por ahora).
    modulos: { api: "", app: "" },
    // Módulo Chatbot (detallado): flujo del bot sobre plataforma vinculada a Bitrix24.
    chatbot: {
      tipoBot: "",              // "menus" | "conversacional"
      plataformas: {},          // multi-selección: { [canal]: true }
      plataformaOtro: "",
      herramienta: "",          // ¿con qué se construirá el bot?
      objetivo: "",
      // Rama A — bot de menús (menús planos): cada menú tiene acciones.
      menus: [],               // [{ nombre, acciones: [{ tipo, entidad, descripcion, condicion }] }]
      // Rama B — bot conversacional / IA
      bienvenida: "",
      conocimiento: "",
      intentosDerivar: "",
      derivaA: "",
      // Común a ambos
      fallback: ""
    },
    // Procesos de gestión de RRHH (lista de procesos elegidos, cada uno con sus campos).
    rrhh: { procesos: [] },
    // API / Integración con software externo
    api: {
      otroSoftware: "",
      dirBitrixHaciaOtro: false,   // Bitrix24 → externo
      dirOtroHaciaBitrix: false,   // externo → Bitrix24
      webService: false,           // ¿se construye un web service / API propia?
      webServiceNota: "",
      flujos: [],                  // [{ objeto, direccion, descripcion, mapeaId, consideraciones }]
      sincronizaProductos: false,
      codigoProductos: ""
    },
    captacion: {
      canales, otros: "", distribucion: "",
      paginawebUrl: "", tiendavirtualUrl: "",
      flujosPorCanal: {},   // { canalKey: [{ accion, responsable, herramienta, condicion }] }
      chatbot: { necesita: false, descripcion: "" }
    },
    entidadesHabilitadas,
    entidades,
    reporteria: {
      descripcionReportes: "",  // qué se creará en los reportes (general)
      datasets: [],  // [{ descripcion, tiempo }] — múltiples datasets con su tiempo
      reportes: [],  // [{ nombre, queMuestra, entidades:[], filtros, tipoVisualizacion, tiempo, consideraciones }]
      roles: []      // [{ rol, permisos:[], observaciones }]
    },
    // Roles y permisos del CRM (tabla 2.4 del iCINE)
    roles: [{ rol: "", permisos: [], observaciones: "" }]
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
      meta: { ...base.meta, ...(parsed.meta || {}) },
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
        flujosPorCanal: { ...base.captacion.flujosPorCanal, ...((parsed.captacion || {}).flujosPorCanal || {}) },
        chatbot: { ...base.captacion.chatbot, ...((parsed.captacion || {}).chatbot || {}) }
      },
      entidadesHabilitadas: { ...base.entidadesHabilitadas, ...(parsed.entidadesHabilitadas || {}) },
      desarrollos: { ...base.desarrollos, ...(parsed.desarrollos || {}) },
      consideraciones: { ...base.consideraciones, ...(parsed.consideraciones || {}) },
      cip: { ...base.cip, ...(parsed.cip || {}) },
      pruebas: { ...base.pruebas, ...(parsed.pruebas || {}) },
      rrhh: { procesos: Array.isArray((parsed.rrhh || {}).procesos) ? parsed.rrhh.procesos : base.rrhh.procesos },
      api: { ...base.api, ...(parsed.api || {}), flujos: Array.isArray((parsed.api || {}).flujos) ? parsed.api.flujos : base.api.flujos },
      modulos: { ...base.modulos, ...(parsed.modulos || {}) },
      chatbot: {
        ...base.chatbot,
        ...(parsed.chatbot || {}),
        plataformas: { ...base.chatbot.plataformas, ...((parsed.chatbot || {}).plataformas || {}) },
        menus: Array.isArray((parsed.chatbot || {}).menus) ? parsed.chatbot.menus : base.chatbot.menus
      },
      entidades,
      reporteria: {
        reportes: Array.isArray((parsed.reporteria || {}).reportes) ? parsed.reporteria.reportes : base.reporteria.reportes
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

function cleanFields(arr) {
  return (arr || [])
    .filter((f) => (f.nombre || f.campo || "").trim())
    .map((f) => ({ nombre: (f.nombre || f.campo || "").trim(), tipo: f.tipo || "Texto" }));
}
function cleanStages(arr) {
  return (arr || [])
    .map(toStage)
    .filter((e) => (e.nombre || "").trim())
    .map((e) => ({ nombre: e.nombre.trim(), descripcion: (e.descripcion || "").trim() }));
}

function buildAPI(a) {
  a = a || {};
  return {
    otroSoftware: (a.otroSoftware || "").trim(),
    dirBitrixHaciaOtro: !!a.dirBitrixHaciaOtro,
    dirOtroHaciaBitrix: !!a.dirOtroHaciaBitrix,
    webService: !!a.webService,
    webServiceNota: (a.webServiceNota || "").trim(),
    flujos: (a.flujos || [])
      .filter((f) => (f.objeto || "").trim() || (f.descripcion || "").trim())
      .map((f) => ({
        objeto: (f.objeto || "").trim(),
        direccion: f.direccion || "",
        descripcion: (f.descripcion || "").trim(),
        mapeaId: !!f.mapeaId,
        consideraciones: (f.consideraciones || "").trim()
      })),
    sincronizaProductos: !!a.sincronizaProductos,
    codigoProductos: (a.codigoProductos || "").trim()
  };
}

function buildRRHH(rr) {
  const procesos = (rr && Array.isArray(rr.procesos) ? rr.procesos : [])
    .map((pr) => {
      const cat = CATALOGO_RRHH.find((c) => c.key === pr.tipo);
      if (!cat) return null;
      const campos = [];
      let aprobadores = [];
      cat.campos.forEach((fk) => {
        const meta = CAMPOS_RRHH[fk];
        if (!meta) return;
        if (meta.tipo === "aprobadores") {
          aprobadores = (pr.aprobadores || []).map((a) => (a || "").trim()).filter(Boolean);
        } else {
          const v = (pr[fk] || "").trim();
          campos.push({ label: meta.label, valor: v });
        }
      });
      return { tipo: pr.tipo, label: cat.label, campos, aprobadores };
    })
    .filter(Boolean)
    // incluir solo procesos con algún dato cargado
    .filter((pr) => pr.aprobadores.length || pr.campos.some((c) => c.valor));
  return { procesos };
}

function buildChatbot(cb) {
  const plataformas = Object.keys(cb.plataformas || {}).filter((k) => cb.plataformas[k]);
  if ((cb.plataformaOtro || "").trim()) plataformas.push(cb.plataformaOtro.trim());
  const base = {
    tipoBot: cb.tipoBot || "",
    plataformas,
    herramienta: (cb.herramienta || "").trim(),
    objetivo: (cb.objetivo || "").trim(),
    fallback: (cb.fallback || "").trim()
  };
  if (cb.tipoBot === "conversacional") {
    return {
      ...base,
      bienvenida: (cb.bienvenida || "").trim(),
      conocimiento: (cb.conocimiento || "").trim(),
      intentosDerivar: String(cb.intentosDerivar == null ? "" : cb.intentosDerivar).trim(),
      derivaA: (cb.derivaA || "").trim()
    };
  }
  // menús (default)
  return {
    ...base,
    menus: (cb.menus || [])
      .filter((m) => (m.nombre || "").trim() || (m.acciones || []).length)
      .map((m) => ({
        nombre: (m.nombre || "").trim(),
        acciones: (m.acciones || [])
          .filter((a) => (a.descripcion || "").trim() || (a.tipo || "").trim())
          .map((a) => ({
            tipo: a.tipo || "",
            entidad: (a.entidad || "").trim(),
            descripcion: (a.descripcion || "").trim(),
            condicion: (a.condicion || "").trim()
          }))
      }))
  };
}

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
      usaImpuestos: !!state.empresa.usaImpuestos,
      paisImpuestos: (state.empresa.paisImpuestos || "").trim(),
      impuestos: state.empresa.usaImpuestos ? state.empresa.impuestos
        .filter((t) => (t.nombre || "").trim())
        .map((t) => ({ nombre: t.nombre.trim(), porcentaje: String(t.porcentaje == null ? "" : t.porcentaje).trim() })) : [],
      unidadesMedida: (state.empresa.unidadesMedida || "").trim(),
      direccion: (state.empresa.direccion || "").trim(),
      cantidadEmpleados: String(state.empresa.cantidadEmpleados == null ? "" : state.empresa.cantidadEmpleados).trim(),
      faseDos: (state.empresa.faseDos || "").trim(),
      recomendacionInstancia: (state.empresa.recomendacionInstancia || "").trim(),
      webService: (state.empresa.webService || "").trim()
    },
    // Desarrollos seleccionados (paquete proceso + módulos sueltos).
    desarrollos: Object.keys(state.desarrollos).filter((k) => state.desarrollos[k]),
    cip: Object.fromEntries(Object.entries(state.cip || {}).map(([k, arr]) => [k, (arr || []).filter((c) => (c.titulo || "").trim() || (c.tiempo || "").trim()).map((c) => ({ titulo: (c.titulo || "").trim(), tiempo: (c.tiempo || "").trim() }))])),
    pruebas: { qa: (state.pruebas && state.pruebas.qa || "").trim(), alpha: (state.pruebas && state.pruebas.alpha || "").trim() },
    consideraciones: {
      captacion: (state.consideraciones && state.consideraciones.captacion || "").trim(),
      proceso: (state.consideraciones && state.consideraciones.proceso || "").trim(),
      reporteria: (state.consideraciones && state.consideraciones.reporteria || "").trim(),
      chatbot: (state.consideraciones && state.consideraciones.chatbot || "").trim(),
      api: (state.consideraciones && state.consideraciones.api || "").trim(),
      app: (state.consideraciones && state.consideraciones.app || "").trim(),
      rrhh: (state.consideraciones && state.consideraciones.rrhh || "").trim()
    },
    modulos: {
      api: (state.modulos.api || "").trim(),
      app: (state.modulos.app || "").trim()
    },
    chatbot: buildChatbot(state.chatbot),
    rrhh: buildRRHH(state.rrhh),
    api: buildAPI(state.api),
    captacionDeClientes: {
      canales: Object.keys(state.captacion.canales).filter((k) => state.captacion.canales[k]),
      otrosCanales: state.captacion.otros.trim(),
      distribucion: state.captacion.distribucion.trim(),
      paginawebUrl: state.captacion.paginawebUrl.trim(),
      tiendavirtualUrl: state.captacion.tiendavirtualUrl.trim(),
      chatbot: {
        necesita: !!state.captacion.chatbot.necesita,
        descripcion: state.captacion.chatbot.descripcion.trim()
      },
      flujosPorCanal: Object.fromEntries(
        Object.entries(state.captacion.flujosPorCanal || {})
          .map(([k, pasos]) => [k, (pasos || [])
            .filter((p) => (p.accion || "").trim() || (p.responsable || "").trim())
            .map((p) => ({ accion: (p.accion || "").trim(), responsable: (p.responsable || "").trim(), herramienta: (p.herramienta || "").trim(), condicion: (p.condicion || "").trim() }))])
          .filter(([, pasos]) => pasos.length)
      )
    },
    procesoComercial: { entidades: {}, roles: [] }
  };

  out.procesoComercial.roles = (state.roles || [])
    .filter((r) => (r.rol || "").trim())
    .map((r) => ({ rol: r.rol.trim(), permisos: (r.permisos || []).slice(), observaciones: (r.observaciones || "").trim() }));

  Object.keys(ENTIDADES).forEach((key) => {
    if (!state.entidadesHabilitadas[key]) return;
    const cfg = ENTIDADES[key];
    const data = state.entidades[key];
    if (cfg.type === "pipeline") {
      const entry = {
        flujo: (data.flujo || "").trim(),
        etapasProgreso: cleanStages(data.etapasProgreso),
        etapasFallo: cleanStages(data.etapasFallo),
        flujoPasos: (data.flujoPasos || [])
          .filter((p) => (p.accion || "").trim() || (p.responsable || "").trim())
          .map((p) => ({ accion: (p.accion || "").trim(), responsable: (p.responsable || "").trim(), herramienta: (p.herramienta || "").trim(), condicion: (p.condicion || "").trim() })),
        camposPersonalizados: cleanFields(data.camposPersonalizados),
        automatizaciones: (data.automatizaciones || [])
          .filter((a) => (a.parametro || "").trim() || (a.valor || "").trim())
          .map((a) => ({ parametro: (a.parametro || "").trim(), valor: (a.valor || "").trim() }))
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

  out.meta = {
    url: (state.meta && state.meta.url || "").trim(),
    licencia: (state.meta && state.meta.licencia || "").trim(),
    consultor: (state.meta && state.meta.consultor || "").trim(),
    jefeProyecto: (state.meta && state.meta.jefeProyecto || "").trim(),
    version: (state.meta && state.meta.version) || "1.0",
    estado: (state.meta && state.meta.estado) || "EN CREACIÓN"
  };
  out.reporteria = {
    descripcionReportes: (state.reporteria.descripcionReportes || "").trim(),
    datasets: (state.reporteria.datasets || [])
      .filter((d) => (d.descripcion || "").trim() || (d.tiempo || "").trim())
      .map((d) => ({ descripcion: (d.descripcion || "").trim(), tiempo: (d.tiempo || "").trim() })),
    roles: (state.reporteria.roles || [])
      .filter((r) => (r.rol || "").trim())
      .map((r) => ({ rol: r.rol.trim(), permisos: (r.permisos || []).slice(), observaciones: (r.observaciones || "").trim() })),
    reportes: (state.reporteria.reportes || [])
      .filter((r) => (r.nombre || "").trim() || (r.queMuestra || "").trim())
      .map((r) => ({
        nombre: (r.nombre || "").trim(),
        queMuestra: (r.queMuestra || "").trim(),
        entidades: Array.isArray(r.entidades) ? r.entidades.slice() : ((r.entidad || "").trim() ? [r.entidad.trim()] : []),
        filtros: (r.filtros || "").trim(),
        tipoVisualizacion: (r.tipoVisualizacion || "").trim(),
        tiempo: (r.tiempo || "").trim(),
        consideraciones: (r.consideraciones || "").trim()
      }))
  };

  return out;
}
