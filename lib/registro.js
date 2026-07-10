import { Redis } from "@upstash/redis";

// Redis.fromEnv() lee KV_REST_API_URL / KV_REST_API_TOKEN (o
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, según cómo Vercel
// haya nombrado las variables al conectar el store de Upstash). Si conectaste
// el store desde el Marketplace de Vercel, esas variables ya están puestas
// automáticamente en el proyecto — no hay que tocarlas a mano.
const redis = Redis.fromEnv();
const PREFIX = "icine:";

function toEntry(raw) {
  if (raw == null) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// Crea un enlace de un solo uso para un cliente.
export async function crearToken(cliente) {
  const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  await redis.set(PREFIX + token, JSON.stringify({
    cliente, estado: "Pendiente", creadoEn: new Date().toISOString(), enviadoEn: null, docxPathname: null
  }));
  return token;
}

// Valida si un token puede enviar. Sin token (pruebas sin link generado),
// se permite igual mero sin control de duplicados.
export async function validar(token) {
  if (!token) return { ok: true, sinControl: true };
  const entry = toEntry(await redis.get(PREFIX + token));
  if (!entry) return { ok: false, motivo: "token_invalido" };
  if (entry.estado === "Enviado") return { ok: false, motivo: "ya_enviado", entry };
  return { ok: true, entry };
}

export async function marcarEnviado(token, extra = {}) {
  if (!token) return;
  const entry = toEntry(await redis.get(PREFIX + token));
  if (!entry) return;
  entry.estado = "Enviado";
  entry.enviadoEn = new Date().toISOString();
  Object.assign(entry, extra);
  await redis.set(PREFIX + token, JSON.stringify(entry));
}

// Lista todos los registros — para el endpoint de administración.
export async function listar() {
  const keys = await redis.keys(PREFIX + "*");
  const out = {};
  for (const key of keys) {
    out[key.slice(PREFIX.length)] = toEntry(await redis.get(key));
  }
  return out;
}
