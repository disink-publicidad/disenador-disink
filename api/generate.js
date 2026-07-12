// ============================================================
// /api/generate — Función serverless de Vercel
// AQUÍ viven los PROMPTS MAESTROS (ocultos, nadie los ve).
// La página solo envía las selecciones y datos del cliente.
// Variables de entorno en Vercel:
//   OPENAI_API_KEY  (obligatoria)
//   ALLOWED_ORIGIN  (opcional, ej. "disinkcontrol.online" — candado anti-robo del endpoint)
// ============================================================

const MARCA_DE_AGUA = `
MARCA DE AGUA OBLIGATORIA: superpón sobre TODO el diseño el texto "DISINK CONTROL · MUESTRA" repetido varias veces en diagonal, semitransparente, claramente visible. El diseño es una muestra no final.`;

const PRESENTACION = `
PRESENTACIÓN: entrega ÚNICAMENTE el diseño plano visto de frente. SIN mockup fotográfico, sin manos, sin mesas, sin perspectiva 3D, sin sombras exageradas. Respeta estrictamente la orientación y proporción indicadas.`;

const CALIDAD = `
CALIDAD: nivel de estudio de diseño galardonado (estética tipo Behance). Composición con retícula, jerarquía tipográfica impecable, espaciado consistente, alineaciones perfectas, mucho espacio de respiro. Máximo 2 familias tipográficas.
ORTOGRAFÍA CRÍTICA: transcribe cada texto indicado entre comillas « » EXACTAMENTE letra por letra, con sus acentos, mayúsculas y minúsculas. No corrijas, no traduzcas, no abrevies, no agregues ni cambies palabras. Verifica cada palabra dos veces antes de terminar: un solo error de ortografía arruina el trabajo.`;

function styleGuide(s) {
  const g = {
    "Moderno": "formas geométricas, diagonales dinámicas, tipografía sans-serif bold, mucho aire",
    "Elegante": "fondo oscuro o neutro, detalles dorados o metálicos, tipografía serif fina, lujo discreto",
    "Minimalista": "fondo claro, tipografía ligera, mucho espacio en blanco, cero elementos decorativos innecesarios",
    "Colorido": "colores vivos y contrastantes, energía visual, formas orgánicas divertidas",
    "Impactante": "colores saturados de altísimo contraste, tipografía extra bold gigante",
    "Festivo": "ambiente de celebración, colores alegres, elementos gráficos de fiesta",
    "Corporativo": "limpio, confiable, estructura ordenada con un acento de color",
    "Llamativo": "alto contraste, elementos tipo oferta/explosión, energía comercial",
    "Juvenil": "colores vibrantes, tipografía moderna con actitud, estilo urbano",
    "Clásico": "sobrio y atemporal, tipografía serif tradicional, composición simétrica, colores discretos",
    "Vintage": "tonos crema y sepia, tipografía retro, ornamentos clásicos discretos, aire nostálgico",
    "Tecnológico": "estética futurista, líneas finas tipo circuito, acentos neón sobre fondo oscuro, tipografía geométrica"
  };
  return g[s] || "profesional y equilibrado";
}

// ============================================================
// REGLAS INVIOLABLES POR PRODUCTO
// El "director de arte" reescribe el brief y puede olvidar reglas
// duras del negocio (proporciones, mate obligatorio, despunte,
// márgenes, corte de vinil plano...). Estas se REINYECTAN SIEMPRE
// después del director para que nunca se pierdan.
// ============================================================
function reglasDuras(product, d, o) {
  const dual = product === "tarjetas" && (o.lados || "").includes("vuelta");
  const reglas = {
    tarjetas: `Cada tarjeta en proporción OBLIGATORIA 1.8:1 HORIZONTAL (9 de ancho x 5 de alto); PROHIBIDO dibujarlas verticales. Esquinas/despunte: ${d.despunte || "las 4 esquinas rectas"}. ${dual
      ? "DOS tarjetas del mismo tamaño lado a lado (IZQUIERDA = FRENTE, DERECHA = REVERSO) y acabado MATE OBLIGATORIO (sin brillos plásticos)."
      : "UNA sola tarjeta centrada."} Margen interno de seguridad de 4 mm: nada de texto pegado al borde.`,
    lonas: `Respeta EXACTAMENTE la proporción ${o.medida || "200 x 100 cm"} (ancho x alto). Deja 5 cm de margen perimetral libre de textos y elementos importantes. Máxima legibilidad a distancia; el teléfono debe leerse desde lejos.`,
    volantes: `Formato ${o.tam || "media carta"} VERTICAL. ${(o.lados || "").includes("vuelta")
      ? "Frente y vuelta en el mismo lienzo, lado a lado."
      : "Un solo lado."} Jerarquía: título > oferta > servicios > contacto.`,
    stickers: `Forma ${o.forma || "circular"} con línea de troquel (contorno de corte) a 2 mm del diseño; el fondo llega hasta el borde del troquel, sin filos blancos. Legible a tamaño real.`,
    vinil: `TÉCNICA OBLIGATORIA: colores 100% PLANOS y SÓLIDOS (${d.paleta || "los colores indicados"}). PROHIBIDO degradados, sombras, fotografías, texturas o efectos 3D. Trazos gruesos y formas cerradas aptas para plotter de corte (grosor mínimo equivalente a 3 mm real).`
  };
  return `\nREGLAS INVIOLABLES DEL PRODUCTO (respétalas por encima de cualquier otra cosa): ${reglas[product] || ""}`;
}

