import { INSTITUCIONAL } from "./header.js";

export function renderFooter() {
  return `
    <footer class="app-footer">
      <span>${INSTITUCIONAL.nombre} · ${INSTITUCIONAL.web}</span>
      <span>${INSTITUCIONAL.email} · ${INSTITUCIONAL.telefono}</span>
    </footer>`;
}
