// Módulo RRHH: catálogo de procesos y definición de campos por tipo.
// Cada campo tiene un tipo de control: "text", "textarea" o "aprobadores"
// (lista secuencial de personas que aprueban).
export const CAMPOS_RRHH = {
  descripcion:    { label: "Descripción del proceso", tipo: "textarea", placeholder: "¿Cómo funciona hoy y qué se espera automatizar?" },
  aprobadores:    { label: "¿Quién(es) aprueba(n)? — en orden de aprobación", tipo: "aprobadores" },
  dias:           { label: "¿Cuántos días se pueden solicitar? (límites/reglas)", tipo: "text", placeholder: "Ej. hasta 15 días hábiles por año" },
  tipoPermiso:    { label: "Tipos de permiso", tipo: "text", placeholder: "Ej. médico, personal, estudio, duelo…" },
  monto:          { label: "Monto que se puede solicitar (límites/reglas)", tipo: "text", placeholder: "Ej. hasta 1 sueldo, a descontar en 3 cuotas" },
  recurso:        { label: "Recursos que se pueden reservar", tipo: "text", placeholder: "Ej. vehículo, sala, proyector, viáticos" },
  certifica:      { label: "¿Qué conocimientos se certifican?", tipo: "textarea", placeholder: "Ej. examen de producto, inducción, seguridad…" },
  datosSolicitar: { label: "¿Qué datos se solicitan al usuario a contratar?", tipo: "textarea", placeholder: "Ej. documento, CV, datos bancarios, contacto de emergencia…" },
  usuario:        { label: "¿Quién es el usuario?", tipo: "text", placeholder: "Ej. empleado a desvincular / cargo" },
  motivo:         { label: "Motivo", tipo: "textarea", placeholder: "Ej. reestructuración, desempeño, renuncia…" },
  puesto:         { label: "Puesto al que se postula", tipo: "text", placeholder: "Ej. vacante interna, área, requisitos" }
};

export const CATALOGO_RRHH = [
  { key: "vacaciones",   label: "Gestión de vacaciones",                    campos: ["descripcion", "aprobadores", "dias"] },
  { key: "permisos",     label: "Gestión de permisos",                      campos: ["descripcion", "aprobadores", "tipoPermiso"] },
  { key: "adelantos",    label: "Solicitud de adelantos y préstamos",       campos: ["descripcion", "aprobadores", "monto"] },
  { key: "viaticos",     label: "Solicitud y reserva de recursos y viáticos", campos: ["descripcion", "aprobadores", "monto", "recurso"] },
  { key: "certificacion",label: "Certificación interna de conocimientos",   campos: ["descripcion", "aprobadores", "certifica"] },
  { key: "contratacion", label: "Procedimientos de contratación",           campos: ["descripcion", "datosSolicitar"] },
  { key: "despidos",     label: "Procedimientos de despidos y separación",  campos: ["descripcion", "usuario", "motivo"] },
  { key: "postulacion",  label: "Postulación interna",                      campos: ["descripcion", "aprobadores", "puesto"] }
];