// ============================================================
// "DIRECTOR DE ARTE" — el truco del JSON, automatizado:
// antes de generar la imagen, un modelo de visión (gpt-4o-mini)
// mira el logo y las referencias, lee el brief y lo reescribe
// como un prompt visual muchísimo más rico y detallado.
// Puedes afinar sus instrucciones aquí:
// ============================================================
const DIRECTOR = `Actúa como director de arte senior de una imprenta profesional.
Recibirás un BRIEF técnico y posiblemente imágenes (logotipos del cliente y referencias de estilo).
TU TAREA: reescribe el brief como UN solo prompt de generación de imagen extraordinariamente detallado y visual (máximo 350 palabras): describe la composición exacta zona por zona, el fondo, texturas, estilo tipográfico, tamaños relativos de cada elemento, paleta con códigos de color, y elementos gráficos decorativos concretos. Estética de estudio de diseño premiado.
REGLAS OBLIGATORIAS:
- Si hay una imagen de REFERENCIA de diseño, tu PRIORIDAD #1 es REPLICARLA: describe con precisión quirúrgica su composición, distribución de elementos, formas, estilo tipográfico, fondos y esquema de color, y pide reproducir ese mismo diseño sustituyendo ÚNICAMENTE los textos y logotipos por los del cliente. El resultado debe parecer del mismo diseñador y la misma familia visual que la referencia, no solo "inspirado" en ella.
- Conserva TAL CUAL, sin cambiar ni una letra ni un acento, todos los textos entre comillas « » (son datos reales del cliente) y mantenlos entre « ».
- Conserva la orientación, proporción, medidas y esquinas indicadas en el brief (a menos que la referencia sea claramente vertical y el brief lo permita).
- Si hay logotipo, indica que se integre tal cual, sin redibujarlo.
- NO agregues textos nuevos al diseño que no estén en el brief.
Responde SOLO con el prompt final, sin explicaciones ni comentarios.`;

/* Modelo del director: configúralo en Vercel con la variable DIRECTOR_MODEL
   (ej. el modelo más nuevo disponible en tu cuenta). Si falla, cae al respaldo. */
async function directorDeArte(apiKey, brief, imgs) {
  const modelos = [...new Set([process.env.DIRECTOR_MODEL || "gpt-4o", "gpt-4o-mini"])];
  const content = [{ type: "text", text: DIRECTOR + "\n\nBRIEF:\n" + brief }];
  imgs.slice(0, 3).forEach(u => content.push({ type: "image_url", image_url: { url: u, detail: "high" } }));
  for (const model of modelos) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content }], max_tokens: 1000 })
      });
      if (!r.ok) continue;
      const j = await r.json();
      const t = j.choices?.[0]?.message?.content?.trim();
      if (t && t.length > 100) return t;
    } catch (e) { /* intenta el siguiente modelo */ }
  }
  return null;
}

