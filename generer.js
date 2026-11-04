// Pont entre l'appli et le service d'images fal.ai.
// La clé du service reste ICI (variable FAL_KEY sur Netlify), jamais dans l'appli.
// Réglages à créer sur Netlify : FAL_KEY (clé fal.ai) et CLE_ACCES (ton mot de passe).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Cle",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Méthode refusée" };

  const cle = process.env.CLE_ACCES || "";
  const recue = event.headers["x-cle"] || event.headers["X-Cle"] || "";
  if (cle && recue !== cle) return { statusCode: 401, headers: CORS, body: "Accès refusé" };
  if (!process.env.FAL_KEY) return { statusCode: 500, headers: CORS, body: "FAL_KEY manquante sur Netlify" };

  let prompt = "";
  try { prompt = String(JSON.parse(event.body || "{}").prompt || "").trim(); } catch (e) {}
  if (!prompt || prompt.length > 1500) return { statusCode: 400, headers: CORS, body: "Prompt vide ou trop long" };

  try {
    const r = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { Authorization: "Key " + process.env.FAL_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!r.ok) return { statusCode: 502, headers: CORS, body: "Le service d'images a répondu " + r.status };
    const j = await r.json();
    const img = j.images && j.images[0];
    if (!img || !img.url) return { statusCode: 502, headers: CORS, body: "Réponse sans image" };

    const f = await fetch(img.url);
    const buf = Buffer.from(await f.arrayBuffer());
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": img.content_type || "image/jpeg" },
      body: buf.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: "Erreur : " + e.message };
  }
};
