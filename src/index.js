// Il portone d'ingresso: smista le richieste.
// - /api/... va al cervello di Kōki (il Durable Object), protetto da password se PASSWORD è impostata.
// - tutto il resto è la pagina 3D (cartella public).
// - ogni 15 minuti la sveglia di riserva controlla che il ciclo di vita sia attivo.

export { Koki } from "./koki.js";
import { PLACES, CAT_SPOTS } from "./world.js";

function stub(env) { return env.KOKI.get(env.KOKI.idFromName("koki")); }

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS ? env.ASSETS.fetch(req) : new Response("Kōki", { status: 200 });

    if (url.pathname === "/api/mondo") {
      return Response.json({ luoghi: PLACES, postiGatto: CAT_SPOTS, protetto: !!env.PASSWORD });
    }
    if (env.PASSWORD && url.pathname !== "/api/_sveglia") {
      const key = req.headers.get("x-koki-key") || "";
      if (key !== env.PASSWORD) return Response.json({ errore: "password" }, { status: 401 });
    }
    return stub(env).fetch(req);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(stub(env).fetch("https://koki.internal/api/_sveglia"));
  }
};
