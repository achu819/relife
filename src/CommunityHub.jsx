import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";

const TYPES = [
  { value: "object", label: "Object reuse" },
  { value: "space", label: "Space revival" },
  { value: "material", label: "Materials to share" }
];

export default function CommunityHub() {
  const [session, setSession] = useState(null);
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [authMode, setAuthMode] = useState("signup");
  const [auth, setAuth] = useState({ email: "", password: "" });
  const [form, setForm] = useState({ type: "object", title: "", description: "", location: "" });
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (isSupabaseConfigured) loadListings(); }, []);

  async function loadListings() {
    setLoading(true);
    const { data, error } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(60);
    if (error) setMessage(error.message);
    else setListings(data || []);
    setLoading(false);
  }

  async function handleAuth(event) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const action = authMode === "signup" ? supabase.auth.signUp(auth) : supabase.auth.signInWithPassword(auth);
    const { error, data } = await action;
    if (error) setMessage(error.message);
    else if (authMode === "signup" && !data.session) setMessage("Account created. Check your email to confirm it, then sign in.");
    else setMessage("You're signed in. Welcome to ReLife!");
    setBusy(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!session) { setMessage("Please sign in before publishing a listing."); return; }
    setBusy(true); setMessage("");
    let image_url = null;
    if (photo) {
      const safeName = photo.name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
      const path = session.user.id + "/" + Date.now() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from("relife-photos").upload(path, photo, { upsert: false, contentType: photo.type });
      if (uploadError) { setMessage("Photo upload failed: " + uploadError.message); setBusy(false); return; }
      const { data: publicData } = supabase.storage.from("relife-photos").getPublicUrl(path);
      image_url = publicData.publicUrl;
    }
    const { error } = await supabase.from("listings").insert({ ...form, image_url, user_id: session.user.id });
    if (error) setMessage(error.message);
    else { setMessage("Your idea is live on ReLife!"); setForm({ type: "object", title: "", description: "", location: "" }); setPhoto(null); await loadListings(); }
    setBusy(false);
  }

  async function removeListing(id) {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    setMessage(error ? error.message : "Listing removed.");
    if (!error) loadListings();
  }

  const visible = filter === "all" ? listings : listings.filter(item => item.type === filter);
  const labelFor = (value) => TYPES.find(type => type.value === value)?.label || value;

  return <section className="community-section" id="community">
    <div className="community-inner">
      <div className="community-heading"><span className="eyebrow">THE RELIFE COMMUNITY</span><h2>Ideas become real<br /><em>when we share them.</em></h2><p>Post an object that deserves another chance, an unused space waiting for a fresh start, or materials someone else could use.</p></div>
      {!isSupabaseConfigured ? <div className="setup-notice"><strong>Community features are ready — one connection remains.</strong><p>Connect your Supabase project using the setup steps in the repository README. Once the two Vercel environment variables are added, accounts, posts and photo uploads will become active.</p><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase dashboard ↗</a></div> :
      <div className="community-layout">
        <div className="community-main">
          <div className="community-toolbar"><div><h3>Community board</h3><p>Fresh ideas from the ReLife community</p></div><select value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filter listings"><option value="all">All ideas</option>{TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
          {message && <p className="community-message" role="status">{message}</p>}
          {loading ? <p className="community-empty">Loading community ideas…</p> : visible.length === 0 ? <div className="community-empty"><span>✳</span><h3>The board is waiting for its first idea.</h3><p>Be the first to share something worth a second life.</p></div> :
            <div className="listing-grid">{visible.map(item => <article className="listing-card" key={item.id}>{item.image_url ? <img src={item.image_url} alt={item.title} loading="lazy" /> : <div className="listing-placeholder">✳</div>}<div className="listing-content"><span className="eyebrow">{labelFor(item.type)}</span><h4>{item.title}</h4><p>{item.description}</p>{item.location && <small>⌖ {item.location}</small>}{session?.user?.id === item.user_id && <button className="listing-delete" onClick={() => removeListing(item.id)}>Delete my post</button>}</div></article>)}</div>}
        </div>
        <aside className="community-side">
          {!session ? <div className="community-panel"><span className="eyebrow">JOIN THE MOVEMENT</span><h3>{authMode === "signup" ? "Create your ReLife account." : "Welcome back."}</h3><p>{authMode === "signup" ? "Sign up to share ideas and help useful things find a new purpose." : "Sign in to publish and manage your ideas."}</p><form onSubmit={handleAuth}><label>Email address</label><input type="email" autoComplete="email" required value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} placeholder="you@example.com" /><label>Password</label><input type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength="6" required value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} placeholder="At least 6 characters" /><button className="button button-primary form-submit" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"} <span>↗</span></button></form><button className="auth-switch" onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setMessage(""); }}>{authMode === "signup" ? "Already have an account? Sign in" : "New to ReLife? Create an account"}</button></div> :
          <div className="community-panel"><span className="eyebrow">SHARE AN IDEA</span><h3>Give something a second life.</h3><p>Signed in as {session.user.email}</p><form onSubmit={handleSubmit}><label>What are you sharing?</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select><label>Title</label><input required maxLength="90" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Old wooden crate" /><label>Tell us more</label><textarea required maxLength="1200" rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the object, space or material…" /><label>Location (optional)</label><input maxLength="100" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Town or area" /><label>Photo (optional, max 5 MB)</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} /><button className="button button-primary form-submit" disabled={busy || (photo && photo.size > 5242880)}>{busy ? "Publishing…" : "Publish to community"} <span>↗</span></button></form><button className="auth-switch" onClick={() => supabase.auth.signOut()}>Sign out</button></div>}
        </aside>
      </div>}
    </div>
  </section>;
}
