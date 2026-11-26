const APP = 'https://docs.kabeers.network';

export const LINKS = {
  app: APP,
  signIn: `${APP}/auth/login`,
  signUp: `${APP}/signup`,
  github: 'https://github.com/kabeer11000/docs',
  license: 'https://github.com/kabeer11000/docs/blob/HEAD/LICENSE',
  contributing: 'https://github.com/kabeer11000/docs/blob/HEAD/CONTRIBUTING',
  issues: 'https://github.com/kabeer11000/docs/issues',
  network: 'https://kabeers.network',
} as const;

export const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'Templates', href: '#templates' },
  { label: 'Open source', href: '#open-source' },
] as const;
