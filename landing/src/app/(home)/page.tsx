import EditorMock from '@/components/EditorMock';
import Header from '@/components/Header';
import { GitHubIcon, Icon, LogoMark, type IconName } from '@/components/icons';
import { LINKS, NAV } from '@/lib/site';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'users',
    title: 'Real-time collaboration',
    body: 'Edit together with live cursors and presence. Every keystroke syncs instantly, no refresh, no conflicts.',
  },
  {
    icon: 'pages',
    title: 'Multi-page documents',
    body: 'A true paged layout with margins, page breaks and headers, so what you see is what you print.',
  },
  {
    icon: 'template',
    title: 'Templates',
    body: 'Start from resumes, proposals, letters and meeting notes instead of a blank page.',
  },
  {
    icon: 'comment',
    title: 'Comments and sharing',
    body: 'Share with a link or by email as viewer, commenter or editor. Discuss in threads right beside the text.',
  },
  {
    icon: 'signature',
    title: 'E-signatures',
    body: 'Request and add signatures inside the document. No exporting, printing or third-party tools.',
  },
  {
    icon: 'sparkles',
    title: 'AI assistant',
    body: 'Draft, rewrite and summarise with the model of your choice. Bring your own key, keep your data yours.',
  },
];

const TEMPLATES: { name: string; kind: string; lines: number[]; heading?: boolean; centered?: boolean }[] = [
  { name: 'Blank document', kind: 'Start fresh', lines: [] },
  { name: 'Resume', kind: 'Personal', lines: [40, 92, 86, 0, 30, 90, 82, 70, 0, 30, 88, 64], centered: true },
  { name: 'Meeting notes', kind: 'Work', lines: [60, 0, 90, 84, 76, 0, 92, 70, 88, 52], heading: true },
  { name: 'Project proposal', kind: 'Work', lines: [72, 0, 94, 90, 96, 60, 0, 88, 92, 74], heading: true },
  { name: 'Letter', kind: 'Personal', lines: [34, 28, 0, 94, 90, 96, 86, 92, 0, 26] },
];

const OPEN_POINTS = [
  'Free to use, with no paywalled features',
  'Source code licensed under GPL-3.0',
  'Bring-your-own-key AI, no lock-in',
  'Built in the open and welcoming contributors',
];