// ============================================================
// PROMPTS MAESTROS POR SERVICIO
// >>> PARA EDITARLOS TÚ MISMO: cambia libremente el texto entre
// las comillas invertidas (` `), pero NO borres ni modifiques
// las partes que van entre ${ } — esas traen los datos del
// cliente. Guarda, haz commit en GitHub y Vercel republica solo.
// ============================================================
const PROMPTS = {
  tarjetas: (d, o) => {
    const dual = (o.lados || "").includes("vuelta");
    return `Diseño gráfico editorial de una TARJETA DE PRESENTACIÓN premium lista para imprenta. Estilo vectorial plano, NO fotografía.
COMPOSICIÓN DEL LIENZO: ${dual
      ? "DOS tarjetas HORIZONTALES del mismo tamaño, lado a lado sobre un fondo gris muy claro y uniforme. IZQUIERDA = FRENTE, DERECHA = REVERSO."
      : "UNA sola tarjeta HORIZONTAL, grande y centrada, sobre un fondo gris muy claro y uniforme."}
PROPORCIÓN OBLIGATORIA de cada tarjeta: 9 de ancho x 5 de alto (formato horizontal 1.8:1). PROHIBIDO dibujar tarjetas verticales.
ESQUINAS (despunte): ${d.despunte || "las 4 esquinas rectas"}. Dibuja EXACTAMENTE esas esquinas redondeadas y las demás rectas.
ESTILO: ${o.estilo || "Moderno"} — ${styleGuide(o.estilo)}.
ACABADO: ${dual ? "laminado mate" : (o.acabado || "mate")} — no dibujar brillos plásticos.
DISTRIBUCIÓN DEL FRENTE (jerarquía estricta, de mayor a menor):
1) Nombre: «${d.nombre || ""}» — el texto más grande y protagonista, en una sola línea si es posible.
2) Debajo, pequeño, en mayúsculas con letras espaciadas: «${(d.puesto || d.giro || "")}».
3) Zona inferior de contacto, discreta y bien alineada: «${d.negocio || ""}» · teléfono «${d.tel || ""}»${d.extra ? ` · «${d.extra}»` : ""}.
${d.servicios ? `4) ${dual ? "En el REVERSO, bajo el logotipo, " : ""}lista compacta de servicios con viñetas mínimas: «${d.servicios}».` : ""}
${dual ? `DISTRIBUCIÓN DEL REVERSO: minimalista — el logotipo centrado como protagonista y el nombre «${d.negocio || ""}» debajo. Mucho espacio vacío alrededor. Nada más.` : ""}
PALETA: ${d.paleta}. Giro del negocio (solo contexto de diseño, no escribirlo): ${d.giro || "—"}.
${d.logoNote || ""} ${d.refNote || ""}
REGLAS: margen interno de seguridad equivalente a 4 mm (nada pegado al borde), tipografía de datos perfectamente legible, cero adornos innecesarios, NO agregues ningún texto que no esté entre comillas « ».${CALIDAD}${PRESENTACION}${MARCA_DE_AGUA}`;
  },

  lonas: (d, o) => `Diseña una LONA PUBLICITARIA de gran formato lista para impresión.
FORMATO: ${o.medida || "200 x 100 cm"} — respeta EXACTAMENTE esta proporción de ancho por alto. Colores saturados estilo CMYK.
MARGEN PERIMETRAL: deja 5 cm en todo el perímetro completamente libres de textos y elementos importantes${d.ojillos ? ` (llevará ${d.ojillos.split(" ")[0]} ojillos distribuidos uniformemente en las orillas)` : " (zona de bastilla/terminado)"}.
TERMINADO DE PRODUCCIÓN (NO dibujarlo, solo respetarlo en los márgenes): ${d.terminadoNota || "estándar"}.
USO: ${o.uso || "fachada del negocio"}.
ESTILO: ${o.estilo || "Impactante"} — ${styleGuide(o.estilo)}.
CONTENIDO EXACTO, letra por letra (no inventar, no texto de relleno):
- Nombre del negocio: ${d.negocio || "—"}
- TEXTO PRINCIPAL (máxima jerarquía, legible a 10 metros): ${d.titulo || "—"}
- Promoción: ${d.promo || "—"}
- Servicios: ${d.servicios || "—"}
- Teléfono (grande y muy visible): ${d.tel || "—"}
- Dirección/redes: ${d.dir || "—"}
PALETA: ${d.paleta}.
${d.logoNote || ""} ${d.refNote || ""}
REGLAS: máxima legibilidad a distancia, tipografías gruesas, altísimo contraste texto/fondo, el teléfono debe leerse desde un auto en movimiento, máximo 3 zonas de información, NO saturar de texto.${CALIDAD}${PRESENTACION}${MARCA_DE_AGUA}`,

  volantes: (d, o) => `Diseña un VOLANTE PUBLICITARIO (flyer) listo para imprenta.
FORMATO: ${o.tam || "media carta"}, vertical, 300 dpi, 3 mm de sangrado, colores estilo CMYK.
LADOS: ${o.lados || "1 lado"}. ${(o.lados || "").includes("vuelta")
    ? "Diseña FRENTE y VUELTA en el mismo lienzo, lado a lado. Frente: impacto visual con título y oferta. Vuelta: lista de servicios y contacto completo."
    : ""}
ESTILO: ${o.estilo || "Llamativo"} — ${styleGuide(o.estilo)}.
CONTENIDO EXACTO, letra por letra (no inventar, no texto de relleno):
- Negocio: ${d.negocio || "—"}
- TÍTULO PRINCIPAL: ${d.titulo || "—"}
- Oferta clave (destacada en sello o cintillo gráfico): ${d.oferta || "—"}
- Servicios/beneficios (lista con viñetas o íconos): ${d.servicios || "—"}
- Teléfono: ${d.tel || "—"}
- Dirección/redes: ${d.dir || "—"}
PALETA: ${d.paleta}.
${d.logoNote || ""} ${d.refNote || ""}
REGLAS: jerarquía título > oferta > servicios > contacto, llamado a la acción evidente, zona de contacto al pie con buen contraste.${CALIDAD}${PRESENTACION}${MARCA_DE_AGUA}`,

  stickers: (d, o) => `Diseña un STICKER / ETIQUETA impresa a todo color listo para producción.
FORMA: ${o.forma || "circular"}. TAMAÑO: ${d.tamCustom || o.tam || "10 cm"}.
Impresión full color estilo CMYK con línea de troquel (contorno de corte) a 2 mm del diseño; el fondo debe llegar hasta el borde del troquel (sin filos blancos accidentales).
ESTILO: ${o.estilo || "Moderno"} — ${styleGuide(o.estilo)}.
CONTENIDO EXACTO, letra por letra (no inventar):
- Texto principal: ${d.negocio || "—"}
- Uso: ${d.giro || "—"}
- Texto secundario: ${d.texto2 || "—"}
PALETA: ${d.paleta}.
${d.logoNote || ""} ${d.refNote || ""}
REGLAS: composición centrada que funcione en la forma indicada, legible a tamaño real, estilo sticker profesional con personalidad.${CALIDAD}${PRESENTACION}${MARCA_DE_AGUA}`,

  vinil: (d, o) => `Diseña un CORTE DE VINIL decorativo listo para plotter de corte.
APLICACIÓN: ${o.uso || "pared"}. TAMAÑO: ${d.tamCustom || o.tam || "50 cm"}.
TÉCNICA OBLIGATORIA: colores 100% PLANOS y SÓLIDOS (${d.paleta}). PROHIBIDO: degradados, sombras, fotografías, texturas, efectos 3D. Cada color es una capa de vinil independiente. Trazos gruesos y formas cerradas aptas para corte en plotter (grosor mínimo de trazo equivalente a 3 mm a tamaño real). Silueta limpia estilo vector.
ESTILO: ${o.estilo || "Moderno"} — ${styleGuide(o.estilo)}.
CONTENIDO EXACTO, letra por letra (no inventar):
- Texto/nombre principal: ${d.negocio || "—"}
- Objetivo: ${d.giro || "—"}
- Textos adicionales: ${d.texto2 || "—"}
${d.logoNote || ""} ${d.refNote || ""}
Muestra el diseño sobre un fondo neutro claro que simule la superficie (${o.uso || "pared"}), pero el diseño en sí solo con los colores planos indicados.${CALIDAD}${PRESENTACION}${MARCA_DE_AGUA}`
};

