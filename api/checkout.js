// ============================================================
// /api/checkout — Pago con Stripe (paquete completo).
// POST  -> crea la sesión de pago y devuelve la URL de Stripe.
// GET ?session_id=xxx -> verifica si ese pago quedó "paid".
// Variable en Vercel: STRIPE_SECRET_KEY (sk_test_... o sk_live_...)
// ============================================================

// Precios en CENTAVOS de peso (MXN). Edítalos aquí cuando quieras.
const PRECIOS = {
  "Básico · $80":   { nombre: "Paquete Básico · Etiquetas escolares",  monto: 8000  },
  "Premium · $130": { nombre: "Paquete Premium · Etiquetas escolares", monto: 13000 },
  "Único · $170":   { nombre: "Paquete Único · Etiquetas escolares",   monto: 17000 }
};

async function stripe(path, method, params, key) {
  const opt = { method, headers: { "Authorization": `Bearer ${key}` } };
  if (params) {
    opt.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opt.body = new URLSearchParams(params).toString();
  }
  const r = await fetch("https://api.stripe.com/v1/" + path, opt);
  const json = await r.json();
  return { ok: r.ok, json };
}

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: "Falta configurar STRIPE_SECRET_KEY en Vercel" });

  const host = req.headers.host;
  const base = `https://${host}`;

  // ---- VERIFICAR un pago ----
  if (req.method === "GET") {
    const sid = req.query.session_id;
    if (!sid) return res.status(400).json({ error: "Falta session_id" });
    const { ok, json } = await stripe("checkout/sessions/" + encodeURIComponent(sid), "GET", null, key);
    if (!ok) return res.status(502).json({ error: json?.error?.message || "No se pudo verificar el pago" });
    return res.status(200).json({
      paid: json.payment_status === "paid",
      amount: json.amount_total,
      currency: json.currency
    });
  }

  // ---- CREAR la sesión de pago ----
  if (req.method === "POST") {
    const { paquete } = req.body || {};
    const p = PRECIOS[paquete];
    if (!p) return res.status(400).json({ error: "Paquete inválido" });

    const params = {
      "mode": "payment",
      "success_url": `${base}/?paid={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${base}/?cancel=1`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "mxn",
      "line_items[0][price_data][unit_amount]": String(p.monto),
      "line_items[0][price_data][product_data][name]": p.nombre
    };
    const { ok, json } = await stripe("checkout/sessions", "POST", params, key);
    if (!ok) return res.status(502).json({ error: json?.error?.message || "No se pudo iniciar el pago" });
    return res.status(200).json({ url: json.url, id: json.id });
  }

  return res.status(405).json({ error: "Método no permitido" });
}
