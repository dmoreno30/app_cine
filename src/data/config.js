// Canales por los que puede llegar un cliente. El cliente marca los que usa
// actualmente; esto determina qué integraciones necesitará Bitrix24.
export const CANALES = [
  { key: "facebook", label: "Facebook", icon: "ti-brand-facebook" },
  { key: "instagram", label: "Instagram", icon: "ti-brand-instagram" },
  { key: "formularios", label: "Formularios (página web)", icon: "ti-forms" },
  { key: "whatsapp", label: "WhatsApp", icon: "ti-brand-whatsapp" },
  { key: "telegram", label: "Telegram", icon: "ti-brand-telegram" },
  { key: "chatvivo", label: "Chat en vivo", icon: "ti-messages" },
  { key: "visitadirecta", label: "Visita directa", icon: "ti-door-enter" },
  { key: "tiendavirtual", label: "Tienda virtual", icon: "ti-shopping-cart" },
  { key: "paginaweb", label: "¿Tiene página web?", icon: "ti-world" },
  { key: "tiktok", label: "TikTok", icon: "ti-brand-tiktok" },
  { key: "linkedin", label: "LinkedIn", icon: "ti-brand-linkedin" }
];

// Definición de cada entidad del Proceso Comercial.
// obligatorio:true  -> siempre se captura, no se puede deshabilitar.
// obligatorio:false -> el cliente puede decidir que no la usa.
// type:'pipeline'   -> tiene etapas de progreso/fallo + automatización + flujo.
// type:'simple'     -> solo campos personalizados.
export const ENTIDADES = {
  prospectos: {
    label: "Prospectos", icon: "ti-users", type: "pipeline", obligatorio: false,
    helper: "Cuéntanos cómo avanza y se pierde un prospecto en tu proceso.",
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

export const TIPOS_CAMPO = ["Texto", "Lista", "Fecha", "Numérico", "Sí/No"];

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
