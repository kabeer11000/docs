import "./landing.css";
import { LogoMark } from "@/components/brand/logo";
import { GitHubIcon } from "./icons";
import MiniSheet from "./mini-sheet";
import Typist from "./typist";

const LINKS = {
  signIn: "/auth/login",
  signUp: "/signup",
  developers: "/developers",
  github: "https://github.com/kabeer11000/docs",
  network: "https://kabeers.network",
} as const;

const PRICES: [string, string][] = [
  ["Documents, with real-time editing", "Free"],
  ["Spreadsheets with formulas", "Free"],
  ["Presentations", "Free"],
  ["Comments, sharing and publishing", "Free"],
  ["REST API", "Free"],
  ["AI assistant", "Free, with your own key"],
];

const TEMPLATES: { name: string; kind: string; body: React.ReactNode }[] = [
  {
    name: "Resume",
    kind: "Personal",
    body: (
      <>
        <b className="mini__h">Sana Malik</b>
        <span className="mini__sub">Product designer, Lahore</span>
        <b className="mini__k">Experience</b>
        <span>
          Senior designer at Kabeer&apos;s Network, 2023 to now. Led the editor
          redesign and the new sharing flow.
        </span>
        <span>
          Designer at Northwind, 2020 to 2023. Shipped the mobile app used by
          40,000 drivers.
        </span>
        <b className="mini__k">Education</b>
        <span>BSc Computer Science, LUMS, 2020.</span>
      </>
    ),
  },
  {
    name: "Meeting notes",
    kind: "Work",
    body: (
      <>
        <b className="mini__h">Weekly sync</b>
        <span className="mini__sub">Thursday, 27 November</span>
        <b className="mini__k">Attendees</b>
        <span>Amna, Daniel, Sara, Bilal</span>
        <b className="mini__k">Decisions</b>
        <span>
          Ship offline mode to beta on Monday. Daniel owns the release notes.
        </span>
        <b className="mini__k">Next steps</b>
        <span>Sara to review the onboarding copy before Friday.</span>
      </>
    ),
  },
  {
    name: "Project proposal",
    kind: "Work",
    body: (
      <>
        <b className="mini__h">Community library app</b>
        <span className="mini__sub">Proposal for the city council</span>
        <b className="mini__k">Summary</b>
        <span>
          A simple way for neighbours to lend and borrow books, tools and games,
          with no fees and no adverts.
        </span>
        <b className="mini__k">Budget</b>
        <span>Hosting and design for one year: 1.2 million rupees.</span>
      </>
    ),
  },
  {
    name: "Letter",
    kind: "Personal",
    body: (
      <>
        <span className="mini__sub">27 November 2026</span>
        <span>Dear Ms Rahman,</span>
        <span>
          Thank you for the warm welcome last week. I have attached the signed
          lease and the inventory we walked through together.
        </span>
        <span>Kind regards,</span>
        <span>Omar</span>
      </>
    ),
  },
];

const editable = {
  contentEditable: true,
  suppressContentEditableWarning: true,
  spellCheck: false,
  role: "textbox",
} as const;

const APPS = [
  { id: "doc", label: "Document" },
  { id: "sheet", label: "Spreadsheet" },
  { id: "slides", label: "Presentation" },
] as const;

const API_SAMPLE = `curl -X PUT https://docs.kabeers.network/api/v1/files/Xa9pQ2/cells \\
  -H "Authorization: Bearer $KD_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"range":"A1:C2","values":[["Item","Qty","Price"],["Paper",4,2.5]]}'`;

