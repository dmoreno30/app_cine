// Cliente del backend api/borrador.js (que habla con la Lista de producción).
async function apiBorrador(payload) {
  try {
    const r = await fetch("/api/borrador", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    return await r.json();
  } catch (e) {
    return { ok: false, mensaje: "No se pudo contactar el servidor." };
  }
}
export const listarDesarrollos = (proyectoId) => apiBorrador({ action: "list", proyectoId });
export const crearDesarrollo = (d) => apiBorrador({ action: "create", ...d });
export const cargarDesarrollo = (elementId) => apiBorrador({ action: "load", elementId });
export const guardarDesarrollo = (d) => apiBorrador({ action: "save", ...d });
// Formulario del cliente (extranet)
export const listarFormularios = (proyectoId) => apiBorrador({ action: "listForms", proyectoId });
export const guardarFormularioBorrador = (d) => apiBorrador({ action: "save", origen: "cliente", ...d });
export const enviarFormulario = (d) => apiBorrador({ action: "enviar", ...d });
