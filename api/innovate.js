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
    const model = "gemini-3.1-flash-image";
    const parts = mode === "guide"
      ? [{ text: guidePrompt }, imagePart]
      : [{ text: `Edit the uploaded real photo into a photorealistic after-transformation concept for ReLife. Keep the same room/object identity, camera angle, proportions and major fixed architecture. Apply this concept: ${description || "a practical, attractive sustainable reuse transformation"}. Category: ${category}. Make the result realistic, achievable on a modest budget, with reused materials and natural lighting. Do not add text, labels, watermarks, people or impossible structural changes. Produce one clear after image.` }, imagePart];
    const generationConfig = mode === "guide"
      ? { responseMimeType: "application/json", temperature: 0.35 }
      : { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "4:5", imageSize: "1K" } };
    const response = mode === "guide"
      ? await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey, "Api-Revision": "2026-05-20" },
          body: JSON.stringify({
            model: "gemini-3.8-flash",
            input: [
              { type: "text", text: guidePrompt },
              { type: "image", mime_type: mimeType, data: imageBase64 }
            ],
            generation_config: { temperature: 0.35, max_output_tokens: 1800 }
          }),
          signal: AbortSignal.timeout(50000)
        })
      : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig })
        });
    const payload = await response.json();
    if (mode === "guide" && payload?.status && payload.status !== "completed") {
      return res.status(502).json({ error: `Gemini interaction did not complete (status: ${payload.status}). Please try again.` });
    }
    if (!response.ok) {
      const detail = payload?.error?.message || "The AI provider could not complete the request.";
      return res.status(response.status === 429 ? 429 : 502).json({ error: detail });
    }
    if (mode === "guide") {
      const outputParts = payload?.steps?.filter(step => step.type === "model_output").flatMap(step => step.content || []) || [];
      const raw = outputParts.map(p => p.text || "").join("").trim().replace(/^`{3}(?:json)?/i, "").replace(/`{3}$/,"").trim();
      if (!raw) return res.status(502).json({ error: "The AI returned an empty guide. Please try again." });
      
      try { return res.status(200).json({ guide: JSON.parse(raw) }); }
      catch { return res.status(502).json({ error: "The AI returned an unreadable guide. Please try again." }); }
    }
    const outputParts = payload?.candidates?.[0]?.content?.parts || [];
    const generated = outputParts.find(p => p.inline_data?.data || p.inlineData?.data);
    const data = generated?.inline_data || generated?.inlineData;
    if (!data?.data) return res.status(502).json({ error: "The image model returned no image. Please try again." });
    return res.status(200).json({ imageBase64: data.data, mimeType: data.mime_type || data.mimeType || "image/png" });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unexpected server error." });
  }
}
