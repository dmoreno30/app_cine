// Canales por los que puede llegar un cliente. El cliente marca los que usa
// actualmente; esto determina qué integraciones necesitará Bitrix24.
export const CANALES = [
  { key: "facebook", label: "Facebook", icon: "ti-brand-facebook" },
  { key: "instagram", label: "Instagram", icon: "ti-brand-instagram" },
  { key: "formularios", label: "Formularios del CRM", icon: "ti-forms" },
  { key: "telegram", label: "Telegram", icon: "ti-brand-telegram" },
  { key: "chatvivo", label: "Chat en vivo", icon: "ti-messages" },
  { key: "manual", label: "Creado manualmente", icon: "ti-pencil-plus" },
  { key: "tiendavirtual", label: "Tienda virtual", icon: "ti-shopping-cart" },
  { key: "tiktok", label: "TikTok", icon: "ti-brand-tiktok", necesitaConector: true },
  { key: "linkedin", label: "LinkedIn", icon: "ti-brand-linkedin", necesitaConector: true },
  { key: "widget", label: "Widget para sitio web", icon: "ti-browser-plus", esWidget: true },
  { key: "otros", label: "Otros", icon: "ti-dots", necesitaNombre: true }
];

// Definición de cada entidad del Proceso Comercial.
// obligatorio:true  -> siempre se captura, no se puede deshabilitar.
// obligatorio:false -> el cliente puede decidir que no la usa.
// type:'pipeline'   -> tiene etapas de progreso/fallo + automatización + flujo.
// type:'simple'     -> solo campos personalizados.
export const ENTIDADES = {
  prospectos: {
    label: "Prospectos", icon: "ti-users", type: "pipeline", obligatorio: false,
    helper: "Define el proceso de prospección.",
    info: "Guarda a alguien que apenas mostró interés, antes de confirmar que es un cliente calificado. Si tu equipo califica leads antes de abrir una oportunidad de venta, esta entidad te sirve."
  },
  negociaciones: {
    label: "Negociaciones", icon: "ti-currency-dollar", type: "pipeline", obligatorio: true,
    helper: "Desde que se abre una oportunidad de venta hasta que se gana o se pierde.",
    info: "Es el corazón del proceso comercial: cada oportunidad de venta real, con su valor, su etapa y su resultado final. Bitrix24 siempre necesita esta entidad para medir tu pipeline."
  },
  contactos: {
    label: "Contactos", icon: "ti-address-book", type: "simple", obligatorio: true,
    helper: "¿Qué información necesitas guardar sobre cada persona con la que hablas?",
    info: "Es la persona física: quien responde el teléfono o firma el contrato. Toda negociación y prospecto se vincula a un contacto."
  },
  companias: {
    label: "Compañías", icon: "ti-building", type: "simple", obligatorio: true,
    helper: "¿Qué información necesitas guardar sobre cada empresa cliente?",
    info: "La empresa a la que pertenece el contacto. Útil cuando le vendes a organizaciones y no solo a personas individuales."
  },
  cotizaciones: {
    label: "Cotizaciones", icon: "ti-file-invoice", type: "pipeline", obligatorio: false,
    helper: "Define el flujo de tus cotizaciones, si las manejas como paso formal aparte.",
    info: "Documento de propuesta de precio previo al cierre. Solo tiene sentido si tu proceso de venta pasa por una cotización formal antes de ganar la negociación."
  },
  facturas: {
    label: "Facturas", icon: "ti-receipt-2", type: "pipeline", obligatorio: false,
    helper: "Define el flujo de tus facturas, si las gestionas dentro del CRM.",
    info: "Documento de cobro posterior al cierre de la venta. Solo aplica si quieres llevar la facturación dentro de Bitrix24 y no en un sistema contable aparte."
  },
  postventa: {
    label: "Post-venta", icon: "ti-truck-delivery", type: "postventa", obligatorio: false,
    helper: "Si existe un proceso después de ganar la venta, contanos cómo funciona — sobre todo la facturación, que casi siempre vive fuera de Bitrix24.",
    info: "No es una entidad de Bitrix24 en sí, sino el proceso posterior al cierre: facturación, entrega, garantía. Se activa solo si el cliente tiene un proceso formal de post-venta."
  }
};

// Orden en que aparecen las pestañas dentro de "Proceso Comercial"
export const ORDEN_ENTIDADES = ["prospectos", "negociaciones", "contactos", "companias", "cotizaciones", "facturas", "postventa"];

