export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    return res.status(503).json({ error: "AI setup is incomplete. Add GEMINI_API_KEY in Vercel. Keep it server-side; never use a VITE_ prefix." });
  }
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) return res.status(401).json({ error: "Please sign in to ReLife first." });
  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: authorization }
    });
    if (!userResponse.ok) return res.status(401).json({ error: "Your session expired. Please sign in again." });
    const user = await userResponse.json();
    const { mode, imageBase64, mimeType, description = "", category = "space" } = req.body || {};
    if (!["guide", "image"].includes(mode)) return res.status(400).json({ error: "Unknown generation mode." });
    if (typeof imageBase64 !== "string" || imageBase64.length < 100 || imageBase64.length > 5_500_000) {
      return res.status(400).json({ error: "Please upload a valid image smaller than 4 MB." });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return res.status(400).json({ error: "Use a JPG, PNG or WebP image." });
    const guidePrompt = `You are ReLife's practical sustainable-design assistant. Inspect the user's photo and create a safe, realistic, low-cost reuse plan. Category: ${category}. Extra context: ${description || "None supplied"}. Do not claim measurements or materials you cannot see. If uncertain, say so. Prioritize reuse, repair, locally available materials, low-cost methods, accessibility and safety. For spaces, preserve doors, windows, ventilation and circulation. For objects, identify the likely object and suggest multiple genuinely useful second-life options. Avoid structural, electrical, plumbing or load-bearing work unless a qualified professional is involved. Return ONLY valid JSON with this shape: {"title":"short project name","what_i_see":"visible facts and uncertainties","best_idea":"recommended transformation","why_it_works":"short explanation","materials":[{"name":"material","quantity":"rough quantity","reuse_tip":"how to source/reuse"}],"tools":["tool"],"steps":[{"step":1,"title":"...","detail":"...","time":"..."}],"budget":{"low":"...","high":"...","currency":"INR","saving_tips":["..."]},"safety":["..."],"alternatives":[{"title":"...","description":"..."}],"care_and_maintenance":["..."]}. Budget should be approximate Indian rupees and clearly labeled as an estimate. Keep steps specific and actionable.`;
    const imagePart = { inline_data: { mime_type: mimeType, data: imageBase64 } };
    const guideContents = [{ role: "user", parts: [{ text: guidePrompt }, imagePart] }];
    const imagePrompt = `Edit the uploaded real photo into a photorealistic after-transformation concept for ReLife. Preserve the same object or room identity, camera angle, proportions and fixed architecture. Apply this specific transformation: ${description || "Choose the most practical sustainable second-life transformation clearly supported by the photo"}. Category: ${category}. Make the result realistic and achievable on a modest budget using reused materials. Do not replace the subject with an unrelated object or scene. Do not add text, labels, watermarks or people. Produce one clear after image.`;
    const imageContents = [{ role: "user", parts: [{ text: imagePrompt }, imagePart] }];
    const attempts = mode === "guide"
      ? ["gemini-3.5-flash-lite", "gemini-3.6-flash"]
      : ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image"];
    let lastError = "The AI service is temporarily unavailable.";
    for (const model of attempts) {
      let response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: mode === "guide" ? guideContents : imageContents,
            generationConfig: mode === "guide"
              ? { responseMimeType: "application/json", temperature: 0.25, maxOutputTokens: 1800 }
              : { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "4:5", imageSize: "1K" } }
          }),
          signal: AbortSignal.timeout(18000)
        });
      } catch (err) {
        lastError = err?.name === "TimeoutError" || err?.name === "AbortError"
          ? `${model} timed out`
          : `${model} could not be reached`;
        continue;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = payload?.error?.message || `${model} returned HTTP ${response.status}`;
        if ([400, 401, 403].includes(response.status)) {
          return res.status(response.status).json({ error: lastError });
        }
        continue;
      }
      const outputParts = payload?.candidates?.[0]?.content?.parts || [];
      if (mode === "guide") {
        const raw = outputParts.map(p => p.text || "").join("").trim().replace(/^`{3}(?:json)?/i, "").replace(/`{3}$/,"").trim();
        try {
          const guide = JSON.parse(raw);
          if (!guide.title || !guide.best_idea || !Array.isArray(guide.steps) || !guide.steps.length) {
            lastError = `${model} returned an incomplete plan`;
            continue;
          }
          return res.status(200).json({ guide, modelUsed: model });
        } catch {
          lastError = `${model} returned an unreadable plan`;
          continue;
        }
      }
      const generated = outputParts.find(p => p.inline_data?.data || p.inlineData?.data);
      const data = generated?.inline_data || generated?.inlineData;
      if (data?.data) {
        return res.status(200).json({ imageBase64: data.data, mimeType: data.mime_type || data.mimeType || "image/png", modelUsed: model });
      }
      lastError = `${model} completed without returning an image`;
    }
    return res.status(503).json({
      error: mode === "image"
        ? "Both image-generation models are temporarily unavailable. Please try again shortly; no unrelated placeholder image was shown."
        : "The AI analysis services are temporarily busy. Please try again shortly.",
      detail: lastError
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unexpected server error." });
  }
}