export default function Home() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <Header />

      <main id="main">
        <section className="hero" id="top">
          <div className="container hero__inner">
            <a href={LINKS.github} className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Free and open source
              <Icon name="arrowRight" size={13} />
            </a>
            <h1 className="hero__title">
              Write together.
              <br />
              Beautifully simple.
            </h1>
            <p className="hero__sub">
              A calm, real-time document editor for teams, classrooms and everyone in between. Free, open and right in
              your browser.
            </p>
            <div className="hero__ctas">
              <a href={LINKS.signUp} className="btn btn--primary btn--lg">
                Start writing <Icon name="arrowRight" size={16} />
              </a>
              <a href={LINKS.signIn} className="btn btn--outline btn--lg">
                Sign in
              </a>
            </div>
            <p className="hero__note">No credit card. No installs.</p>
          </div>
          <div className="container container--wide">
            <EditorMock />
          </div>
        </section>

        <section className="section" id="features" aria-labelledby="features-title">
          <div className="container">
            <header className="section__head">
              <p className="kicker">Features</p>
              <h2 id="features-title" className="section__title">
                Everything a document needs. Nothing it doesn&apos;t.
              </h2>
              <p className="section__sub">The tools you reach for every day, designed to stay out of your way.</p>
            </header>
            <ul className="features">
              {FEATURES.map((f) => (
                <li key={f.title} className="feature">
                  <span className="feature__icon">
                    <Icon name={f.icon} size={18} />
                  </span>
                  <h3 className="feature__title">{f.title}</h3>
                  <p className="feature__body">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--band" id="templates" aria-labelledby="templates-title">
          <div className="container">
            <header className="section__head section__head--row">
              <div>
                <p className="kicker">Templates</p>
                <h2 id="templates-title" className="section__title">
                  Never start from a blank page.
                </h2>
              </div>
              <a href={LINKS.signUp} className="textlink">
                Browse all templates <Icon name="arrowRight" size={14} />
              </a>
            </header>
            <ul className="templates">
              {TEMPLATES.map((t) => (
                <li key={t.name}>
                  <a href={LINKS.signUp} className="template">
                    <span
                      className={`template__page${t.centered ? ' template__page--center' : ''}${
                        t.lines.length ? '' : ' template__page--blank'
                      }`}
                      aria-hidden="true"
                    >
                      {t.lines.length === 0 && <span className="template__plus">+</span>}
                      {t.lines.map((w, i) =>
                        w === 0 ? (
                          <span key={i} className="template__gap" />
                        ) : (
                          <span
                            key={i}
                            className={`template__line${i === 0 && t.heading ? ' template__line--head' : ''}`}
                            style={{ width: `${w}%` }}
                          />
                        ),
                      )}
                    </span>
                    <span className="template__name">{t.name}</span>
                    <span className="template__kind">{t.kind}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="open-source" aria-labelledby="oss-title">
          <div className="container oss">
            <div>
              <p className="kicker">Open source</p>
              <h2 id="oss-title" className="section__title">
                Free, open, and yours.
              </h2>
              <p className="section__sub">
                Docs is built in public by Kabeer&apos;s Network. Read the code, report an issue, or help shape what
                comes next.
              </p>
              <div className="oss__ctas">
                <a href={LINKS.github} className="btn btn--outline">
                  <GitHubIcon /> View on GitHub
                </a>
                <a href={LINKS.contributing} className="textlink">
                  How to contribute <Icon name="arrowRight" size={14} />
                </a>
              </div>
            </div>
            <ul className="oss__list">
              {OPEN_POINTS.map((p) => (
                <li key={p}>
                  <span className="oss__check">
                    <Icon name="check" size={14} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--tight" aria-labelledby="cta-title">
          <div className="container">
            <div className="cta">
              <h2 id="cta-title" className="cta__title">
                Your next document starts here.
              </h2>
              <p className="cta__sub">Create an account in seconds and invite your team when you are ready.</p>
              <div className="hero__ctas">
                <a href={LINKS.signUp} className="btn btn--primary btn--lg">
                  Start writing <Icon name="arrowRight" size={16} />
                </a>
                <a href={LINKS.signIn} className="btn btn--ghost btn--lg">
                  I already have an account
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__grid">
          <div className="footer__brand">
            <a href="#top" className="brand" aria-label="Docs home">
              <LogoMark />
              <span>Docs</span>
            </a>
            <p>Write together, beautifully simple. A project by Kabeer&apos;s Network.</p>
          </div>
          <nav className="footer__col" aria-label="Product">
            <h3>Product</h3>
            {NAV.slice(0, 2).map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
            <a href={LINKS.signIn}>Sign in</a>
            <a href={LINKS.signUp}>Create account</a>
          </nav>
          <nav className="footer__col" aria-label="Open source">
            <h3>Open source</h3>
            <a href={LINKS.github}>GitHub</a>
            <a href={LINKS.issues}>Report an issue</a>
            <a href={LINKS.contributing}>Contributing</a>
            <a href={LINKS.license}>GPL-3.0 license</a>
          </nav>
          <nav className="footer__col" aria-label="Company">
            <h3>Kabeer&apos;s Network</h3>
            <a href={LINKS.network}>kabeers.network</a>
            <a href={LINKS.app}>docs.kabeers.network</a>
          </nav>
        </div>
        <div className="container footer__base">
          <span>&copy; {new Date().getFullYear()} Kabeer&apos;s Network</span>
          <span>Made for writers, by writers.</span>
        </div>
      </footer>
    </>
  );
}
