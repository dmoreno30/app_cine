import { Redis } from "@upstash/redis";

const PREFIX = "icine:";

// Antes esto se conectaba a Redis apenas se importaba el archivo, sin
// revisar si las variables existían — si Upstash todavía no estaba
// conectado, tumbaba TODO el envío, incluso los que no usan link de un
// solo uso. Ahora se conecta de forma perezosa, y si no hay credenciales,
// el resto de las funciones se degradan solas en vez de tronar.
let redisClient;
let intentado = false;

function getRedis() {
  if (!intentado) {
    intentado = true;
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    redisClient = (url && token) ? new Redis({ url, token }) : null;
    if (!redisClient) {
      console.warn("Upstash Redis no está configurado todavía — el control de enlaces de un solo uso queda desactivado (se acepta cualquier envío).");
    }
  }
  return redisClient;
}

function toEntry(raw) {
  if (raw == null) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// Crea un enlace de un solo uso para un cliente. Necesita Redis configurado
// de verdad — no tiene sentido "crear un link" si no hay dónde recordarlo.
export async function crearToken(cliente) {
  const redis = getRedis();
  if (!redis) throw new Error("Upstash Redis no está configurado — conectalo en Vercel (Storage → Create Database → Upstash Redis) antes de crear enlaces.");
  const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  await redis.set(PREFIX + token, JSON.stringify({
    cliente, estado: "Pendiente", creadoEn: new Date().toISOString(), enviadoEn: null, docxPathname: null
  }));
  return token;
}

// Valida si un token puede enviar. Sin Redis configurado, o sin token en el
// envío, se permite igual — es el modo simple para pruebas internas.
export async function validar(token) {
  const redis = getRedis();
  if (!token || !redis) return { ok: true, sinControl: true };
  const entry = toEntry(await redis.get(PREFIX + token));
  if (!entry) return { ok: false, motivo: "token_invalido" };
  if (entry.estado === "Enviado") return { ok: false, motivo: "ya_enviado", entry };
  return { ok: true, entry };
}

export async function marcarEnviado(token, extra = {}) {
  const redis = getRedis();
  if (!token || !redis) return;
  const entry = toEntry(await redis.get(PREFIX + token));
  if (!entry) return;
  entry.estado = "Enviado";
  entry.enviadoEn = new Date().toISOString();
  Object.assign(entry, extra);
  await redis.set(PREFIX + token, JSON.stringify(entry));
}

// Lista todos los registros — para el endpoint de administración.
export async function listar() {
  const redis = getRedis();
  if (!redis) return {};
  const keys = await redis.keys(PREFIX + "*");
  const out = {};
  for (const key of keys) {
    out[key.slice(PREFIX.length)] = toEntry(await redis.get(key));
  }
  return out;
}