// Plataformas/canales donde puede correr el flujo del chatbot (módulo Chatbot).
export const PLATAFORMAS_CHATBOT = [
  "WhatsApp (vía Wazzup)",
  "Chat en vivo / Web",
  "Instagram",
  "Facebook Messenger",
  "Telegram",
  "Otra"
];

// Chatbot — tipos de acción dentro de un menú. `entidad:true` = muestra el
// selector de entidad de Bitrix24 (Buscar / Crear registro).
export const TIPOS_ACCION_BOT = [
  { key: "mensaje", label: "Mensaje", entidad: false },
  { key: "pedir_dato", label: "Pedir dato", entidad: false },
  { key: "buscar", label: "Buscar en Bitrix24", entidad: true },
  { key: "crear", label: "Crear registro en Bitrix24", entidad: true },
  { key: "condicion", label: "Condición (si/entonces)", entidad: false },
  { key: "derivar", label: "Derivar a asesor", entidad: false },
  { key: "ir_menu", label: "Ir a otro menú", entidad: false },
  { key: "volver", label: "Volver al menú anterior", entidad: false }
];

// Entidades de Bitrix24 elegibles en acciones Buscar / Crear registro.
export const ENTIDADES_BOT = [
  "Contactos", "Compañías", "Prospectos", "Negociaciones",
  "Tareas", "Cotizaciones", "Facturas", "SPA / Proceso", "Lista", "Otra"
];

export const TIPOS_CAMPO = ["Texto", "Lista", "Fecha", "Numérico", "Sí/No", "Vincular a usuario", "Fecha y hora", "Dinero", "Archivo", "Dirección"];

// Monedas con las que puede operar el cliente (multi-selección en "Sobre la empresa").
// Por ahora se capturan para uso interno; todavía no se muestran en el iCINE.
export const MONEDAS = [
  { key: "MXN", label: "Peso mexicano (MXN)" },
  { key: "PEN", label: "Sol peruano (PEN)" },
  { key: "COP", label: "Peso colombiano (COP)" },
  { key: "USD", label: "Dólar (USD)" },
  { key: "EUR", label: "Euro (EUR)" },
  { key: "CLP", label: "Peso chileno (CLP)" },
  { key: "ARS", label: "Peso argentino (ARS)" }
];

// Reportería — sugerencias para los campos editables de cada reporte.
export const TIPOS_VISUALIZACION = ["Tabla", "Tabla resumen", "Tabla detalle", "Barras", "Líneas comparativas", "Indicador (KPI)", "Embudo", "Torta", "Otra"];
export const ENTIDADES_REPORTE = ["Prospectos", "Negociaciones", "Contactos", "Compañías", "Tareas", "Actividades", "Cotizaciones", "Facturas", "Productos", "SPA / Procesos", "Usuarios"];

// API / Integración
export const OBJETOS_API = ["Contactos", "Compañías", "Prospectos", "Negociaciones", "Cotizaciones", "Facturas", "Productos", "Tareas", "Otro"];
export const DIRECCIONES_API = [
  { key: "desde_bitrix", label: "Bitrix24 → software externo" },
  { key: "hacia_bitrix", label: "Software externo → Bitrix24" },
  { key: "ambos", label: "En ambos sentidos" }
];

// Roles y permisos del CRM (multi-selección por rol)
export const PERMISOS_CRM = ["Crear", "Ver", "Editar", "Eliminar", "Exportar", "Importar"];

export const WEBSERVICES = ["Webservice Basic", "Webservice Standard", "Webservice Advance"];

/* ============================================================================
   Captación — textos FIJOS y estándar del iCINE (lado desarrollador).
   "XX" se reemplaza por el nombre del cliente cuando está disponible.
   ============================================================================ */
