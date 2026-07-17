# Captura iCINE — Etapa 1 del pipeline

Formulario de captura de diagnóstico comercial. Su única salida es un **JSON canónico**
que alimentará el generador del iCINE (etapa 2) y, más adelante, el brief técnico
para VibeCode (etapa 3).

## Cómo correrlo en local

```bash
npm install
npm run dev        # servidor de desarrollo con recarga en caliente
npm run build      # genera /dist — archivos estáticos listos para deployar donde sea
npm run preview    # sirve /dist localmente para probar el build final
```

`npm run build` produce un `dist/` sin dependencias de servidor — HTML + JS + CSS
estáticos. Eso es justo lo que necesitas para embeberlo como app de portal cuando
lleguemos a la etapa de VibeCode: no hay paso de compilación pendiente del lado
del servidor.

## Estructura del proyecto

```
captura-icine/
├── index.html              punto de entrada, monta #app
├── vite.config.js
├── src/                     el formulario (frontend, Vite)
│   ├── main.js               orquesta el stepper principal y la persistencia
│   ├── state.js              estado por defecto, carga/guardado en localStorage,
│   │                         y buildCanonicalJSON() — el corazón del esquema
│   ├── submit.js              envía el JSON a /api/captura
│   ├── utils.js               escapeHtml / escapeAttr
│   ├── styles.css             tokens de marca asesores-e (rojo #E30D29, azul #2ABDEF)
│   ├── data/
│   │   └── config.js          CANALES, ENTIDADES (con obligatorio/opcional), TIPOS_CAMPO
│   ├── components/            piezas reutilizables entre pasos
│   │   ├── stepper.js          stepper de 5 pasos principales
│   │   ├── entityMap.js        mapa de entidades con toggle para las opcionales
│   │   ├── stageList.js        lista editable de etapas (progreso/fallo)
│   │   └── fieldList.js        lista editable de campos personalizados
│   └── steps/                  un módulo por paso principal (render + listeners)
│       ├── neStep.js            Necesidad específica (nombre + descripción libre)
│       ├── captacionStep.js     Captación de clientes (canales + chatbot + distribución)
│       ├── procesoComercialStep.js  mapa + sub-tabs + formulario por entidad
│       ├── reporteriaStep.js    reportes sugeridos por entidad
│       └── confirmacionStep.js  resumen + envío (JSON crudo solo con ?dev=1)
├── api/                     funciones serverless (ver sección de Vercel más abajo)
├── lib/                     generador del iCINE + registro de enlaces (compartido con api/)
└── scripts/
    └── crear-link.js         genera enlaces de un solo uso
```

## Esquema canónico (salida)

```json
{
  "cliente": "string",
  "necesidadEspecifica": { "descripcion": "string" },
  "captacionDeClientes": {
    "canales": ["facebook", "whatsapp", "..."],
    "otrosCanales": "string",
    "distribucion": "string"
  },
  "procesoComercial": {
    "entidades": {
      "prospectos": {
        "etapasProgreso": ["..."],
        "etapasFallo": ["..."],
        "camposPersonalizados": [{ "nombre": "...", "tipo": "Texto" }],
        "automatizacion": "string",
        "flujo": "string"
      },
      "negociaciones": { "...": "mismo formato que prospectos" },
      "contactos": { "camposPersonalizados": [ "..." ] },
      "companias": { "camposPersonalizados": [ "..." ] },
      "cotizaciones": { "...": "igual que negociaciones, si está habilitada" },
      "facturas": { "...": "igual que negociaciones, si está habilitada" }
    }
  }
}
```

Solo aparecen en la salida las entidades habilitadas en `entidadesHabilitadas`
(Negociaciones, Contactos y Compañías siempre están; Prospectos, Cotizaciones y
Facturas son opcionales y se pueden desactivar desde el mapa de entidades).

## Reglas de negocio ya implementadas

- **Negociaciones, Contactos y Compañías** son obligatorias — no se pueden desactivar.
- **Prospectos, Cotizaciones, Facturas y Post-venta** son opcionales — toggle en el mapa de entidades.
- Cada entidad tipo pipeline muestra un ejemplo ilustrativo de Progreso/Éxito/Descarte (solo de referencia).
- El paso de Reportería solo muestra el grupo de Prospectos o Negociaciones si esa entidad está habilitada.
- El avance se guarda automáticamente en `localStorage` (ver indicador "Guardado hh:mm").
- El campo de "Necesidad específica" es texto libre a propósito: alimenta el
  razonamiento de la IA en la etapa siguiente, no un checklist fijo.

