// Se corre en tu máquina (no en Vercel) para crear el registro "Pendiente"
// antes de compartirle el link a un cliente. Necesita las mismas variables
// de entorno de Upstash que usa el sitio desplegado — bajalas con:
//   vercel env pull .env.local
// y despues corré: node --env-file=.env.local scripts/crear-link.js "Cliente"
import { crearToken } from "../lib/registro.js";

const cliente = process.argv.slice(2).join(" ");
if (!cliente) {
  console.error('Uso: node --env-file=.env.local scripts/crear-link.js "Nombre del Cliente"');
  process.exit(1);
}

const token = await crearToken(cliente);
const base = process.env.CAPTURA_URL || "https://tu-proyecto.vercel.app";

console.log(`\nEnlace creado para "${cliente}":`);
console.log(`${base}/?id=${token}\n`);
console.log("Es de un solo uso — al enviarlo, el link queda marcado como \"Enviado\".");