export const CAPTACION_TEXTOS = {
  intro:
    "Los clientes podrán ingresar a Bitrix24 a través de diferentes canales digitales conectados a la plataforma, permitiendo centralizar las consultas y mantener un registro organizado de las interacciones.\n\n" +
    "Los canales de comunicación directa contarán con una configuración que permitirá al equipo responsable recibir, gestionar y responder los mensajes de los interesados en tiempo real. Asimismo, se habilitarán formularios y chats en vivo en el sitio web de XX, mediante los cuales los visitantes podrán realizar consultas o proporcionar sus datos para recibir atención comercial.",
  facebook:
    "Canal de comunicación que permitirá recibir en Bitrix24 los mensajes enviados por los visitantes a través de Facebook mediante messenger. Las consultas podrán ser atendidas directamente por el equipo interno responsable, facilitando una comunicación inmediata y centralizada con los interesados.",
  facebookConsideracion: "Respuestas automáticas activas (saludos iniciales).",
  formularios:
    "Formulario integrado en el sitio web de XX que permitirá recopilar información de los interesados en sus servicios. Los datos proporcionados serán registrados en el CRM para generar nuevos prospectos y facilitar su posterior seguimiento por parte del equipo comercial.",
  formulariosConsideracion: "Sin automatizaciones de reasignación.",
  consideracionGeneral:
    "Para la integración de redes sociales, formularios y otros canales externos que requieran acceso a plataformas de terceros, como Facebook, Instagram o el sitio web de XX, no será necesario solicitar ni recopilar previamente las credenciales de acceso del cliente.\n\n" +
    "Sin embargo, XX deberá contar con los accesos y permisos correspondientes para realizar las vinculaciones. Por ello, se coordinarán actividades específicas durante la implementación, en las cuales el cliente deberá facilitar los accesos necesarios para completar las integraciones."
};
// Actividades FIJAS de creación y conexión (van al iCINE).
export const CAPTACION_ACTIVIDADES = [
  "Creación de canal abierto FB - Instagram",
  "Conexión de cuenta FB - Instagram a canales abiertos",
  "Creación de Formulario del CRM - Widget del sitio web",
  "Vinculación de formulario del CRM + Widget del sitio web"
];
// Capacitación (CIP) FIJA de Captación.
export const CAPTACION_CIP = [
  { titulo: "Gestión de mensajes entrantes desde diversos canales (nivel usuario)", tiempo: "1 hora" },
  { titulo: "Gestión de canales abiertos + formularios del CRM + Widget (nivel administrador)", tiempo: "2 horas" }
];
// Reemplaza "XX" por el nombre del cliente (o lo deja si no hay nombre).
export function conCliente(txt, cliente) {
  const n = (cliente || "").trim();
  return n ? String(txt).replace(/XX/g, n) : String(txt);
}

/* ============================================================================
   Proceso Comercial — valores FIJOS / por defecto.
   ============================================================================ */
// Rol fijo que siempre va al iCINE (todos los permisos).
export const ROL_SUPERVISOR = {
  rol: "Supervisor",
  permisos: PERMISOS_CRM.slice(),
  observaciones: "Para supervisores de cada departamento teniendo en cuenta que podrán realizar las acciones en sus registros y en los registros de todos los empleados que pertenezcan al departamento"
};
// Capacitación (CIP) por defecto del proceso comercial.
export const PROCESO_CIP = [
  { titulo: "Capacitación en el uso del CRM comercial: pipelines, fichas, campos.", tiempo: "4 horas" },
  { titulo: "Capacitación nivel administrador del CRM (Permisos del CRM - ejecución de automatizaciones - gestión de información)", tiempo: "2 horas" }
];

/* ============================================================================
   Captación — por canal: títulos/descripciones por defecto y listas de opciones.
   "XX" se reemplaza por el nombre del cliente (conCliente).
   ============================================================================ */
export const CAP_CANAL_DEFAULTS = {
  facebook:  { titulo: "Facebook Messenger - Canal ventas", medio: "Facebook mediante Messenger" },
  instagram: { titulo: "Instagram Direct - Canal ventas",   medio: "Instagram Direct" },
  chatvivo:  { titulo: "Chat en vivo - Sitio web",           medio: "el chat en vivo del sitio web" },
  telegram:  { titulo: "Telegram - Canal ventas",            medio: "Telegram" },
  tiktok:    { titulo: "TikTok - Canal ventas",              medio: "TikTok" },
  linkedin:  { titulo: "LinkedIn - Canal ventas",            medio: "LinkedIn" },
  otros:     { titulo: "Otro canal",                         medio: "este canal" }
};
export const capDescripcion = (medio) =>
  `Canal de comunicación que permitirá recibir en Bitrix24 los mensajes enviados por los visitantes a través de ${medio}. Las consultas podrán ser atendidas directamente por el equipo interno responsable, facilitando una comunicación inmediata y centralizada con los interesados.`;

export const CAP_ACCION_MENSAJE = [
  "Crear manualmente en la ventana del chat",
  "Crear automáticamente un nuevo prospecto",
  "Crear automáticamente una nueva negociación"
];
export const CAP_DISTRIBUCION = ["A todos", "Igualmente", "Exactamente como en la cola de espera"];
export const CAP_SINO = ["Sí", "No"];