## Modo desarrollador

El paso final ("Confirmar y enviar") le muestra al cliente solo un resumen amigable
y un botón de envío — nunca el JSON crudo. Para ver el JSON canónico completo
(útil mientras se prueba, o para descargar/copiar manualmente antes de que el
envío automático a Bitrix24 esté conectado), abrí la app con `?dev=1` al final
de la URL, ej. `http://localhost:5173/?dev=1`.

## Envío de datos

`src/submit.js` manda el JSON a `/api/captura` (función serverless, ver
sección de Vercel más abajo). Esa función valida el enlace de un solo uso,
genera el `.docx` con `lib/build.js`, y lo guarda en Vercel Blob — todo pasa
en el mismo request, sin pasos manuales.

**Sobre el registro de enlaces** (`lib/registro.js`): hoy vive en Upstash
Redis. El día que esto se conecte a Bitrix24 de verdad, ese archivo es el
único que habría que reescribir (para leer/escribir en la lista en vez de
Redis) — `api/captura.js` no se entera del cambio, porque solo le habla a
`validar()` y `marcarEnviado()`.

## Todo-en-uno en Vercel (sin servidor propio)

Esta carpeta ya no es solo el formulario — también contiene las funciones
serverless (`api/`) que antes vivían en `bridge-server` e `icine-generator`.
Todo se despliega junto, como un solo proyecto de Vercel.

```
captura-icine/
├── src/                  el formulario (sin cambios de lógica)
├── api/
│   ├── captura.js         recibe el envío, valida el token, genera el .docx
│   ├── lista.js           lista lo enviado (protegido con ADMIN_SECRET)
│   └── descargar.js       sirve los .docx guardados en Vercel Blob
├── lib/
│   ├── build.js            generador del iCINE (el mismo de siempre)
│   ├── brand.js
│   ├── registro.js          registro de enlaces — ahora en Upstash Redis, no en un archivo
│   └── assets/               banners de header/footer
└── scripts/
    └── crear-link.js         creás los enlaces de un solo uso desde tu máquina
```

### 1. Crear el proyecto en Vercel
- Subí esta carpeta a un repo de GitHub
- "Add New Project" en vercel.com → elegís el repo → Deploy (detecta Vite solo)

### 2. Conectar Upstash Redis (registro de enlaces)
En el proyecto ya creado: **Storage → Create Database → Upstash → Redis**
(aparece en el Marketplace de Vercel). Al conectarlo, Vercel agrega solas las
variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` al proyecto — no hay que
copiarlas a mano.

### 3. Conectar Vercel Blob (guardado de los .docx)
**Storage → Create Database → Blob**. Elegí acceso **Private** (son documentos
de clientes, no deben quedar públicos). Esto agrega `BLOB_READ_WRITE_TOKEN` solo.

### 4. Definir tu secreto de administrador
**Settings → Environment Variables** → agregá `ADMIN_SECRET` con cualquier
valor largo que solo vos conozcas (por ejemplo, generalo con
`openssl rand -hex 20`).

### 5. Redeploy
Con las 3 variables ya puestas, hacé un redeploy (Vercel → Deployments →
"Redeploy") para que las funciones las tomen.

### 6. Crear un enlace para un cliente
```bash
vercel env pull .env.local     # trae las variables reales del proyecto
node --env-file=.env.local scripts/crear-link.js "Nombre del Cliente"
```
Te da el link listo para compartir: `https://tu-proyecto.vercel.app/?id=xxxx`

### 7. Ver qué se ha enviado
```
https://tu-proyecto.vercel.app/api/lista?secret=TU_ADMIN_SECRET
```
Te devuelve el JSON de todos los envíos, con su `docxPathname`. Para
descargar uno:
```
https://tu-proyecto.vercel.app/api/descargar?pathname=icine/xxxx.docx&secret=TU_ADMIN_SECRET
```

### Probarlo en local antes de desplegar
Vite por sí solo no corre las funciones de `api/` — para eso necesitás la
CLI de Vercel:
```bash
npm install -g vercel
vercel env pull .env.local
vercel dev
```
Esto sí levanta tanto el formulario como las funciones serverless juntas,
igual que en producción.

### Nota sobre seguridad de `/api/lista` y `/api/descargar`
Hoy la protección es un secreto compartido en la URL — suficiente mientras
seas la única persona administrando esto, pero no es un login de verdad.
Cuando esto se conecte a Bitrix24 (Nivel 2), esta parte deja de hacer falta:
vas a administrar todo desde la lista de Bitrix24 directamente.