// Proporción de imagen según producto
const SIZES = {
  tarjetas: "1536x1024",
  lonas: "1536x1024",
  volantes: "1024x1536",
  stickers: "1024x1024",
  vinil: "1024x1024"
};

function limpiar(v, max = 300) {
  // Sanitiza entradas del cliente: corta longitud y elimina intentos de romper el prompt
  if (typeof v !== "string") return "";
  return v.slice(0, max).replace(/(ignora|olvida|nueva instrucci[oó]n|system prompt)/gi, "");
}

function dataUrlToBlob(u) {
  // Convierte data:image/...;base64 a Blob, con validación de tipo y tamaño (máx 3 MB c/u)
  if (typeof u !== "string") return null;
  const m = u.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > 3 * 1024 * 1024) return null;
  return new Blob([buf], { type: m[1] });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Candado de origen: evita que otros sitios usen tu endpoint (y gasten tu saldo)
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    const origin = req.headers.origin || req.headers.referer || "";
    if (!origin.includes(allowed)) {
      return res.status(403).json({ error: "Origen no autorizado" });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar OPENAI_API_KEY en Vercel" });
  }

  const { product, options = {}, data = {}, logo = null, logo2 = null, refs = [] } = req.body || {};
  const builder = PROMPTS[product];
  if (!builder) {
    return res.status(400).json({ error: "Producto inválido" });
  }

  // Sanitizar todo lo que viene del cliente
  const o = {}, d = {};
  for (const [k, v] of Object.entries(options)) o[k] = limpiar(v, k === "estiloCustom" ? 140 : 80);
  for (const [k, v] of Object.entries(data)) d[k] = limpiar(v, k === "servicios" || k === "texto2" ? 500 : 200);

  // Estilo personalizado escrito por el cliente
  if (o.estilo === "Otro" && o.estiloCustom) o.estilo = o.estiloCustom;

  // Lonas: orientación de la imagen según la medida (vertical u horizontal)
  let size = SIZES[product] || "1024x1024";
  if (product === "lonas") {
    const m = (o.medida || "").match(/([\d.]+)\s*x\s*([\d.]+)/);
    if (m && parseFloat(m[2]) > parseFloat(m[1])) size = "1024x1536";
    else if (m && Math.abs(parseFloat(m[2]) - parseFloat(m[1])) < 0.01) size = "1024x1024";
  }

  let prompt = builder(d, o);

  // Imágenes adjuntas: REFERENCIAS PRIMERO (para que manden la composición), luego logos.
  // En /images/edits, gpt-image-1 le da más peso a las primeras imágenes; por eso, si hay
  // referencia de diseño, va al frente y se le pide REPLICARLA, no solo "inspirarse".
  const images = [];
  const notas = [];

  const refBlobs = (Array.isArray(refs) ? refs.slice(0, 2) : [])
    .map(dataUrlToBlob)
    .filter(Boolean);
  refBlobs.forEach((b) => {
    images.push(b);
    notas.push(`la imagen ${images.length} es la REFERENCIA de diseño: REPLICA su composición, distribución de elementos, formas, estilo tipográfico y esquema de color; sustituye ÚNICAMENTE los textos y el logotipo por los del cliente. Debe parecer de la misma familia visual que esta referencia`);
  });

  const logoBlob = dataUrlToBlob(logo);
  if (logoBlob) {
    images.push(logoBlob);
    notas.push(`la imagen ${images.length} es el LOGOTIPO REAL del cliente para el FRENTE: intégralo tal cual, sin redibujarlo`);
  }

  const logo2Blob = dataUrlToBlob(logo2);
  if (logo2Blob) {
    images.push(logo2Blob);
    notas.push(`la imagen ${images.length} es el logotipo para el REVERSO: úsalo solo en el reverso, tal cual, sin redibujarlo`);
  }

  if (notas.length) prompt += `\nIMÁGENES ADJUNTAS: ${notas.join("; ")}.`;

  // Paso "director de arte": enriquece el brief mirando logo y referencias
  const dirImgs = [...(Array.isArray(refs) ? refs.slice(0, 2) : []), logo, logo2]
    .filter(u => typeof u === "string" && u.startsWith("data:image"));
  const enriquecido = await directorDeArte(apiKey, prompt, dirImgs);
  // Aunque el director reescriba el brief, REINYECTAMOS las reglas duras del producto
  // para que nunca se pierdan (proporciones, mate dual, despunte, vinil plano, etc.).
  if (enriquecido) prompt = enriquecido + reglasDuras(product, d, o) + CALIDAD + PRESENTACION + MARCA_DE_AGUA;

  try {
    let r;
    if (images.length) {
      // Con imágenes → endpoint de edición (acepta imágenes de entrada)
      const form = new FormData();
      form.append("model", process.env.IMAGE_MODEL || "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", "high");
      form.append("n", "1");
      images.forEach((bl, i) => form.append("image[]", bl, `img${i + 1}.png`));
      r = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: form
      });
    } else {
      // Solo texto → endpoint de generación
      r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.IMAGE_MODEL || "gpt-image-1",
          prompt,
          size,
          quality: "high", // "high" = texto mucho más limpio (~$0.19/img) · "medium" ~$0.06 · "low" ~$0.02
          n: 1
        })
      });
    }

    const out = await r.json();

    if (!r.ok) {
      const msg = out?.error?.message || "Error en la API de OpenAI";
      return res.status(502).json({ error: msg });
    }

    const b64 = out.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: "La API no devolvió imagen" });

    // OJO: nunca devolvemos el prompt al navegador — solo la imagen
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Error inesperado" });
  }
}
