// ============================================================
// /api/config — Ajustes editables por Recepción (precios + prompts).
//   GET                 -> { precios }  (público, el cliente ve precios)
//   GET  (con llave)    -> { precios, prompts }
//   POST (con llave)    -> guarda { precios?, prompts? }
// La clave va por header x-studio-key o ?studio= (== STUDIO_KEY en Vercel).
// Tabla Supabase: ajustes (id=1, precios jsonb, prompts jsonb)
// ============================================================
async function sb(method, path, body) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  const opt = { method, headers: { "apikey": key, "Authorization": `Bearer ${key}` } };
  if (body) { opt.headers["Content-Type"] = "application/json"; opt.headers["Prefer"] = "return=representation"; opt.body = JSON.stringify(body); }
  const r = await fetch(url + "/rest/v1/" + path, opt);
  return { ok: r.ok, json: await r.json().catch(() => null) };
}
async function getAjustes() {
  const { ok, json } = await sb("GET", "ajustes?id=eq.1&select=*");
  if (ok && Array.isArray(json) && json[0]) return json[0];
  return { precios: {}, prompts: {} };
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return res.status(500).json({ error: "Falta SUPABASE_URL / SUPABASE_SERVICE_KEY" });
  const studio = req.query.studio || req.headers["x-studio-key"];
  const esDisink = !!(process.env.STUDIO_KEY && studio && studio === process.env.STUDIO_KEY);

  if (req.method === "GET") {
    const a = await getAjustes();
    const resp = { precios: a.precios || {} };
    if (esDisink) resp.prompts = a.prompts || {};
    return res.status(200).json(resp);
  }
  if (req.method === "POST") {
    if (!esDisink) return res.status(403).json({ error: "No autorizado" });
    const { precios, prompts } = req.body || {};
    const patch = {};
    if (precios) patch.precios = precios;
    if (prompts) patch.prompts = prompts;
    if (!Object.keys(patch).length) return res.status(400).json({ error: "Nada que guardar" });
    const { ok } = await sb("PATCH", "ajustes?id=eq.1", patch);
    if (!ok) return res.status(502).json({ error: "No se pudo guardar" });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Método no permitido" });
}

// exportamos helpers para que checkout/order reusen la config
export { getAjustes };
