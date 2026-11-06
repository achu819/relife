import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";

async function prepareImage(file, maxDimension = 1200) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP photo.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("Could not process this image.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { blob, base64: String(dataUrl).split(",")[1], mimeType: "image/jpeg" };
}

function Guide({ guide }) {
  if (!guide) return null;
  return <div className="innovation-guide">
    <div className="guide-intro"><span className="eyebrow">YOUR RELIFE PLAN</span><h3>{guide.title}</h3><p>{guide.what_i_see}</p></div>
    <div className="guide-highlight"><strong>Recommended transformation</strong><p>{guide.best_idea}</p><small>{guide.why_it_works}</small></div>
    <div className="guide-columns">
      <section><h4>Materials to gather</h4><ul>{(guide.materials || []).map((m,i)=><li key={i}><strong>{m.name}</strong> — {m.quantity}<p>{m.reuse_tip}</p></li>)}</ul><h4>Tools</h4><ul>{(guide.tools || []).map((t,i)=><li key={i}>{t}</li>)}</ul></section>
      <section><h4>Estimated budget</h4><p className="guide-budget">{guide.budget?.low || "—"} – {guide.budget?.high || "—"} {guide.budget?.currency || "INR"}</p><small>Approximate estimate; local prices vary.</small><ul>{(guide.budget?.saving_tips || []).map((t,i)=><li key={i}>{t}</li>)}</ul><h4>Safety first</h4><ul>{(guide.safety || []).map((t,i)=><li key={i}>{t}</li>)}</ul></section>
    </div>
    <section className="guide-steps"><h4>Step-by-step transformation</h4>{(guide.steps || []).map((s,i)=><article key={i}><span>{String(s.step || i+1).padStart(2,"0")}</span><div><strong>{s.title}</strong><p>{s.detail}</p><small>{s.time}</small></div></article>)}</section>
    {guide.alternatives?.length > 0 && <section><h4>Other ideas worth considering</h4><div className="guide-alternatives">{guide.alternatives.map((a,i)=><article key={i}><strong>{a.title}</strong><p>{a.description}</p></article>)}</div></section>}
    {guide.care_and_maintenance?.length > 0 && <section><h4>Keep it useful</h4><ul>{guide.care_and_maintenance.map((t,i)=><li key={i}>{t}</li>)}</ul></section>}
  </div>;
}

