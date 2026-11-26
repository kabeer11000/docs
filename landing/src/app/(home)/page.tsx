import Typist from '@/components/Typist';
import { GitHubIcon, LogoMark } from '@/components/icons';
import { LINKS } from '@/lib/site';

const PRICES: [string, string][] = [
  ['Real-time editing', 'Free'],
  ['Comments and sharing', 'Free'],
  ['Templates', 'Free'],
  ['E-signatures', 'Free'],
  ['AI assistant', 'Free, with your own key'],
];

const TEMPLATES: { name: string; kind: string; body: React.ReactNode }[] = [
  {
    name: 'Resume',
    kind: 'Personal',
    body: (
      <>
        <b className="mini__h">Sana Malik</b>
        <span className="mini__sub">Product designer, Lahore</span>
        <b className="mini__k">Experience</b>
        <span>Senior designer at Kabeer&apos;s Network, 2023 to now. Led the editor redesign and the new sharing flow.</span>
        <span>Designer at Northwind, 2020 to 2023. Shipped the mobile app used by 40,000 drivers.</span>
        <b className="mini__k">Education</b>
        <span>BSc Computer Science, LUMS, 2020.</span>
      </>
    ),
  },
  {
    name: 'Meeting notes',
    kind: 'Work',
    body: (
      <>
        <b className="mini__h">Weekly sync</b>
        <span className="mini__sub">Thursday, 27 November</span>
        <b className="mini__k">Attendees</b>
        <span>Amna, Daniel, Sara, Bilal</span>
        <b className="mini__k">Decisions</b>
        <span>Ship offline mode to beta on Monday. Daniel owns the release notes.</span>
        <b className="mini__k">Next steps</b>
        <span>Sara to review the onboarding copy before Friday.</span>
      </>
    ),
  },
  {
    name: 'Project proposal',
    kind: 'Work',
    body: (
      <>
        <b className="mini__h">Community library app</b>
        <span className="mini__sub">Proposal for the city council</span>
        <b className="mini__k">Summary</b>
        <span>
          A simple way for neighbours to lend and borrow books, tools and games, with no fees and no adverts.
        </span>
        <b className="mini__k">Budget</b>
        <span>Hosting and design for one year: 1.2 million rupees.</span>
      </>
    ),
  },
  {
    name: 'Letter',
    kind: 'Personal',
    body: (
      <>
        <span className="mini__sub">27 November 2026</span>
        <span>Dear Ms Rahman,</span>
        <span>
          Thank you for the warm welcome last week. I have attached the signed lease and the inventory we walked
          through together.
        </span>
        <span>Please let me know if anything else is needed before the keys are handed over.</span>
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
  role: 'textbox',
  'aria-multiline': true,
} as const;

export default function Home() {
  return (
    <>
      <header className="col strip">
        <a href={LINKS.signUp} className="strip__brand" aria-label="Docs, create an account">
          <LogoMark />
          <span>Docs</span>
        </a>
        <span className="strip__hint">Click the page to type</span>
        <div className="strip__right">
          <span className="presence" aria-hidden="true">
            <span className="avatar avatar--amna">A</span>
            <span className="avatar avatar--daniel">D</span>
          </span>
          <a href={LINKS.github} className="btn btn--ghost btn--icon" aria-label="Source code on GitHub">
            <GitHubIcon />
          </a>
          <a href={LINKS.signIn} className="btn btn--ghost">
            Sign in
          </a>
          <a href={LINKS.signUp} className="btn btn--primary">
            Start writing
          </a>
        </div>
      </header>

      <main className="col">
        <article className="sheet" aria-label="Page 1 of a sample document">
          <h1 className="doc__title">A free place to write, together.</h1>
          <div className="doc__body" {...editable} aria-label="Sample document, page 1. You can type here.">
            <p>
              Docs is a document editor that runs in your browser. It is free, open source, and built for writing with
              other people in real time. This page is a document too, so click anywhere and start typing.
            </p>
            <p className="doc__cta" contentEditable={false}>
              <a href={LINKS.signUp} className="btn btn--primary btn--lg">
                Start writing
              </a>
              <a href={LINKS.signIn} className="doc__link">
                Sign in
              </a>
            </p>

            <h2>Write with anyone</h2>
            <p>
              Invite people and you will see their cursors move as they work. Every change lands for everyone at once,
              with nothing to refresh and no copies to merge.{' '}
              <Typist name="Amna" text="Hi, I'm Amna. I can see each word you type, the moment you type it." />
            </p>

            <h2>Leave notes in the margin</h2>
            <div className="note-anchor">
              <aside className="note" contentEditable={false} aria-label="Comment from Daniel Okafor">
                <div className="note__who">
                  <span className="avatar avatar--daniel avatar--sm" aria-hidden="true">
                    D
                  </span>
                  <span className="note__name">Daniel Okafor</span>
                  <span className="note__time">2 min ago</span>
                </div>
                <p>Comments stay next to the words they are about. Reply, resolve, or mention someone to bring them in.</p>
              </aside>
              <p>
                Select any words and <mark>leave a comment</mark>, like this one. Share the
                document with a link and choose who can view, comment or edit.
              </p>
            </div>

            <h2>What it costs</h2>
            <table className="doc__table" contentEditable={false}>
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
          </div>
        </article>

        <p className="pagebreak" aria-hidden="true">
          Page 2
        </p>

        <article className="sheet sheet--cont" aria-label="Page 2 of a sample document">
          <div className="doc__body" {...editable} aria-label="Sample document, page 2. You can type here.">
            <h2>Real pages</h2>
            <p>
              Documents are laid out on pages with margins and page breaks. This one just turned onto page 2, and it
              will print exactly the way you see it.
            </p>

            <h2>Ask AI, then decide</h2>
            <p>
              The assistant can draft, shorten or rewrite a passage. It suggests edits the way a colleague would, and
              you <del>decide what happens to them</del>
              <ins>keep only the ones you like</ins>.
            </p>
            <p className="suggestion" contentEditable={false}>
              Suggested by Ask AI, using your own API key.
            </p>

            <h2>Sign where it counts</h2>
            <p>Send a document for signature and people sign it right on the page, without printing anything.</p>
            <figure className="signature" contentEditable={false}>
              <svg viewBox="0 0 150 46" width="150" height="46" role="img" aria-label="Signature of Daniel Okafor">
                <path
                  d="M8 36C8 20 10 8 16 8c8 0 14 14 6 24-6 8-16 6-12-2 4-8 20-4 24 0 3 3 6-6 9-4s1 8 5 6 6-10 9-8-1 9 3 8 6-12 10-18c-2 10-4 18 0 18 6 0 10-10 16-8 4 2 2 8 7 7 9-2 23-5 45-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <figcaption>
                <span>Signed by Daniel Okafor</span>
                <span className="signature__date">27 November 2026</span>
              </figcaption>
            </figure>

            <p className="doc__end">
              Docs is made by Kabeer&apos;s Network and released under the GPL-3.0 license.{' '}
              <a href={LINKS.signUp} className="doc__link" contentEditable={false}>
                Start your own
              </a>
              .
            </p>
          </div>
        </article>

        <section className="templates" aria-labelledby="templates-title">
          <h2 id="templates-title" className="templates__title">
            Or start from a template
          </h2>
          <ul className="templates__row">
            {TEMPLATES.map((t) => (
              <li key={t.name}>
                <a href={LINKS.signUp} className="template">
                  <span className="mini" aria-hidden="true">
                    {t.body}
                  </span>
                  <span className="template__name">{t.name}</span>
                  <span className="template__kind">{t.kind}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="col footer">
        <a href={LINKS.github}>Open source under GPL-3.0</a>
        <a href={LINKS.network}>Kabeer&apos;s Network</a>
        <a href={LINKS.signIn}>Sign in</a>
        <a href={LINKS.signUp}>Create account</a>
        <span className="footer__copy">&copy; {new Date().getFullYear()}</span>
      </footer>
    </>
  );
}
