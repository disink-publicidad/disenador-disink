// ============================================================
// /api/order — Guarda el pedido PAGADO en Supabase y genera
// los PROMPTS con IA (texto). NO genera imágenes.
//   POST {session_id, order}  -> verifica el pago, crea prompts, guarda. Devuelve {ok, id}.
//   GET  ?studio=CLAVE        -> lista de pedidos pagados + sus prompts (solo Disink).
// Variables en Vercel:
//   STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   OPENAI_API_KEY, STUDIO_KEY, (opcional) PROMPT_MODEL
// ============================================================

const PAQ = {
  "Básico · $80":   { nombre:"Básico",  regalo:false, port:{n:8, med:"6 cm", forma:"circulares"},      datos:{med:"9×5 cm"},  tira:{n:40, med:"5×1 cm"} },
  "Premium · $130": { nombre:"Premium", regalo:true,  port:{n:5, med:"10×15 cm", forma:"tipo portada"}, datos:{med:"9×5 cm"},  tira:{n:60, med:"5×1 cm"} },
  "Único · $170":   { nombre:"Único",   regalo:true,  port:{n:8, med:"15×15 cm", forma:"tipo portada"}, datos:{med:"10×5 cm"}, tira:{n:75, med:"5×1 cm"} }
};

function parseMed(sz){ const t=(sz||"").replace(",", "."); const m=t.match(/([\d.]+)\s*[x×X]\s*([\d.]+)/); if(m) return {w:+m[1],h:+m[2]}; const c=t.match(/([\d.]+)/); const v=c?+c[1]:5; return {w:v,h:v}; }
function fitPerSheet(w,h){ const SW=33.02,SH=48.26,g=0.4; if(!w||!h) return 0; const a=Math.floor((SW+g)/(w+g))*Math.floor((SH+g)/(h+g)); const b=Math.floor((SW+g)/(h+g))*Math.floor((SH+g)/(w+g)); return Math.max(a,b,0); }
function planImpresion(items){ let total=0; const L=items.map(t=>{ const {w,h}=parseMed(t.med); const per=fitPerSheet(w,h); const hojas=per>0?Math.ceil(t.n/per):1; total+=hojas; return `- ${t.nombre}: ${t.n} pza(s) de ${t.med} · ~${per} por hoja → ${hojas} hoja(s).`; }); return `PLAN DE IMPRESIÓN (hoja 13×19"):\n${L.join("\n")}\nTOTAL: ${total} hoja(s).`; }

// Prompts base (deterministas, con los datos EXACTOS del cliente)
function promptsBase(order){
  const d = order.data||{}, o = order.options||{};
  const q = PAQ[o.paquete] || PAQ["Básico · $80"];
  const materias = (d.materiasArr||[]);
  const matN = materias.length;
  const matTxt = matN ? materias.map(m=>`«${m}»`).join(", ") : "«(sin materias)»";
  const tema = (o.tema||"colorido infantil").replace(/^Otro:\s*/i,"");
  const base = `Estilo: ilustración a todo color estilo sticker premium, tema «${tema}». Impresión 300 DPI, CMYK, línea de troquel/silueta a 2 mm, fondo a color hasta el borde (sin filos blancos). Transcribe cada texto entre « » EXACTAMENTE letra por letra. SIN marcas de agua.`;
  const portada = `PIEZA 1 de 3 — PORTADA/CUADERNO. Diseña UNA etiqueta ${q.port.forma} de ${q.port.med}. ${base}\nContenido: ilustración protagonista del tema + el NOMBRE «${d.nombre||""}» en un listón o marco decorativo, bien legible.\nEntrega UNA pieza limpia (se imprimirán ${q.port.n} copias).`;
  const materia = `PIEZA 2 de 3 — ETIQUETAS DE MATERIAS. Diseña un JUEGO de etiquetas rectangulares de ${q.datos.med}, mismo layout, una por materia, en cuadrícula. ${base}\nCada etiqueta: ilustración del tema a un costado + recuadro con el TÍTULO de la materia arriba y debajo los datos: Nombre «${d.nombre||""}», Escuela «${d.escuela||""}», Grado «${d.grado||""}», Grupo «${d.grupo||""}», Maestro(a) «${d.maestro||""}», Teléfono «${d.tel||""}».\nGenera UNA por cada materia (${matN}): ${matTxt}.`;
  const tira = `PIEZA 3 de 3 — TIRAS LÁPICES Y COLORES. Diseña UNA tira horizontal de ${q.tira.med}. ${base}\nContenido: solo el NOMBRE «${d.nombre||""}» con un mini ícono del tema.\nEntrega UNA pieza limpia (se imprimirán ${q.tira.n} copias).`;
  const plan = planImpresion([
    { nombre:"Portadas", n:parseInt(d.portN)||q.port.n, med:d.portMed||q.port.med },
    { nombre:"Materias", n:matN, med:d.matMed||q.datos.med },
    { nombre:"Tiras", n:parseInt(d.tiraN)||q.tira.n, med:d.tiraMed||q.tira.med }
  ]);
  return { portada, materia, tira, plan };
}

