// Árbol del wizard. No es un menú lateral de los pasos lineales: refleja el
// rediseño del documento — ÁREAS de primer nivel y, dentro de Comercial, los
// MACROPROCESOS que se eligen. Cada macroproceso elegido aparece como nodo y
// abre su propia configuración (el "bloque estándar"). "A partir de lo elegido
// salen los desarrollos".
import { ENTIDADES, ORDEN_ENTIDADES } from "../data/config.js";

// Nombre de cada macroproceso comercial según el documento (mapeado a la
// entidad que ya existe en el estado).
const PROC_LABEL = {
  prospectos: "Prospectación",
  negociaciones: "Negociación",
  contactos: "Gestión de Contacto",
  companias: "Gestión de Compañías",
  cotizaciones: "Cotización",
  facturas: "Facturación",
  postventa: "Post-venta"
};

// Áreas de primer nivel (orden y encabezado en el árbol).
const AREAS = [
  { key: "datos", label: "Datos del proyecto", icon: "ti-settings", header: false },
  { key: "gcd", label: "Gestión Colaborativa digital", icon: "ti-layout-grid", header: true },
  { key: "comercial", label: "Marketing / Comercial", icon: "ti-businessplan", header: true },
  { key: "rrhh", label: "RR.HH.", icon: "ti-users-group", header: true },
  { key: "otros", label: "Otros módulos", icon: "ti-puzzle", header: true },
  { key: "cierre", label: "Cierre", icon: "ti-clipboard-check", header: false }
];

function entidadHabilitada(state, key) {
  return ENTIDADES[key].obligatorio || !!(state.entidadesHabilitadas && state.entidadesHabilitadas[key]);
}

// Devuelve la lista plana de nodos del árbol, en orden, según lo que se eligió.
// Cada nodo: { key, label, icon, area, proc?, child? }. La navegación usa `key`.
export function getArbol(state, opts = {}) {
  const modoCliente = !!opts.modoCliente;
  const d = (state && state.desarrollos) || {};
  const nodes = [];

  // --- Datos del proyecto ---
  nodes.push({ key: "ne", label: "Configuración general", icon: "ti-building-store", area: "datos" });
  nodes.push({ key: "seleccion", label: "Selección de desarrollos", icon: "ti-checklist", area: "datos" });
  if (!modoCliente) nodes.push({ key: "equipo", label: "Equipo y estructura", icon: "ti-users", area: "datos" });

  // --- Marketing / Comercial ---
  if (d.captacion) nodes.push({ key: "captacion", label: "Marketing (captación)", icon: "ti-antenna", area: "comercial" });
  if (d.proceso) {
    nodes.push({ key: "proc-sel", label: "Procesos comerciales", icon: "ti-sitemap", area: "comercial" });
    ORDEN_ENTIDADES.forEach((k) => {
      if (entidadHabilitada(state, k)) {
        nodes.push({ key: "proc:" + k, label: PROC_LABEL[k] || ENTIDADES[k].label, icon: ENTIDADES[k].icon, area: "comercial", proc: k, child: true });
      }
    });
  }
  if (d.reportes) nodes.push({ key: "reporteria", label: "Reportería", icon: "ti-chart-bar", area: "comercial" });

  // --- RR.HH. ---
  if (d.rrhh) nodes.push({ key: "rrhh", label: "Gestión de RRHH", icon: "ti-users-group", area: "rrhh" });

  // --- Otros módulos ---
  if (d.chatbot) nodes.push({ key: "chatbot", label: "Chatbot", icon: "ti-message-chatbot", area: "otros" });
  if (d.api) nodes.push({ key: "api", label: "API / Integración", icon: "ti-plug-connected", area: "otros" });
  if (d.app) nodes.push({ key: "app", label: "Aplicación", icon: "ti-app-window", area: "otros" });

  // --- Cierre ---
  if (!modoCliente) nodes.push({ key: "confirmacion", label: "Generar iCINE", icon: "ti-clipboard-check", area: "cierre" });

  return nodes;
}

// Placeholder "Próximamente" para las áreas previstas pero aún sin construir,
// de modo que se vean las tres áreas de primer nivel del documento.
function placeholder(area) {
  return `<div class="wz-leaf wz-soon"><i class="ti ti-dots"></i><span>Próximamente</span></div>`;
}

export function renderArbol(currentKey, nodes) {
  const curIdx = nodes.findIndex((n) => n.key === currentKey);
  const bloques = AREAS.map((area) => {
    const hojas = nodes.filter((n) => n.area === area.key);
    // Áreas previstas (GCD y RR.HH. cuando no está activa): mostrar encabezado + "Próximamente".
    if (!hojas.length) {
      if (area.key === "gcd" || area.key === "rrhh") {
        return `<div class="wz-area"><div class="wz-area-h"><i class="ti ${area.icon}"></i>${area.label}</div>${placeholder(area)}</div>`;
      }
      return "";
    }
    const items = hojas.map((n) => {
      const idx = nodes.indexOf(n);
      const cls = ["wz-leaf"];
      if (n.key === currentKey) cls.push("active");
      else if (idx < curIdx) cls.push("done");
      if (n.child) cls.push("child");
      return `<div class="${cls.join(" ")}" data-goto-key="${n.key}"><i class="ti ${n.icon}"></i><span>${n.label}</span></div>`;
    }).join("");
    const header = area.header ? `<div class="wz-area-h"><i class="ti ${area.icon}"></i>${area.label}</div>` : "";
    return `<div class="wz-area">${header}${items}</div>`;
  }).join("");
  return `<nav class="wizard-tree" aria-label="Navegación del desarrollo">${bloques}</nav>`;
}

export { AREAS, PROC_LABEL };