/** Public landing page, rendered on the server at "/" for visitors who are not signed in. */
export function Landing() {
  return (
    <div className="landing">
      {/* Lets the typed sentence stay hidden until the cursor types it. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('js')",
        }}
      />
      <header className="wrap top">
        <a
          href={LINKS.signUp}
          className="top__brand"
          aria-label="Docs, create an account"
        >
          <LogoMark width={28} height={28} />
          <span>Docs</span>
        </a>
        <nav className="top__right" aria-label="Site">
          <a href={LINKS.developers} className="btn btn--ghost top__wide">
            API
          </a>
          <a
            href={LINKS.github}
            className="btn btn--ghost btn--icon"
            aria-label="Source code on GitHub"
          >
            <GitHubIcon />
          </a>
          <a href={LINKS.signIn} className="btn btn--ghost">
            Sign in
          </a>
          <a href={LINKS.signUp} className="btn btn--primary">
            Get started
          </a>
        </nav>
      </header>

      <main>
        <section className="wrap hero" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero__title">
            Documents, spreadsheets and slides you make together.
          </h1>
          <p className="hero__lede">
            Free and open source, right in your browser. Write with others in
            real time, crunch the numbers, build the deck, then publish any of
            it to the web.
          </p>
          <p className="hero__cta">
            <a href={LINKS.signUp} className="btn btn--primary btn--lg">
              Start for free
            </a>
            <a href={LINKS.signIn} className="btn btn--ghost btn--lg">
              Sign in
            </a>
          </p>
        </section>

        {/* The studio: three real, editable samples. Tabs are plain radios so it works without JavaScript. */}
        <section className="wrap" aria-label="Try the three apps">
          <div className="studio">
            {APPS.map((a, i) => (
              <input
                key={a.id}
                type="radio"
                name="studio-app"
                id={`studio-${a.id}`}
                className="studio__radio"
                defaultChecked={i === 0}
              />
            ))}
            <div className="studio__tabs" role="presentation">
              {APPS.map((a) => (
                <label
                  key={a.id}
                  htmlFor={`studio-${a.id}`}
                  className={`studio__tab studio__tab--${a.id}`}
                >
                  <span className="studio__dot" aria-hidden="true" />
                  {a.label}
                </label>
              ))}
              <span className="studio__hint">Everything here is editable</span>
              <span className="presence" aria-hidden="true">
                <span className="avatar avatar--amna">A</span>
                <span className="avatar avatar--daniel">D</span>
              </span>
            </div>

            <div className="studio__panel studio__panel--doc">
              <article className="page" aria-label="Sample document">
                <h2 className="page__title" {...editable}>
                  Launch plan
                </h2>
                <div className="page__body" {...editable}>
                  <p>
                    We open the beta to the first two hundred teams on Monday.
                    Invite people and you see their cursors as they type, with
                    nothing to refresh.{" "}
                    <Typist
                      name="Amna"
                      text="I'll draft the announcement tonight."
                    />
                  </p>
                  <div className="note-anchor">
                    <p>
                      Select any words to <mark>leave a comment</mark> next to
                      them, then reply, resolve or mention someone to bring them
                      in.
                    </p>
                    <aside
                      className="note"
                      contentEditable={false}
                      aria-label="Comment from Daniel Okafor"
                    >
                      <span className="note__who">
                        <span
                          className="avatar avatar--daniel avatar--sm"
                          aria-hidden="true"
                        >
                          D
                        </span>
                        <b>Daniel Okafor</b>
                      </span>
                      Can we move this to Tuesday? Marketing needs one more day.
                    </aside>
                  </div>
                </div>
              </article>
            </div>

            <div className="studio__panel studio__panel--sheet">
              <MiniSheet />
            </div>

            <div className="studio__panel studio__panel--slides">
              <div className="deck">
                <ol className="deck__strip" aria-label="Slides">
                  <li className="deck__thumb is-on">
                    <span>Quarterly review</span>
                  </li>
                  <li className="deck__thumb">
                    <span>What we shipped</span>
                  </li>
                  <li className="deck__thumb">
                    <span>Next quarter</span>
                  </li>
                </ol>
                <section className="slide" aria-label="Slide 1">
                  <span className="slide__shape" aria-hidden="true" />
                  <h2 className="slide__title" {...editable}>
                    Quarterly review
                  </h2>
                  <p className="slide__sub" {...editable}>
                    Three launches, one new office, and what comes next
                  </p>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap row" aria-labelledby="publish-title">
          <div className="row__text">
            <h2 id="publish-title">Publish with one switch</h2>
            <p>
              Turn on publishing and anyone with the link can read the page,
              sheet or deck, with no account. Turn it off and the link stops
              working.
            </p>
          </div>
          <figure className="browser">
            <div className="browser__bar">
              <span className="browser__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="browser__url">
                docs.kabeers.network/p/launch-plan
              </span>
            </div>
            <div className="browser__page">
              <span className="browser__badge">Published</span>
              <b>Launch plan</b>
              <span>
                We open the beta to the first two hundred teams on Monday.
              </span>
              <span className="browser__line" />
              <span className="browser__line browser__line--short" />
            </div>
          </figure>
        </section>

        <section className="wrap row" aria-labelledby="api-title">
          <div className="row__text">
            <h2 id="api-title">Build on it</h2>
            <p>
              Every file is reachable over a plain REST API. Fill a spreadsheet
              from a script, export a document as Markdown, or create files from
              your own app.
            </p>
            <a href={LINKS.developers} className="link">
              Read the API docs
            </a>
          </div>
          <pre className="code">
            <code>{API_SAMPLE}</code>
          </pre>
        </section>

        <section className="wrap row" aria-labelledby="price-title">
          <div className="row__text">
            <h2 id="price-title">What it costs</h2>
            <p>
              Nothing. Docs is made by Kabeer&apos;s Network and released under
              the GPL-3.0 license.
            </p>
          </div>
          <table className="prices">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {PRICES.map(([feature, price]) => (
                <tr key={feature}>
                  <td>{feature}</td>
                  <td>{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="wrap templates" aria-labelledby="templates-title">
          <h2 id="templates-title" className="templates__title">
            Or start from a template
          </h2>
          <ul className="templates__row">
            {TEMPLATES.map((t) => (
              <li key={t.name}>
                <a href={LINKS.signUp} className="template">
                  <span className="template__well">
                    <span className="mini" aria-hidden="true">
                      {t.body}
                    </span>
                  </span>
                  <span className="template__name">{t.name}</span>
                  <span className="template__kind">{t.kind}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="wrap outro">
          <h2>Make something today.</h2>
          <a href={LINKS.signUp} className="btn btn--primary btn--lg">
            Start for free
          </a>
        </section>
      </main>

      <footer className="wrap footer">
        <a href={LINKS.github}>Open source under GPL-3.0</a>
        <a href={LINKS.developers}>API</a>
        <a href={LINKS.network}>Kabeer&apos;s Network</a>
        <a href={LINKS.signIn}>Sign in</a>
        <span className="footer__copy">&copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