export default function InnovationStudio() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("space");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [guide, setGuide] = useState(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data: listener} = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) loadProjects();
    else setProjects([]);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function loadProjects() {
    const {data, error: loadError} = await supabase.from("innovations").select("*").order("created_at", {ascending:false}).limit(12);
    if (!loadError) {
      const signed = await Promise.all((data || []).map(async project => {
        const [original, generated] = await Promise.all([
          supabase.storage.from("relife-projects").createSignedUrl(project.original_image_path, 3600),
          project.generated_image_path ? supabase.storage.from("relife-projects").createSignedUrl(project.generated_image_path, 3600) : Promise.resolve({data:null})
        ]);
        return {...project, original_image_url:original.data?.signedUrl || "", generated_image_url:generated.data?.signedUrl || ""};
      }));
      setProjects(signed);
    }
  }

  async function authenticate(event) {
    event.preventDefault(); setError(""); setNotice(""); setBusy("auth");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({email, password, options:{emailRedirectTo: window.location.origin}})
      : await supabase.auth.signInWithPassword({email, password});
    if (result.error) setError(result.error.message);
    else if (authMode === "signup" && !result.data.session) setNotice("Account created. Confirm your email, then sign in here.");
    else setNotice("You're signed in. Let's make something useful.");
    setBusy("");
  }

  async function apiCall(mode, image, details) {
    const {data:{session: current}} = await supabase.auth.getSession();
    if (!current) throw new Error("Your session expired. Sign in again.");
    let response;
    try {
      response = await fetch("/api/innovate", {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:"Bearer " + current.access_token},
        body:JSON.stringify({mode, imageBase64:image.base64, mimeType:image.mimeType, description:details, category}),
        signal: AbortSignal.timeout(55000)
      });
    } catch (requestError) {
      if (requestError.name === "TimeoutError" || requestError.name === "AbortError") throw new Error("The AI request took too long. Please try again with a smaller photo.");
      throw new Error("Could not reach the ReLife AI service. Please check your connection and try again.");
    }
    const payload = await response.json();
    if (!response.ok) {
      const detail = payload.detail ? `\nTechnical detail: ${payload.detail}` : "";
      throw new Error((payload.error || "The AI request failed.") + detail);
    }
    return payload;
  }

  async function makeGuide(event) {
    event.preventDefault();
    if (!session) { setError("Sign in before creating a personal project."); return; }
    if (!file) { setError("Upload a photo first."); return; }
    setError(""); setNotice(""); setGuide(null); setGeneratedUrl(""); setProjectId("");
    try {
      setBusy("guide");
      const image = await prepareImage(file);
      const result = await apiCall("guide", image, description);
      const path = session.user.id + "/projects/" + Date.now() + "-original.jpg";
      const {error: uploadError} = await supabase.storage.from("relife-projects").upload(path, image.blob, {contentType:"image/jpeg", upsert:false});
      if (uploadError) throw new Error("Photo storage failed: " + uploadError.message);
      const {data:signedOriginal} = await supabase.storage.from("relife-projects").createSignedUrl(path, 3600);
      const {data:row, error:insertError} = await supabase.from("innovations").insert({
        user_id:session.user.id, category, title:result.guide.title || "My ReLife project",
        description, original_image_path:path, guide:result.guide
      }).select().single();
      if (insertError) throw new Error("Your guide was created but could not be saved: " + insertError.message);
      setGuide(result.guide); setOriginalUrl(signedOriginal?.signedUrl || ""); setProjectId(row.id);
      setNotice("Your practical reuse guide is ready and saved to My projects.");
      await loadProjects();
    } catch (e) { setError(e.message || "Could not create the guide."); }
    finally { setBusy(""); }
  }

  async function makeMockup() {
    if (!file || !guide) return;
    setError(""); setBusy("image");
    try {
      let image;
      if (file) image = await prepareImage(file, 512);
      else if (originalUrl) {
        const source = await fetch(originalUrl);
        if (!source.ok) throw new Error("Could not reload the saved original photo. Please upload it again.");
        const blob = await source.blob();
        image = await prepareImage(new File([blob], "relife-original.jpg", {type:blob.type || "image/jpeg"}));
      } else throw new Error("Upload the original photo again to generate a concept."); 
      const result = await apiCall("image", image, [description, guide.best_idea].filter(Boolean).join(". "));
      const binary = atob(result.imageBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], {type:result.mimeType || "image/png"});
      const ext = (result.mimeType || "image/png").includes("jpeg") ? "jpg" : "png";
      const path = session.user.id + "/projects/" + Date.now() + "-concept." + ext;
      const {error:uploadError} = await supabase.storage.from("relife-projects").upload(path, blob, {contentType:result.mimeType || "image/png"});
      if (uploadError) throw new Error("Generated image could not be saved: " + uploadError.message);
      const {data:signedGenerated} = await supabase.storage.from("relife-projects").createSignedUrl(path, 3600);
      const {error:updateError} = await supabase.from("innovations").update({generated_image_path:path}).eq("id",projectId);
      if (updateError) throw new Error("Image generated but could not be attached to your project: " + updateError.message);
      setGeneratedUrl(signedGenerated?.signedUrl || ""); setNotice("Your after-transformation concept is generated and saved.");
      await loadProjects();
    } catch (e) { setError(e.message || "Could not generate the concept image."); }
    finally { setBusy(""); }
  }

  async function deleteProject(id) {
    const project = projects.find(item => item.id === id);
    if (project) {
      const paths = [project.original_image_path, project.generated_image_path].filter(Boolean);
      if (paths.length) await supabase.storage.from("relife-projects").remove(paths);
    }
    const {error:deleteError} = await supabase.from("innovations").delete().eq("id",id);
    if (deleteError) setError(deleteError.message);
    else { setProjects(items => items.filter(p=>p.id!==id)); setNotice("Project removed."); }
  }

  function openProject(project) {
    setGuide(project.guide); setOriginalUrl(project.original_image_url); setGeneratedUrl(project.generated_image_url || ""); setProjectId(project.id);
    setCategory(project.category); setDescription(project.description || ""); setFile(null);
    document.getElementById("innovation-studio")?.scrollIntoView({behavior:"smooth"});
  }

  return <section className="innovation-section" id="innovation-studio">
    <div className="innovation-wrap">
      <div className="innovation-heading"><span className="eyebrow">THE RELIFE INNOVATION STUDIO</span><h2>Show us what you have.<br/><em>We'll help you reimagine it.</em></h2><p>Upload a photo of an unused space or an everyday object. Get a practical reuse guide, then create an AI visual concept showing what it could become.</p></div>
      {!isSupabaseConfigured ? <div className="setup-notice"><strong>Supabase connection required.</strong><p>Add the Supabase URL and publishable key to Vercel, then redeploy.</p></div> : !session ? <div className="studio-auth"><div><h3>Your ideas, saved in one place.</h3><p>Sign in to create guides, save your transformations and revisit your projects.</p></div><form onSubmit={authenticate}><div className="studio-auth-switch"><button type="button" className={authMode==="signin"?"active":""} onClick={()=>setAuthMode("signin")}>Sign in</button><button type="button" className={authMode==="signup"?"active":""} onClick={()=>setAuthMode("signup")}>Create account</button></div><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/><button className="button button-primary form-submit" disabled={busy==="auth"}>{busy==="auth"?"Please wait…":authMode==="signin"?"Sign in":"Create account"}</button>{error&&<p className="studio-error">{error}</p>}{notice&&<p className="studio-notice">{notice}</p>}</form></div> :
      <div className="studio-grid">
        <div className="studio-create">
          <div className="studio-userbar"><span>Signed in as <strong>{session.user.email}</strong></span><button onClick={()=>supabase.auth.signOut()}>Sign out</button></div>
          <form onSubmit={makeGuide}>
            <label>What would you like to transform?</label><div className="studio-categories"><button type="button" className={category==="space"?"selected":""} onClick={()=>setCategory("space")}>⌂ Space revival</button><button type="button" className={category==="object"?"selected":""} onClick={()=>setCategory("object")}>↗ Object reuse</button></div>
            <label>Upload a photo</label><div className="studio-upload"><input id="relife-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setGuide(null);setGeneratedUrl("");setError("");}}/><label htmlFor="relife-photo"><span>＋</span><strong>{file ? file.name : "Choose a photo or take one"}</strong><small>JPG, PNG or WebP. Photo is resized before AI analysis.</small></label></div>
            {preview&&<img className="studio-preview" src={preview} alt="Your uploaded project preview"/>}
            <label htmlFor="studio-description">Any details to consider? (optional)</label><textarea id="studio-description" rows="3" maxLength="600" value={description} onChange={e=>setDescription(e.target.value)} placeholder={category==="space"?"e.g. Small balcony, gets morning sunlight, low budget…":"e.g. Old wooden ladder, slightly damaged, want to use it indoors…"}/>
            <button className="button button-primary form-submit" disabled={busy!==""||!file}>{busy==="guide"?"Studying your photo…":"Create my reuse guide ↗"}</button>
          </form>
          {error&&<p className="studio-error" role="alert">{error}</p>}{notice&&<p className="studio-notice" role="status">{notice}</p>}
        </div>
        <div className="studio-results">
          {!guide ? <div className="studio-empty"><span>✳</span><h3>Your next idea starts here.</h3><p>Upload a photo and create your personalised transformation plan.</p></div> : <>
            <div className="studio-before-after"><figure><img src={originalUrl} alt="Original uploaded photo"/><figcaption>YOUR ORIGINAL</figcaption></figure>{generatedUrl ? <figure><img src={generatedUrl} alt="AI generated transformation concept"/><figcaption>AI CONCEPT — AFTER</figcaption></figure> : <div className="studio-generate"><span>✳</span><h3>Picture the possibility.</h3><p>Generate a visual concept using your actual photo and the recommended plan.</p><button className="button button-primary" onClick={makeMockup} disabled={busy!==""}>{busy==="image"?"Generating concept…":"Generate after image ↗"}</button><small>AI image generation may use paid API quota.</small></div>}</div>
            <Guide guide={guide}/>
          </>}
        </div>
      </div>}
      {session&&projects.length>0&&<div className="studio-history"><div className="studio-history-head"><h3>My saved projects</h3><span>{projects.length} recent</span></div><div className="studio-history-grid">{projects.map(project=><article key={project.id}><button className="history-open" onClick={()=>openProject(project)}><img src={project.generated_image_url||project.original_image_url} alt="Saved project"/><span>{project.category==="space"?"SPACE REVIVAL":"OBJECT REUSE"}</span><strong>{project.title}</strong></button><button className="history-delete" onClick={()=>deleteProject(project.id)} aria-label="Delete saved project">×</button></article>)}</div></div>}
    </div>
  </section>;
}
