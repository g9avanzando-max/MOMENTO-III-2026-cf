// Contador anónimo de uso. No guarda nombres, instituciones ni códigos: solo conteos.
const EVENTOS = ["visita", "ingreso", "docente", "pdf"];
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const json = (o) =>
  new Response(JSON.stringify(o), { headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequest({ request, env }) {
  const url = new URL(request.url);

  if (request.method === "POST") {
    const e = url.searchParams.get("e");
    if (!EVENTOS.includes(e)) return new Response("evento invalido", { status: 400 });
    const sube = env.DB.prepare(
      "INSERT INTO eventos (dia, ev, n) VALUES (?1, ?2, 1) ON CONFLICT(dia, ev) DO UPDATE SET n = n + 1"
    ).bind(hoy(), e);
    if (e === "visita") {
      const res = await env.DB.batch([
        sube,
        env.DB.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM eventos WHERE ev = 'visita'"),
      ]);
      return json({ n: res[1].results[0].n });
    }
    await sube.run();
    return new Response("ok");
  }

  if (request.method === "GET") {
    if (url.searchParams.get("public") === "1") {
      const r = await env.DB.prepare("SELECT ev, SUM(n) AS n FROM eventos GROUP BY ev").all();
      const t = {};
      r.results.forEach((x) => (t[x.ev] = x.n));
      return json({ visita: t.visita || 0, ingreso: t.ingreso || 0, docente: t.docente || 0, pdf: t.pdf || 0 });
    }
    const clave = env.STATS_KEY;
    if (!clave || url.searchParams.get("key") !== clave) return new Response("no autorizado", { status: 401 });
    const rows = (await env.DB.prepare("SELECT dia, ev, n FROM eventos").all()).results;
    const dias = {}, total = {};
    rows.forEach((r) => {
      (dias[r.dia] = dias[r.dia] || {})[r.ev] = r.n;
      total[r.ev] = (total[r.ev] || 0) + r.n;
    });
    return json({ total, dias });
  }
  return new Response("metodo no permitido", { status: 405 });
}
