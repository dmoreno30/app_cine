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

// Marca "asesores-e" con la "e" en círculo rojo, como en los documentos.
function wordmark() {
  return `<span class="ae-wordmark">asesores-<span class="ae-e">e</span></span>`;
}

export function renderHeader() {
  return `
    <header class="app-header">
      <div class="ae-brand">
        <p class="app-title">${wordmark()}</p>
        <p class="app-sub">${INSTITUCIONAL.tagline}</p>
      </div>
    </header>`;
}
