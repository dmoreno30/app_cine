export function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// Devuelve el pipeline activo de una entidad (o la entidad misma si no usa pipelines).
export function pipeActivo(state, entityKey) {
  const e = state.entidades[entityKey];
  if (e && Array.isArray(e.pipelines) && e.pipelines.length) {
    return e.pipelines[e.pipelineActivo || 0] || e.pipelines[0];
  }
  return e;
}