// Mejora los prompts con IA (texto). Si falla, regresa los base.
async function mejorarConIA(base, order){
  const key = process.env.OPENAI_API_KEY;
  if(!key) return base;
  const model = process.env.PROMPT_MODEL || "gpt-4o-mini";
  const instru = `Eres director de arte senior de una imprenta. Recibirás 3 prompts base para generar etiquetas escolares. Reescríbelos para que sean MUCHO más profesionales, detallados y específicos (composición, tipografía, paleta acorde al tema, elementos decorativos), pero SIN cambiar ni una letra de los textos entre « » (son datos reales del cliente), y conservando medidas, cantidades y reglas. Devuelve EXCLUSIVAMENTE un JSON válido con las claves "portada", "materia", "tira" (strings). Nada más.`;
  try{
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages:[
          { role:"system", content:instru },
          { role:"user", content:`TEMA: ${(order.options||{}).tema||""}\n\nPORTADA:\n${base.portada}\n\nMATERIA:\n${base.materia}\n\nTIRA:\n${base.tira}` }
        ],
        response_format:{ type:"json_object" },
        temperature:0.5,
        max_tokens:1600
      })
    });
    if(!r.ok) return base;
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content;
    const p = JSON.parse(txt);
    if(p && p.portada && p.materia && p.tira) return { portada:p.portada, materia:p.materia, tira:p.tira, plan:base.plan };
  }catch(e){ /* usa base */ }
  return base;
}

async function stripePaid(sid, key){
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions/"+encodeURIComponent(sid), { headers:{ "Authorization":`Bearer ${key}` } });
  if(!r.ok) return false;
  const j = await r.json();
  return j.payment_status === "paid";
}

async function sb(method, path, body){
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  const opt = { method, headers:{ "apikey":key, "Authorization":`Bearer ${key}` } };
  if(body){ opt.headers["Content-Type"]="application/json"; opt.headers["Prefer"]="return=representation"; opt.body=JSON.stringify(body); }
  const r = await fetch(url+"/rest/v1/"+path, opt);
  return { ok:r.ok, json: await r.json().catch(()=>null) };
}

export default async function handler(req, res){
  if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return res.status(500).json({ error:"Falta configurar SUPABASE_URL y SUPABASE_SERVICE_KEY en Vercel" });

  // ---- LISTA de pedidos (solo Disink con la llave) ----
  if(req.method === "GET"){
    const studio = req.query.studio;
    if(!process.env.STUDIO_KEY || studio !== process.env.STUDIO_KEY)
      return res.status(403).json({ error:"No autorizado" });
    const { ok, json } = await sb("GET", "pedidos?select=*&order=created_at.desc&limit=100");
    if(!ok) return res.status(502).json({ error:"Error leyendo pedidos" });
    return res.status(200).json({ pedidos: json });
  }

  // ---- CREAR pedido pagado ----
  if(req.method === "POST"){
    const { session_id, order } = req.body || {};
    if(!session_id || !order) return res.status(400).json({ error:"Faltan datos del pedido" });
    // 1) verificar el pago con Stripe
    const paid = await stripePaid(session_id, process.env.STRIPE_SECRET_KEY);
    if(!paid) return res.status(402).json({ error:"El pago no está confirmado" });
    // 2) evitar duplicados (mismo pago)
    const dup = await sb("GET", "pedidos?select=id&session_id=eq."+encodeURIComponent(session_id));
    if(dup.ok && Array.isArray(dup.json) && dup.json.length){
      return res.status(200).json({ ok:true, id: dup.json[0].id, dup:true });
    }
    // 3) generar prompts (base + mejora IA)
    const base = promptsBase(order);
    const prompts = await mejorarConIA(base, order);
    // 4) guardar
    const d = order.data||{}, o = order.options||{};
    const row = {
      session_id,
      paquete: o.paquete || "",
      estado: "pagado",
      data: { nombre:d.nombre, escuela:d.escuela, grado:d.grado, grupo:d.grupo, maestro:d.maestro, tel:d.tel, tema:(o.tema||"").replace(/^Otro:\s*/i,""), materias:(d.materiasArr||[]) },
      prompts
    };
    const ins = await sb("POST", "pedidos", row);
    if(!ins.ok) return res.status(502).json({ error:"No se pudo guardar el pedido" });
    const id = Array.isArray(ins.json) && ins.json[0] ? ins.json[0].id : null;
    return res.status(200).json({ ok:true, id });
  }

  return res.status(405).json({ error:"Método no permitido" });
}
