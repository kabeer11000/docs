import ic_document_duplicate from '../../../../public/svgs/ic_document_duplicate.svg';
import ic_identification from '../../../../public/svgs/ic_identification.svg';
import ic_lock_closed from '../../../../public/svgs/ic_lock_closed.svg';

// For desktop
export const desktopHeaderPhrase = ['Escape the Walled', 'Garden'];
export const desktopParagraphPhrase = [
  'Docs is built on the principles of freedom and transparency. Unlike proprietary platforms,',
  'our entire codebase is open-source under GPL-3.0. You own your data.',
];

// For mobile
export const mobileHeaderPhrase = ['Escape the', 'Walled Garden'];
export const mobileParagraphPhrase = [
  'Docs is open-source under GPL-3.0.',
  'Built on freedom and transparency.',
  'You own your data.',
];

export const edges = [
  {
    point: 'Open Source',
    details:
      'View every line of code. Audit security. Contribute features. No hidden algorithms or corporate interests. Transparency by default.',
    icon: ic_document_duplicate,
  },
  {
    point: 'Self-Hostable',
    details:
      'Run Docs on your own servers. Keep your documents where you want them. Perfect for enterprises and privacy-conscious organizations.',
    icon: ic_identification,
  },
  {
    point: 'Data Privacy',
    details:
      'Your documents are yours alone. No data harvesting. No ads. No selling your data. Full encryption and complete control.',
    icon: ic_lock_closed,
  },
];
