import { useEffect, useState } from "react";

const photos = {
  hero: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1500&q=85",
  balcony: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=85",
  garden: "https://images.unsplash.com/photo-1483794344563-d27a8d18014e?auto=format&fit=crop&w=900&q=85",
  pallet: "https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=900&q=85",
  furniture: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85",
  bottles: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=85",
  planters: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=85"
};

const features = [
  { number: "01", icon: "↗", title: "Object Reuse", text: "See possibility in the things we already have. Give everyday discarded objects a useful, beautiful new purpose.", link: "#gallery", linkText: "Explore transformations" },
  { number: "02", icon: "⌂", title: "Space Revival", text: "Turn overlooked corners, empty balconies and forgotten spaces into places people love to spend time in.", link: "#space-revival", linkText: "Find your fresh start" },
  { number: "03", icon: "✳", title: "Waste-to-Space", text: "Bring materials and spaces together. Discover how what gets thrown away can help create something meaningful.", link: "#how-it-works", linkText: "See how it works" }
];

const transformations = [
  { tag: "SPACE REVIVAL", title: "A little room to grow", before: "An unused balcony", after: "A pocket garden", beforeImage: photos.balcony, afterImage: photos.garden, description: "A forgotten corner becomes a calm green escape with simple planters and a little care." },
  { tag: "OBJECT REUSE", title: "A new seat at the table", before: "Discarded wood", after: "Everyday furniture", beforeImage: photos.pallet, afterImage: photos.furniture, description: "Reclaimed wood can become practical furniture instead of taking up space as waste." },
  { tag: "WASTE-TO-SPACE", title: "Make room for green", before: "Used containers", after: "Fresh planters", beforeImage: photos.bottles, afterImage: photos.planters, description: "Clean, safe containers can be repurposed as planters for herbs and small plants." }
];

function LeafMark({ small = false }) {
  return <span className={small ? "brand-mark brand-mark-small" : "brand-mark"} aria-hidden="true">r<span>✳</span></span>;
}

function Arrow() {
  return <span aria-hidden="true" className="arrow">↗</span>;
}

function Header({ onGetStarted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);
  const links = [["Home", "#home"], ["Object Reuse", "#object-reuse"], ["Space Revival", "#space-revival"], ["Waste-to-Space", "#waste-to-space"], ["About", "#about"]];
  return (
    <header className="site-header">
      <a className="brand" href="#home" onClick={close} aria-label="ReLife home"><LeafMark /><span>re<span className="brand-light">life</span></span></a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "✕" : "☰"}</button>
      <nav className={menuOpen ? "main-nav nav-open" : "main-nav"} aria-label="Main navigation">
        {links.map(([label, href]) => <a key={href} href={href} onClick={close}>{label}</a>)}
        <button className="nav-cta" onClick={() => { close(); onGetStarted(); }}>Get started <Arrow /></button>
      </nav>
    </header>
  );
}

function SectionIntro({ eyebrow, title, text, centered = false }) {
  return <div className={centered ? "section-intro centered" : "section-intro"}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}

function FeatureCard({ item }) {
  return <article className="feature-card"><div className="feature-top"><span className="feature-number">{item.number}</span><span className="feature-icon">{item.icon}</span></div><h3>{item.title}</h3><p>{item.text}</p><a className="text-link" href={item.link}>{item.linkText} <Arrow /></a></article>;
}

function TransformationCard({ item }) {
  return <article className="transformation-card">
    <div className="transformation-images">
      <div className="image-side"><img src={item.beforeImage} alt={item.before} loading="lazy" /><span className="image-label">BEFORE</span></div>
      <div className="image-side"><img src={item.afterImage} alt={item.after} loading="lazy" /><span className="image-label after-label">AFTER</span></div>
      <span className="image-arrow" aria-hidden="true">→</span>
    </div>
    <div className="transformation-copy"><span className="eyebrow">{item.tag}</span><h3>{item.title}</h3><p>{item.description}</p></div>
  </article>;
}

