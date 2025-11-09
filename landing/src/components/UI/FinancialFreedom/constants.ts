
import ic_banknotes from '../../../../public/svgs/ic_banknotes.svg';
import ic_circle_stack from '../../../../public/svgs/ic_circle_stack.svg';
import ic_arrows_left_right from '../../../../public/svgs/ic_arrows_right_left.svg';

// For desktop
export const desktopHeaderPhrase = ['Collaboration Without', 'Compromise'];
export const desktopParagraphPhrase = [
  'Document editing should never mean surrendering your privacy or relying on corporate servers.',
  'Docs gives you the power of collaboration with complete control.',
];
export const desktopBriefNotePhrase = [
  'Real-time editing,',
  'true privacy, and',
  'complete transparency,',
  'all in one platform.',
];

// For mobile
export const mobileHeaderPhrase = ['Collaboration', 'Without Compromise'];
export const mobileParagraphPhrase = [
  'Document editing without surrendering privacy.',
  'Docs gives you the power of collaboration with',
  'complete control.',
];

export const mobileBriefNotePhrase = [
  'Real-time',
  ' editing,',
  'true privacy,',
  ' and complete',
  ' transparency.',
];

export const edges = [
  {
    point: 'Zero Tracking',
    details:
      'No analytics. No usage tracking. No user profiling. Your activity stays between you and your documents.',
    icon: ic_banknotes,
  },
  {
    point: 'No Ads',
    details:
      'Docs is ad-free and will remain ad-free. We don\'t monetize your attention or data. Period.',
    icon: ic_circle_stack,
  },
  {
    point: 'Full Transparency',
    details:
      'Every line of code is open-source under GPL-3.0. Audit it. Fork it. Trust it.',
    icon: ic_arrows_left_right,
  },
];
