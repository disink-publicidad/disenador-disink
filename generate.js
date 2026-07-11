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
PRESENTACIÓN: entrega ÚNICAMENTE el diseño plano visto de frente ocupando todo el lienzo. SIN mockup fotográfico, sin manos, sin mesas, sin sombras de escritorio, sin marcos.`;

const CALIDAD = `
CALIDAD: nivel de estudio de diseño profesional premiado. Composición con retícula, jerarquía tipográfica impecable, espaciado consistente, alineaciones perfectas. Máximo 2 familias tipográficas.`;

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

// ---------- PROMPTS MAESTROS POR SERVICIO ----------
const PROMPTS = {
  tarjetas: (d, o) => `Diseña una TARJETA DE PRESENTACIÓN profesional lista para imprenta.
FORMATO: 9 x 5 cm horizontal, 3 mm de sangrado por lado, 300 dpi, colores estilo CMYK, margen de seguridad de 4 mm (ningún texto ni logo pegado al borde).
LADOS: ${o.lados || "1 lado"}. ${(o.lados || "").includes("vuelta")
    ? "Diseña FRENTE y REVERSO en el mismo lienzo (frente a la izquierda, reverso a la derecha, separados). Frente: nombre y datos de contacto. Reverso: logotipo/nombre del negocio en grande sobre fondo de marca. ACABADO: laminado MATE (evita texturas brillantes en el diseño)."
    : "Todo el contenido en un solo frente, bien jerarquizado."}
ESTILO: ${o.estilo || "Moderno"} — ${styleGuide(o.estilo)}.
ACABADO: ${(o.lados || "").includes("vuelta") ? "Mate (obligatorio en frente y vuelta)" : (o.acabado || "Mate")}.
ESQUINAS (despunte): ${d.despunte || "las 4 esquinas rectas"}. Si hay esquinas redondeadas, dibuja la tarjeta con EXACTAMENTE esas esquinas redondeadas y las demás rectas.
CONTENIDO EXACTO, letra por letra (no inventar datos, no texto de relleno, no lorem ipsum):
- Nombre: ${d.nombre || "—"}
- Puesto: ${d.puesto || "—"}
- Negocio: ${d.negocio || "—"} (giro: ${d.giro || "—"})
- Teléfono: ${d.tel || "—"}
- Otros datos: ${d.extra || "—"}
PALETA: ${d.paleta}.
${d.logoNote || ""} ${d.refNote || ""}
REGLAS: tipografía legible mínimo equivalente a 7 pt, jerarquía nombre > puesto > contacto, composición equilibrada. NO agregues texto que no esté en la lista. Verifica la ortografía exacta de cada dato.${CALIDAD}${PRESENTACION}${MARCA_DE_AGUA}`,

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

  const { product, options = {}, data = {}, logo = null, refs = [] } = req.body || {};
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

  // Imágenes adjuntas: logo real + hasta 2 referencias
  const images = [];
  const notas = [];
  const logoBlob = dataUrlToBlob(logo);
  if (logoBlob) { images.push(logoBlob); notas.push("la imagen 1 es el LOGOTIPO REAL del cliente: intégralo tal cual, sin redibujarlo"); }
  (Array.isArray(refs) ? refs.slice(0, 2) : []).forEach(u => {
    const b = dataUrlToBlob(u);
    if (b) { images.push(b); notas.push(`la imagen ${images.length} es una REFERENCIA de estilo: úsala solo como inspiración visual`); }
  });
  if (notas.length) prompt += `\nIMÁGENES ADJUNTAS: ${notas.join("; ")}.`;

  try {
    let r;
    if (images.length) {
      // Con imágenes → endpoint de edición (acepta imágenes de entrada)
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", "medium");
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
          model: "gpt-image-1",
          prompt,
          size,
          quality: "medium", // "low" = más barato, "high" = mejor calidad
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
