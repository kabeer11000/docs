'use client';

import { useState } from 'react';
import { GitHubIcon, Icon, LogoMark } from './icons';
import { LINKS, NAV } from '@/lib/site';

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="header">
      <div className="container header__bar">
        <a href="#top" className="brand" aria-label="Docs home" onClick={close}>
          <LogoMark />
          <span>Docs</span>
        </a>

        <nav className="header__nav" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="navlink">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header__actions">
          <a href={LINKS.github} className="btn btn--ghost btn--icon hide-sm" aria-label="Docs on GitHub">
            <GitHubIcon />
          </a>
          <a href={LINKS.signIn} className="btn btn--ghost hide-sm">
            Sign in
          </a>
          <a href={LINKS.signUp} className="btn btn--primary">
            Start writing
          </a>
          <button
            type="button"
            className="btn btn--ghost btn--icon show-sm"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={18} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="mobile-menu container" aria-label="Mobile">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="mobile-menu__link" onClick={close}>
              {item.label}
            </a>
          ))}
          <a href={LINKS.github} className="mobile-menu__link">
            GitHub
          </a>
          <a href={LINKS.signIn} className="btn btn--outline btn--block">
            Sign in
          </a>
        </nav>
      )}
    </header>
  );
}
