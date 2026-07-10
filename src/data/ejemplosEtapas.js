// Ejemplos puramente ilustrativos — se muestran como referencia visual
// dentro del formulario, NO son la configuración real del cliente.
export const EJEMPLOS_ETAPAS = {
  prospectos: {
    progreso: ["Nuevo", "Contactado", "En evaluación", "Pendiente de info"],
    exito: ["Calificado — pasa a negociación"],
    descarte: ["No responde", "No interesado", "Sin presupuesto"]
  },
  negociaciones: {
    progreso: ["Nueva oportunidad", "Reunión agendada", "Demo realizada", "Cotización enviada", "Negociación activa"],
    exito: ["Venta ganada", "Contrato firmado"],
    descarte: ["Precio elevado", "Eligió a la competencia", "Proyecto cancelado", "Sin respuesta"]
  },
  cotizaciones: {
    progreso: ["En elaboración", "Enviada al cliente", "Esperando respuesta"],
    exito: ["Aprobada"],
    descarte: ["Rechazada", "Vencida sin respuesta"]
  },
  facturas: {
    progreso: ["Emitida", "Enviada al cliente", "Pendiente de pago"],
    exito: ["Pagada"],
    descarte: ["Vencida", "Anulada"]
  }
};
