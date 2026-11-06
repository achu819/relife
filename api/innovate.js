export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: "Supabase setup is incomplete. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel." });
  }
  if (!cloudflareToken || !cloudflareAccountId) {
    return res.status(503).json({ error: "Cloudflare AI is not configured. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Vercel." });
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
    const imagePrompt = `Edit the uploaded real photo into a photorealistic after-transformation concept for ReLife. Preserve the same object or room identity, camera angle, proportions and fixed architecture. Apply this specific transformation: ${description || "Choose the most practical sustainable second-life transformation clearly supported by the photo"}. Category: ${category}. Make the result realistic and achievable on a modest budget using reused materials. Do not replace the subject with an unrelated object or scene. Do not add text, labels, watermarks or people. Produce one clear after image.`;
    if (mode === "guide") {
      const guidePrompt = `You are ReLife's practical sustainable-design assistant. Carefully inspect the attached photo and create a safe, realistic, low-cost reuse plan. Category: ${category}. Extra context from the user: ${description || "None supplied"}. Base your ideas on objects and features actually visible. Never invent measurements or hidden materials. Prioritize reuse, repair, locally available materials, low-cost methods, accessibility and safety. For spaces, preserve doors, windows, ventilation and circulation. For objects, identify the likely object and suggest genuinely useful second-life options. Avoid structural, electrical, plumbing or load-bearing work unless a qualified professional is involved. Return ONLY a valid JSON object, without markdown fences or commentary, using exactly this structure: {"title":"short project name","what_i_see":"visible facts and uncertainties","best_idea":"recommended transformation","why_it_works":"short explanation","materials":[{"name":"material","quantity":"rough quantity","reuse_tip":"how to source or reuse"}],"tools":["tool"],"steps":[{"step":1,"title":"...","detail":"...","time":"..."}],"budget":{"low":"...","high":"...","currency":"INR","saving_tips":["..."]},"safety":["..."],"alternatives":[{"title":"...","description":"..."}],"care_and_maintenance":["..."]}. Use approximate Indian rupees and clearly label the budget as an estimate. Include 3 to 6 practical steps. Keep every field concise and useful.`;
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`;
      try {
        // Cloudflare requires accepting Meta's model license before first use.
        const licenseResponse = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${cloudflareToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "agree" }),
          signal: AbortSignal.timeout(15000)
        });
        const licensePayload = await licenseResponse.json().catch(() => ({}));
        if (!licenseResponse.ok || licensePayload?.success === false) {
          const detail = licensePayload?.errors?.map(item => item.message).filter(Boolean).join("; ");
          return res.status(licenseResponse.status || 502).json({
            error: "Cloudflare's photo-analysis model needs its first-time setup completed.",
            detail: detail || "The model license agreement request was not accepted."
          });
        }
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${cloudflareToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: guidePrompt,
            image: `data:${mimeType};base64,${imageBase64}`,
            max_tokens: 1800,
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(45000)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          const detail = payload?.errors?.map(item => item.message).filter(Boolean).join("; ");
          return res.status(response.status || 502).json({
            error: "Cloudflare could not analyse this photo.",
            detail: detail || "The photo-analysis service returned an unsuccessful response."
          });
        }
        const rawText = payload?.result?.response || payload?.result?.description || payload?.result?.output || "";
        const cleaned = String(rawText).trim().replace(/^`{3}(?:json)?\s*/i, "").replace(/\s*`{3}$/i, "").trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
        let guide;
        try { guide = JSON.parse(jsonText); }
        catch { return res.status(502).json({ error: "Cloudflare analysed the photo but returned an unreadable reuse plan.", detail: cleaned.slice(0, 700) || "The model returned an empty response." }); }
        if (!guide.title || !guide.best_idea || !Array.isArray(guide.steps) || !guide.steps.length) {
          return res.status(502).json({ error: "The photo analysis returned an incomplete reuse plan. Please try once more.", detail: "One or more required guide fields were missing." });
        }
        return res.status(200).json({ guide, modelUsed: "@cf/meta/llama-3.2-11b-vision-instruct" });
      } catch (err) {
        const detail = err?.name === "TimeoutError" || err?.name === "AbortError"
          ? "Cloudflare photo analysis timed out. Try a smaller photo."
          : (err?.message || "Could not reach Cloudflare Workers AI.");
        return res.status(502).json({ error: "The ReLife photo-analysis service could not complete the request.", detail });
      }
    }
    if (mode === "image") {
      try {
        const form = new FormData();
        const sourceBytes = Buffer.from(imageBase64, "base64");
        const sourceBlob = new Blob([sourceBytes], { type: mimeType });
        form.append("prompt", imagePrompt);
        form.append("input_image_0", sourceBlob, "relife-source." + (mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"));
        form.append("width", "768");
        form.append("height", "1024");
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${cloudflareToken}` },
            body: form,
            signal: AbortSignal.timeout(45000)
          }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          const detail = payload?.errors?.map(item => item.message).filter(Boolean).join("; ");
          return res.status(response.status || 502).json({
            error: "Cloudflare could not generate the transformation image.",
            detail: detail || "The image service returned an unsuccessful response."
          });
        }
        const generatedImage = payload?.result?.image;
        if (typeof generatedImage !== "string" || !generatedImage.length) {
          return res.status(502).json({ error: "Cloudflare completed the request but did not return an image." });
        }
        return res.status(200).json({ imageBase64: generatedImage, mimeType: "image/png", modelUsed: "@cf/black-forest-labs/flux-2-klein-4b" });
      } catch (err) {
        const detail = err?.name === "TimeoutError" || err?.name === "AbortError"
          ? "Cloudflare image generation timed out. Try a smaller photo."
          : (err?.message || "Could not reach Cloudflare Workers AI.");
        return res.status(502).json({ error: "The ReLife image service could not complete the request.", detail });
      }
    }

  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unexpected server error." });
  }
}