function GetStartedModal({ onClose }) {
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("Revive an unused space");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button>
      {!submitted ? <>
        <span className="eyebrow">YOUR NEXT LITTLE BIG IDEA</span>
        <h2 id="modal-title">Let's give something a second life.</h2>
        <p>Tell us what you'd like to explore. This demo form stays right here in your browser.</p>
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
          <label htmlFor="visitor-name">What should we call you?</label>
          <input id="visitor-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          <label htmlFor="visitor-idea">I'm interested in...</label>
          <select id="visitor-idea" value={idea} onChange={(e) => setIdea(e.target.value)}>
            <option>Revive an unused space</option><option>Reuse an everyday object</option><option>Turn waste into something useful</option><option>Explore ideas for my community</option>
          </select>
          <button className="button button-primary form-submit" type="submit">Let's get inspired <Arrow /></button>
        </form>
      </> : <div className="success-state"><span className="success-icon">✳</span><span className="eyebrow">THAT'S A LOVELY PLACE TO START</span><h2 id="modal-title">Thanks, {name}!</h2><p>Your idea is: <strong>{idea.toLowerCase()}</strong>. This is a frontend demo, so nothing has been sent or saved — but your next step can start right here.</p><button className="button button-primary" onClick={onClose}>Back to ReLife <Arrow /></button></div>}
    </section>
  </div>;
}

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  return <>
    <Header onGetStarted={openModal} />
    <main>
      <section className="hero" id="home">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> SMALL CHANGES. MEANINGFUL IMPACT.</span>
          <h1>Give everything<br />a <em>second life.</em></h1>
          <p className="hero-description">A little imagination can change the story of an object, a space, and the world around us.</p>
          <div className="hero-actions"><a className="button button-primary" href="#object-reuse">Explore possibilities <Arrow /></a><a className="button button-secondary" href="#space-revival">Revive a space <span aria-hidden="true">↘</span></a></div>
          <div className="hero-note"><span className="hero-note-icon">✳</span><span>Don't throw it away.<br /><strong>Reimagine it.</strong></span></div>
        </div>
        <div className="hero-visual">
          <img src={photos.hero} alt="A lush green garden filled with plants and natural textures" />
          <div className="hero-image-caption"><span className="caption-spark">✳</span><span>Make room for<br /><strong>what could be.</strong></span></div>
          <div className="hero-stamp"><span>RETHINK</span><span className="stamp-leaf">✳</span><span>REUSE · REVIVE</span></div>
        </div>
        <div className="hero-index"><span>01</span><span className="index-line" /><span>03</span></div>
      </section>

      <section className="features-section section-pad" id="object-reuse">
        <div className="section-heading-row"><SectionIntro eyebrow="A DIFFERENT WAY OF SEEING" title={<>Good things don't<br /><em>have to end.</em></>} text="ReLife is about looking twice — at the objects we overlook and the spaces we leave unused." /><div className="section-aside"><span className="aside-star">✳</span><p>Less waste.<br />More wonder.</p></div></div>
        <div className="feature-grid">{features.map((item) => <FeatureCard key={item.number} item={item} />)}</div>
      </section>

      <section className="space-banner" id="space-revival">
        <div className="space-banner-image"><img src={photos.garden} alt="A green outdoor space filled with plants" loading="lazy" /></div>
        <div className="space-banner-copy"><span className="eyebrow">SPACE REVIVAL / 02</span><h2>Every empty space<br />is a <em>possibility.</em></h2><p>An unused balcony. A quiet corner. An overlooked patch of land. With thoughtful ideas and simple materials, forgotten places can become welcoming spaces again.</p><a className="button button-light" href="#gallery">See what's possible <Arrow /></a><span className="space-asterisk">✳</span></div>
      </section>

      <section className="gallery-section section-pad" id="gallery">
        <div className="gallery-heading"><SectionIntro eyebrow="THE ART OF REIMAGINING" title={<>A little before.<br /><em>A lot after.</em></>} text="Real-world inspiration for seeing potential in what we already have." /><a href="#how-it-works" className="text-link gallery-link">How it works <Arrow /></a></div>
        <div className="transformation-grid">{transformations.map((item) => <TransformationCard key={item.title} item={item} />)}</div>
      </section>

      <section className="waste-section section-pad" id="waste-to-space">
        <div className="waste-orbit" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit-center">✳</span><span className="orbit-word orbit-word-one">REUSE</span><span className="orbit-word orbit-word-two">RETHINK</span><span className="orbit-word orbit-word-three">REVIVE</span></div>
        <div className="waste-copy"><span className="eyebrow">WASTE-TO-SPACE / 03</span><h2>What if waste<br />was the <em>beginning?</em></h2><p>ReLife connects two simple ideas: materials deserve another chance, and spaces deserve a fresh start. Together, they can create something useful, welcoming and full of life.</p><a className="text-link" href="#how-it-works">Discover the ReLife approach <Arrow /></a></div>
      </section>

      <section className="how-section section-pad" id="how-it-works">
        <SectionIntro eyebrow="A SIMPLE WAY TO START" title={<>Three steps.<br /><em>One fresh perspective.</em></>} text="You don't need a big budget or a perfect plan. Just start by looking at things a little differently." centered />
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><span className="step-icon">⌕</span><h3>Discover</h3><p>Notice an object, material or space that could use a second chance.</p></article>
          <article className="step-card"><span className="step-number">02</span><span className="step-icon">✳</span><h3>Reimagine</h3><p>Explore new possibilities. Think about what it could become, not what it was.</p></article>
          <article className="step-card"><span className="step-number">03</span><span className="step-icon">↗</span><h3>Transform</h3><p>Take a small, practical step and turn a good idea into something real.</p></article>
        </div>
      </section>

      <section className="impact-section">
        <div className="impact-top"><div><span className="eyebrow">THE RIPPLE EFFECT</span><h2>Small acts add up<br />to <em>something bigger.</em></h2></div><p>Imagine what we could do when more people choose to reuse, repair and revive.</p></div>
        <div className="impact-stats"><div className="stat"><strong>1,240<span>+</span></strong><span>Objects reimagined</span></div><div className="stat"><strong>86</strong><span>Spaces revived</span></div><div className="stat"><strong>3.2<span>t</span></strong><span>Materials given another use</span></div></div>
        <p className="demo-note">Illustrative demo statistics — not live or verified project impact data.</p>
      </section>

      <section className="about-section section-pad" id="about">
        <div className="about-mark"><LeafMark /></div>
        <div className="about-copy"><span className="eyebrow">A LITTLE ABOUT RELIFE</span><h2>We believe in<br /><em>second chances.</em></h2><p>ReLife is a sustainability initiative built around a simple belief: useful things are too valuable to be wasted, and empty spaces are too full of possibility to be ignored.</p><p>We bring together creative reuse and thoughtful space revival to inspire practical, people-friendly change — one idea at a time.</p><span className="about-signoff">A more thoughtful way forward. <span>✳</span></span></div>
        <div className="about-photo"><img src={photos.planters} alt="Healthy green plants growing in a garden" loading="lazy" /><span>GROW WITH WHAT YOU HAVE.</span></div>
      </section>
    </main>

    <footer className="site-footer">
      <div className="footer-main"><div className="footer-brand"><a className="brand brand-footer" href="#home"><LeafMark /><span>re<span className="brand-light">life</span></span></a><p>Don't throw it away.<br /><strong>Reimagine it.</strong></p></div><div className="footer-links"><span className="eyebrow">EXPLORE</span><a href="#object-reuse">Object Reuse</a><a href="#space-revival">Space Revival</a><a href="#waste-to-space">Waste-to-Space</a><a href="#about">Our story</a></div><div className="footer-contact"><span className="eyebrow">LET'S MAKE A DIFFERENCE</span><p>Have an idea worth sharing?</p><button className="footer-contact-link" onClick={openModal}>Start a conversation <Arrow /></button><span className="contact-placeholder">Contact details can be added here.</span></div></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} ReLife. Made for a more thoughtful tomorrow.</span><a href="#home">Back to top ↑</a><span className="footer-planet">ONE PLANET. MANY POSSIBILITIES. ✳</span></div>
    </footer>
    {modalOpen && <GetStartedModal onClose={closeModal} />}
  </>;
}

export default App;