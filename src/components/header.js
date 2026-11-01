// Datos institucionales — reemplazar por los reales de asesores-e.
// Si más adelante hay un logo en imagen, cambiá el <div class="logo-dot">
// por un <img src="/assets/logo-asesores-e.png" alt="asesores-e">.
export const INSTITUCIONAL = {
  nombre: "asesores-e",
  tagline: "Consultoría de implementación de necesidad específica",
  web: "www.asesores-e.net",
  email: "contacto@asesores-e.net",
  telefono: "+00 000 000 000"
};

export function renderHeader() {
  return `
    <header class="app-header">
      <div class="logo-dot"></div>
      <div>
        <p class="app-title">${INSTITUCIONAL.nombre}</p>
        <p class="app-sub">${INSTITUCIONAL.tagline}</p>
      </div>
    </header>`;
}