// Formularios del CRM
export const CAP_FORM_TITULO = "Formularios del CRM - Formulario de contacto";
export const CAP_FORM_DESC =
  "Formulario integrado en el sitio web de XX que permitirá recopilar información de los interesados en sus servicios. Los datos proporcionados serán registrados en el CRM para generar nuevos prospectos y facilitar su posterior seguimiento por parte del equipo comercial.";
export const CAP_FORM_CREAR = ["Prospecto", "Contacto y Negociación", "Contacto", "SPA", "Factura", "Cotización", "Cliente"];
export const CAP_FORM_CAMPOS = ["Nombre", "Apellido", "Teléfono", "Email", "Comentario"];

// Widget
export const CAP_WIDGET_TITULO = "Widget para sitio web - XX";

// Actividades de creación y conexión (2 por defecto) y Capacitación (2 por defecto)
export const CAP_ACTIVIDADES_DEF = [
  { titulo: "Creación de canal abierto FB - Instagram + chat en vivo + Creación de Formulario del CRM - Widget del sitio web", tiempo: "2 horas" },
  { titulo: "Vinculación de formulario del CRM + Widget del sitio web + Conexión de cuenta FB - Instagram a canales abiertos", tiempo: "2 horas" }
];
export const CAP_CIP_DEF = [
  { titulo: "Gestión de Canales abiertos nivel usuario", tiempo: "1 hora" },
  { titulo: "Gestión de Canales abiertos y formularios del CRM nivel administrador", tiempo: "2 horas" }
];

/* ============================================================================
   APLICACIÓN A MEDIDA (NE "app")
   Una aplicación local de Bitrix24: de ámbito general o incrustada (widget).
   ============================================================================ */
export const APP_TIPOS = [
  { key: "general", label: "Ámbito general", desc: "Abre en su propio espacio (menú / sección propia)." },
  { key: "widget",  label: "Widget (incrustado)", desc: "Se incrusta dentro de una pantalla de Bitrix24." }
];
// Si es widget, ¿en qué zona de Bitrix24 se incrusta?
export const APP_WIDGET_ZONAS = [
  { key: "crm",       label: "CRM" },
  { key: "tareas",    label: "Tareas" },
  { key: "proyectos", label: "Proyectos" }
];
// Si el widget es de CRM, ¿en qué entidad (ficha)?
export const APP_CRM_ENTIDADES = [
  { key: "prospecto",   label: "Prospecto" },
  { key: "contacto",    label: "Contacto" },
  { key: "compania",    label: "Compañía" },
  { key: "negociacion", label: "Negociación" },
  { key: "cotizacion",  label: "Cotización" },
  { key: "factura",     label: "Factura" }
];
// Y, dentro de la ficha, ¿en qué lugar?
export const APP_CRM_UBICACION = [
  { key: "pestana", label: "Pestaña en la ficha" },
  { key: "toolbar", label: "Barra de herramientas" },
  { key: "lateral", label: "Panel lateral / actividad" }
];
// Permisos / alcances que la app necesita en Bitrix24.
export const APP_PERMISOS = [
  { key: "crm",        label: "CRM" },
  { key: "tareas",     label: "Tareas y proyectos" },
  { key: "usuarios",   label: "Usuarios" },
  { key: "telefonia",  label: "Telefonía" },
  { key: "disco",      label: "Disco / archivos" },
  { key: "chat",       label: "Chat y notificaciones" },
  { key: "calendario", label: "Calendario" }
];
export const APP_METODOS = ["GET", "POST", "PUT", "DELETE", "Otro"];
// Valores por defecto (editables).
export const APP_ENDPOINTS_DEF = [
  { ruta: "/instalar", metodo: "POST", descripcion: "Registra la aplicación en Bitrix24 y guarda los accesos (tokens) para operar." }
];
export const APP_ACTIVIDADES_DEF = [
  { titulo: "Análisis funcional y diseño de la aplicación", tiempo: "" },
  { titulo: "Desarrollo de la aplicación", tiempo: "" },
  { titulo: "Instalación y pruebas en Bitrix24", tiempo: "" }
];
// Beneficios por defecto para la vista de cliente del iCINE.
export const APP_BENEFICIOS_DEF = [
  ["✓", "A la medida", "Resuelve una necesidad puntual que las funciones estándar no cubren."],
  ["✓", "Integrada a Bitrix24", "Funciona dentro de la plataforma, sin saltar a otra herramienta."],
  ["✓", "Centraliza la información", "Los datos quedan en Bitrix24, junto al resto del trabajo."]
];
