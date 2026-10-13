// Guarda y entrega, tal cual llegan, los trabajos de los docentes.
// El contenido llega CIFRADO desde el navegador: el servidor no puede leerlo.
export async function onRequest({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f]{64}$/.test(id)) return new Response("id invalido", { status: 400 });

  if (request.method === "GET") {
    const r = await env.DB.prepare("SELECT body FROM trabajos WHERE id = ?1").bind(id).first();
    if (!r) return new Response("", { status: 404, headers: { "cache-control": "no-store" } });
    return new Response(r.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
  if (request.method === "PUT") {
    const body = await request.text();
    if (body.length > 600000) return new Response("demasiado grande", { status: 413 });
    await env.DB.prepare(
      "INSERT INTO trabajos (id, body, upd) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET body = ?2, upd = ?3"
    ).bind(id, body, Date.now()).run();
    return new Response("ok", { headers: { "cache-control": "no-store" } });
  }
  return new Response("metodo no permitido", { status: 405 });
}
