import { Icon, LogoMark } from './icons';

const MENUS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'];
const PEOPLE = [
  { initial: 'S', color: 'var(--c-rose)' },
  { initial: 'D', color: 'var(--c-teal)' },
  { initial: 'A', color: 'var(--c-amber)' },
];

const Sep = () => <span className="mock-tb__sep" />;

export default function EditorMock() {
  return (
    <div
      className="mock"
      role="img"
      aria-label="The Docs editor: a product brief being edited by three people, with a live collaborator cursor and a comment in the margin."
    >
      <div className="mock-head">
        <LogoMark size={28} />
        <div className="mock-head__title">
          <div className="mock-head__name">
            Product brief: Offline mode <span className="mock-head__saved">Saved</span>
          </div>
          <div className="mock-head__menus">
            {MENUS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
        <div className="mock-head__right">
          <div className="avatars">
            {PEOPLE.map((p) => (
              <span key={p.initial} className="avatar" style={{ background: p.color }}>
                {p.initial}
              </span>
            ))}
          </div>
          <span className="mock-share">Share</span>
        </div>
      </div>

      <div className="mock-tb">
        <Icon name="undo" size={15} />
        <Icon name="redo" size={15} />
        <Sep />
        <span className="mock-tb__select">
          Normal text <Icon name="chevronDown" size={12} />
        </span>
        <span className="mock-tb__select hide-xs">
          Inter <Icon name="chevronDown" size={12} />
        </span>
        <Sep />
        <b className="mock-tb__glyph">B</b>
        <i className="mock-tb__glyph">I</i>
        <u className="mock-tb__glyph">U</u>
        <span className="mock-tb__more">
          <Sep />
          <Icon name="link" size={15} />
          <Icon name="alignLeft" size={15} />
          <Icon name="list" size={15} />
        </span>
        <span className="mock-tb__spacer" />
        <span className="mock-tb__ai">
          <Icon name="sparkles" size={14} /> <span className="mock-tb__ai-label">Ask AI</span>
        </span>
      </div>

      <div className="mock-canvas">
        <div className="paper">
          <h3 className="paper__h1">Product brief: Offline mode</h3>
          <p className="paper__meta">Owner: Amna Rauf &middot; Updated today</p>

          <h4 className="paper__h2">Summary</h4>
          <p className="paper__p">
            Writers lose work when the connection drops. Offline mode keeps every change on the device and syncs it
            the moment you are back online, with <mark className="paper__comment">no conflicts to resolve by hand</mark>.
          </p>

          <h4 className="paper__h2">Goals</h4>
          <ul className="paper__list">
            <li>Edit any document without a connection</li>
            <li>Merge changes automatically when you reconnect</li>
            <li>Show a clear sync status in the header</li>
          </ul>

          <h4 className="paper__h2">
            Timeline
            <span className="caret">
              <span className="caret__flag">Sara</span>
            </span>
          </h4>
          <div className="paper__lines">
            <span style={{ width: '96%' }} />
            <span style={{ width: '88%' }} />
            <span style={{ width: '92%' }} />
            <span style={{ width: '54%' }} />
          </div>
        </div>

        <aside className="mock-comment">
          <div className="mock-comment__who">
            <span className="avatar avatar--sm" style={{ background: 'var(--c-teal)' }}>
              D
            </span>
            <span>Daniel</span>
            <span className="mock-comment__time">2m</span>
          </div>
          <p>Can we add a line about storage limits on mobile?</p>
        </aside>
      </div>
    </div>
  );
}
