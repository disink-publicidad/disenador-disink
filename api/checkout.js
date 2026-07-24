// ============================================================
// /api/checkout — Pago con Stripe. El PRECIO se lee de la config
// (tabla "ajustes" en Supabase), editable por Recepción en el panel.
//   POST {product, opts}  -> crea la sesión de pago (monto calculado en el server)
//   GET  ?session_id=xxx  -> verifica si el pago quedó "paid"
// Vars: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// ============================================================

// Precios de RESPALDO (por si la config aún no está puesta). En PESOS.
const DEFAULTS = {
  regreso: { "Básico · $80": 80, "Premium · $130": 130, "Único · $170": 170 },
  stickers: { chico: 120, mediano: 180, grande: 250 }
};

async function sbGetAjustes() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { precios: {} };
  try {
    const r = await fetch(url + "/rest/v1/ajustes?id=eq.1&select=*", { headers: { "apikey": key, "Authorization": `Bearer ${key}` } });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return j[0];
  } catch (e) {}
  return { precios: {} };
}

function sizeKey(t) {
  t = (t || "").toLowerCase();
  if (t.includes("chico")) return "chico";
  if (t.includes("mediano")) return "mediano";
  if (t.includes("grande")) return "grande";
  return null;
}

// Devuelve { nombre, centavos } o null (si no hay precio => se cotiza aparte)
function calcularItem(product, opts, precios) {
  const P = precios || {};
  if (product === "regreso") {
    const paq = opts.paquete;
    const pesos = (P.regreso && P.regreso[paq] != null) ? P.regreso[paq] : DEFAULTS.regreso[paq];
    if (pesos == null) return null;
    return { nombre: `Etiquetas escolares · ${(paq || "").split(" · ")[0]}`, centavos: Math.round(pesos * 100) };
  }
  if (product === "stickers") {
    const k = sizeKey(opts.tam);
    if (!k) return null; // "Otra medida" -> cotización
    const pesos = (P.stickers && P.stickers[k] != null) ? P.stickers[k] : DEFAULTS.stickers[k];
    if (pesos == null) return null;
    const nom = { chico: "Chico", mediano: "Mediano", grande: "Grande" }[k];
    return { nombre: `Stickers · ${nom}`, centavos: Math.round(pesos * 100) };
  }
  return null;
}

async function stripe(path, method, params, key) {
  const opt = { method, headers: { "Authorization": `Bearer ${key}` } };
  if (params) { opt.headers["Content-Type"] = "application/x-www-form-urlencoded"; opt.body = new URLSearchParams(params).toString(); }
  const r = await fetch("https://api.stripe.com/v1/" + path, opt);
  return { ok: r.ok, json: await r.json() };
}

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "Falta configurar STRIPE_SECRET_KEY en Vercel" });
  const base = `https://${req.headers.host}`;

  if (req.method === "GET") {
    const sid = req.query.session_id;
    if (!sid) return res.status(400).json({ error: "Falta session_id" });
    const { ok, json } = await stripe("checkout/sessions/" + encodeURIComponent(sid), "GET", null, key);
    if (!ok) return res.status(502).json({ error: json?.error?.message || "No se pudo verificar el pago" });
    return res.status(200).json({ paid: json.payment_status === "paid", amount: json.amount_total, currency: json.currency });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const product = body.product;
    // compat: regreso mandaba {paquete}; ahora mandamos {opts}
    const opts = body.opts || (body.paquete ? { paquete: body.paquete } : {});
    const a = await sbGetAjustes();
    const item = calcularItem(product, opts, a.precios);
    if (!item) return res.status(400).json({ error: "Este producto/medida se cotiza por WhatsApp (sin precio fijo)." });

    const params = {
      "mode": "payment",
      "success_url": `${base}/?paid={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${base}/?cancel=1`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "mxn",
      "line_items[0][price_data][unit_amount]": String(item.centavos),
      "line_items[0][price_data][product_data][name]": item.nombre
    };
    const { ok, json } = await stripe("checkout/sessions", "POST", params, key);
    if (!ok) return res.status(502).json({ error: json?.error?.message || "No se pudo iniciar el pago" });
    return res.status(200).json({ url: json.url, id: json.id });
  }

  return res.status(405).json({ error: "Método no permitido" });
}
