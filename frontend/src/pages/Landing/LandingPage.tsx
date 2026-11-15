import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Brand } from "../../components/Brand";
import "./landing.css";

const REVEAL_SELECTOR = ".landing-page .l-reveal, .landing-page .l-reveal-left, .landing-page .l-reveal-right, .landing-page .l-reveal-scale";

function useScrollReveal(): void {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("l-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("l-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/** Fills `.l-steps-line-fill` top-to-bottom as the steps section scrolls through the viewport. */
function useStepsGlow(containerRef: React.RefObject<HTMLElement>): void {
  useEffect(() => {
    const container = containerRef.current;
    const fill = container?.querySelector<HTMLElement>(".l-steps-line-fill");
    if (!container || !fill) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fill.style.height = "100%";
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.35 - rect.height;
      const raw = (start - rect.top) / (start - end);
      const progress = Math.min(1, Math.max(0, raw));
      fill.style.height = `${progress * 100}%`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [containerRef]);
}

function XIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="none" stroke="var(--l-yellow)" strokeWidth="1.4" />
      <path
        d="M4.8 8.2l2.1 2.2 4.3-4.8"
        fill="none"
        stroke="var(--l-yellow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingPage(): JSX.Element {
  useScrollReveal();
  const stepsRef = useRef<HTMLDivElement>(null);
  useStepsGlow(stepsRef);
  const { user } = useAuth();
  const appCtaLabel = user ? "Go to your library" : "Upload a chapter";
  return (
    <div className="landing-page">
      <nav className="l-nav">
        <div className="l-wrap">
          <Brand />
          <ul className="l-nav-links">
            <li><a href="#how">How it works</a></li>
            <li><a href="#mix">Question types</a></li>
            <li><a href="#sample">Sample output</a></li>
            <li><a href="#why">Why it works</a></li>
          </ul>
          <div className="l-nav-ctas">
            <a className="l-btn l-btn-ghost l-btn-sm" href="#why">Why Ved-Bhandar</a>
            {!user && <Link className="l-btn l-btn-ghost l-btn-sm" to="/login">Log in</Link>}
            <Link className="l-btn l-btn-primary l-btn-sm" to={user ? "/app" : "/signup"}>
              {user ? "Go to library" : "Sign up"}
            </Link>
          </div>
        </div>
      </nav>

      <header className="l-hero l-on-dark">
        <div className="l-wrap l-hero-wrap">
          <div>
            <span className="l-eyebrow l-anim-in l-anim-d1"><span className="l-dot" />Question papers from your own textbooks</span>
            <h1 className="l-anim-in l-anim-d2">Stop retyping chapters into MCQs, short and long answers.</h1>
            <p className="l-hero-sub l-anim-in l-anim-d3">
              Ved-Bhandar reads a textbook chapter, tags it by topic and Bloom's level, and drafts the
              exact mix of questions and marks you ask for. Your team reviews each one before anything
              is exported.
            </p>
            <div className="l-hero-ctas l-anim-in l-anim-d4">
              <Link className="l-btn l-btn-primary" to={user ? "/app" : "/signup"}>{appCtaLabel}</Link>
              <a className="l-btn l-btn-ghost" href="#how">See how it works</a>
            </div>
          </div>
          <div className="l-hero-art l-anim-in l-anim-d5">
            <div className="l-doc-card l-doc-pdf">
              <div className="l-doc-label">Ch. 6 — Light</div>
              <div className="l-doc-line l-w80" />
              <div className="l-doc-line l-w60" />
              <div className="l-doc-line l-w80" />
              <div className="l-doc-line l-w40" />
              <div className="l-doc-ring" />
            </div>
            <span className="l-flow-chip">TAGGING</span>
            <div className="l-term-card">
              <div className="l-term-title">Generated paper · draft</div>
              <div className="l-term-row"><span>Q4 · MCQ · Bloom 2</span><span>1 mark</span></div>
              <div className="l-term-bar l-hi" style={{ width: "90%" }} />
              <div className="l-term-row"><span>Q5 · Short · Bloom 3</span><span>3 marks</span></div>
              <div className="l-term-bar" style={{ width: "70%" }} />
              <div className="l-term-row"><span>Q6 · Long · Bloom 4</span><span>5 marks</span></div>
              <div className="l-term-bar" style={{ width: "55%" }} />
            </div>
          </div>
        </div>
        <div className="l-trust">
          <div className="l-wrap l-trust-wrap">
            <span className="l-trust-label">Built around the exams Indian schools already set</span>
            <div className="l-trust-badges">
              <span className="l-trust-badge">CBSE</span>
              <span className="l-trust-badge">ICSE</span>
              <span className="l-trust-badge">State boards</span>
              <span className="l-trust-badge">Bloom&apos;s L1–L6</span>
              <span className="l-trust-badge">MCQ · Short · Long</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="l-band" id="problem">
          <div className="l-wrap">
            <div className="l-section-head l-reveal">
              <h2>Your textbook was never the problem. Writing the paper from it is.</h2>
              <p>
                Chapters arrive as scanned PDFs, photocopies and old Word files. Someone still has to
                read every page, decide what&apos;s worth testing, and check the marks add up — before
                the paper can even go to review.
              </p>
            </div>
            <div className="l-compare">
              <div className="l-panel l-panel-light l-reveal-left">
                <div className="l-panel-kicker">Manual work</div>
                <h3>Hours of reading &amp; drafting</h3>
                <ul>
                  <li><XIcon /> Read the whole chapter again, chapter by chapter</li>
                  <li><XIcon /> Decide which Bloom&apos;s level each question actually tests</li>
                  <li><XIcon /> Write MCQ options that aren&apos;t obviously wrong</li>
                  <li><XIcon /> Add up marks by hand, fix it when it&apos;s wrong</li>
                  <li><XIcon /> Retype it all into a clean paper — then do it again next term</li>
                </ul>
                <div className="l-result-box">
                  The result: late nights before every exam, difficulty that drifts between sections,
                  and teachers grading more than they&apos;re teaching.
                </div>
              </div>
              <div className="l-panel l-panel-dark l-reveal-right l-reveal-d1">
                <div className="l-panel-kicker">With Ved-Bhandar</div>
                <h3>Minutes to a reviewable draft</h3>
                <ul>
                  <li><CheckIcon /> Ved-Bhandar reads the chapter and tags it by topic and Bloom&apos;s level</li>
                  <li><CheckIcon /> You set the mix — MCQ, short, long — and the marks for each</li>
                  <li><CheckIcon /> Draft questions come back with the source page cited</li>
                  <li><CheckIcon /> You accept, edit or reject each one before export</li>
                </ul>
                <div className="l-result-box">
                  The result: a paper ready to export in minutes, every question traceable to a page,
                  and your evenings back.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="l-band" id="how">
          <div className="l-wrap">
            <div className="l-section-head l-reveal">
              <span className="l-eyebrow-light">How it works</span>
              <h2>Start with one chapter</h2>
              <p>
                No syllabus migration, no change to how your school already teaches. Bring one chapter
                your team is about to set a paper on.
              </p>
            </div>
            <div className="l-steps" ref={stepsRef}>
              <div className="l-steps-line"><div className="l-steps-line-fill" /></div>
              <div className="l-step l-reveal-left">
                <span className="l-step-dot" />
                <div className="l-step-copy">
                  <div className="l-step-num">Step 1</div>
                  <h3>Choose one chapter</h3>
                  <p>
                    Upload the textbook PDF once. Ved-Bhandar splits it into chapters, reads the pages,
                    and tags each section by topic — so you only pick what you need.
                  </p>
                </div>
                <div className="l-step-art">
                  <div className="l-mock">
                    <div className="l-mock-row"><span>Ch. 4 — Electricity</span><span className="l-mock-pill l-ghost">Ready</span></div>
                    <div className="l-mock-row"><span>Ch. 5 — Magnetic Effects</span><span className="l-mock-pill">Selected</span></div>
                    <div className="l-mock-row"><span>Ch. 6 — Light</span><span className="l-mock-pill l-ghost">Ready</span></div>
                  </div>
                </div>
              </div>

              <div className="l-step l-rev l-reveal-right">
                <span className="l-step-dot" />
                <div className="l-step-copy">
                  <div className="l-step-num">Step 2</div>
                  <h3>Set the question mix</h3>
                  <p>
                    Choose how many MCQs, short and long answers you need, the Bloom&apos;s level and
                    marks for each, and the overall difficulty of the paper.
                  </p>
                </div>
                <div className="l-step-art">
                  <div className="l-mock">
                    <div className="l-mock-row"><span>MCQ · Bloom 1</span><span className="l-mock-pill">×4 · 1 mark</span></div>
                    <div className="l-mock-row"><span>Short answer · Bloom 3</span><span className="l-mock-pill">×3 · 3 marks</span></div>
                    <div className="l-mock-row"><span>Long answer · Bloom 5</span><span className="l-mock-pill">×2 · 5 marks</span></div>
                  </div>
                </div>
              </div>

              <div className="l-step l-reveal-left">
                <span className="l-step-dot" />
                <div className="l-step-copy">
                  <div className="l-step-num">Step 3</div>
                  <h3>Pick the pages, if you want to</h3>
                  <p>
                    Split the chapter into page ranges so each section of the exam draws from the right
                    part — early pages for recall, later ones for application.
                  </p>
                </div>
                <div className="l-step-art">
                  <div className="l-mock">
                    <div className="l-mock-row"><span>Pages 42–51</span><span className="l-mock-pill l-ghost">Section A</span></div>
                    <div className="l-mock-slider"><div className="l-fill" /></div>
                    <div className="l-mock-ticks"><span>p. 40</span><span>p. 58</span></div>
                  </div>
                </div>
              </div>

              <div className="l-step l-rev l-reveal-right">
                <span className="l-step-dot" />
                <div className="l-step-copy">
                  <div className="l-step-num">Step 4</div>
                  <h3>Review and export</h3>
                  <p>
                    Every question comes back with its Bloom level, source pages and a draft answer.
                    Accept, edit or reject each one, then export the finished paper.
                  </p>
                </div>
                <div className="l-step-art">
                  <div className="l-mock">
                    <div className="l-mock-q">
                      <div className="l-stem">Q4. Why does a convex lens converge light rays?</div>
                      <div className="l-opt">○ Because it absorbs light</div>
                      <div className="l-opt">● Because it refracts light toward the axis</div>
                    </div>
                    <div className="l-mock-row" style={{ marginTop: 10 }}>
                      <span>Bloom 2 · 1 mark · p. 47</span>
                      <span className="l-status-tag l-accepted">Accepted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="l-band" id="sample">
          <div className="l-wrap">
            <div className="l-section-head l-reveal">
              <span className="l-eyebrow-light">Example run · not your data</span>
              <h2>From a 24-page chapter to a 20-mark paper</h2>
              <p>
                What a generated draft looks like for one Class 10 Science chapter, before anyone has
                reviewed a single question.
              </p>
            </div>
            <div className="l-sample-grid">
              <div className="l-stat-tile l-big l-reveal-scale">
                <div className="l-stat-num">20 questions, 3 types</div>
                <div className="l-stat-cap">
                  12 MCQ, 5 short answer and 3 long answer questions drafted from one chapter, matched
                  to the marks you asked for.
                </div>
              </div>
              <div className="l-stat-tile l-small l-reveal-scale l-reveal-d1">
                <div className="l-stat-num">L1–L4</div>
                <div className="l-stat-cap">
                  Bloom&apos;s levels covered across the paper, instead of every question sitting at
                  &quot;remember.&quot;
                </div>
              </div>
              <div className="l-stat-tile l-small l-reveal-scale l-reveal-d2">
                <div className="l-stat-num">20/20</div>
                <div className="l-stat-cap">
                  Questions cited back to a source page, so a reviewer can check the chapter in
                  seconds.
                </div>
              </div>
            </div>
            <p className="l-sample-note">
              Illustrative example — your actual output depends on the chapter and the mix you choose.
            </p>
          </div>
        </section>

        <section className="l-band" id="why">
          <div className="l-wrap">
            <div className="l-section-head l-reveal">
              <span className="l-eyebrow-light">Why it works</span>
              <h2>One tool for the whole paper</h2>
              <p>
                Built so your teachers read, choose and approve — Ved-Bhandar only does the parts that
                were always just typing.
              </p>
            </div>
            <div className="l-why-diagram l-reveal-scale">
              <div className="l-diagram-node l-doc">
                <div className="l-node-box">
                  <div className="l-doc-line l-w80" style={{ background: "var(--l-border)" }} />
                  <div className="l-doc-line l-w60" style={{ background: "var(--l-border)" }} />
                  <div className="l-doc-line l-w40" style={{ background: "var(--l-border)" }} />
                </div>
                <div className="l-label">Chapter PDF</div>
              </div>
              <div className="l-arrow">→</div>
              <div className="l-diagram-node l-engine">
                <div className="l-node-box">
                  VB
                  <div className="l-engine-tags">
                    <span className="l-engine-tag">Reading</span>
                    <span className="l-engine-tag">Tagging</span>
                    <span className="l-engine-tag">Drafting</span>
                  </div>
                </div>
                <div className="l-label">Ved-Bhandar</div>
              </div>
              <div className="l-arrow">→</div>
              <div className="l-diagram-node l-out">
                <div className="l-node-box">
                  Q1 MCQ · Bloom 1 · 1m<br />
                  Q2 Short · Bloom 3 · 3m<br />
                  Q3 Long · Bloom 5 · 5m
                </div>
                <div className="l-label">Exam paper</div>
              </div>
            </div>
            <div className="l-value-grid">
              <div className="l-value-card l-reveal l-reveal-d1">
                <h4>Built for Indian school boards</h4>
                <p>
                  Works from the board, grade and subject you already tag your books with — CBSE, ICSE
                  or state syllabi — and keeps Bloom&apos;s taxonomy as a first-class setting, not an
                  afterthought.
                </p>
              </div>
              <div className="l-value-card l-reveal l-reveal-d2">
                <h4>Traceable, not a black box</h4>
                <p>
                  Every generated question keeps the page and chunk it was drafted from, so a reviewer
                  can check the source instead of trusting it blind.
                </p>
              </div>
              <div className="l-value-card l-reveal l-reveal-d3">
                <h4>You stay in control</h4>
                <p>
                  Nothing ships until someone accepts it. Reject a question with a reason and it&apos;s
                  easy to see what didn&apos;t work and why.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="l-band-tight">
          <div className="l-wrap">
            <div className="l-cta-band l-on-dark l-reveal">
              <h2>Ready to try it on your own chapter?</h2>
              <p>Upload a textbook, pick a chapter, and see a draft paper before you commit to anything.</p>
              <div className="l-hero-ctas l-center">
                <Link className="l-btn l-btn-primary" to={user ? "/app" : "/signup"}>{appCtaLabel}</Link>
                <a className="l-btn l-btn-ghost" href="#why">Why Ved-Bhandar</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="l-footer">
        <div className="l-wrap l-footer-wrap">
          <Brand />
          <div className="l-foot-links">
            <a href="#how">How it works</a>
            <a href="#mix">Question types</a>
            <a href="#sample">Sample output</a>
            <a href="#why">Why it works</a>
          </div>
          <div className="l-copyright">Ved-Bhandar · question papers from the textbooks you already use</div>
        </div>
      </footer>
    </div>
  );
}
