// Reportes comunes que se le sugieren al cliente como referencia.
// Se agrupan por entidad para poder ocultar el grupo si esa entidad
// está deshabilitada en Proceso Comercial.
export const REPORTES_PROSPECTOS = [
  { key: "origen", label: "Reporte por origen" },
  { key: "por_responsable", label: "Prospectos por responsable (en progreso, descarte agrupados, éxito)" },
  { key: "tasa_conversion", label: "Tasa de prospectos convertidos" },
  { key: "ingreso_vs_conversion_dia", label: "Cantidad de prospectos que ingresan en un día vs. cantidad convertidos en el mismo día" }
];

export const REPORTES_NEGOCIACIONES = [
  { key: "por_responsable", label: "Negociaciones por responsable (en progreso, descarte agrupados, éxito)" },
  { key: "tasa_ganadas_pipeline", label: "Tasa de negociaciones ganadas por pipeline" },
  { key: "creadas_vs_ganadas_dia", label: "Cantidad de negociaciones creadas en un día vs. cantidad ganadas en el mismo día" },
  { key: "por_contacto", label: "Negociaciones por cada contacto" },
  { key: "por_contacto_status", label: "Negociaciones por cada contacto y su status (en progreso, descarte agrupados, éxito)" },
  { key: "tiempo_promedio", label: "Tiempo promedio que dura una negociación (creada vs. finalizada, ganada o perdida)" }
];
