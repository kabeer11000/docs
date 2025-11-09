type FAQItem = {
  question: string;
  answer: string;
};

export const desktopHeaderPhrase = ['Frequently asked', 'questions'];
export const mobileHeaderPhrase = ['Frequently', 'asked', 'questions'];
export const animate = {
  initial: {
    y: '100%',
    opacity: 0,
  },
  open: (i: number) => ({
    y: '0%',
    opacity: 1,
    transition: { duration: 1, delay: 0.1 * i, ease: [0.33, 1, 0.68, 1] },
  }),
};

export const faqData: FAQItem[] = [
  {
    question: 'Is Docs really free to use?',
    answer:
      'Yes, absolutely. Docs is completely free and open-source under the GPL-3.0 license. You can use it at docs.kabeers.network at no cost, or self-host it on your own servers. No subscriptions, no hidden fees.',
  },
  {
    question: 'How is Docs different from Google Docs?',
    answer:
      'Docs is open-source, so you can see exactly how it works. You can self-host it on your own servers and have complete control over your data. Google Docs harvests your data and targets you with ads. Docs doesn\'t. Plus, with Docs, you can fork the code and customize it however you want.',
  },
  {
    question: 'Can I self-host Docs on my own server?',
    answer:
      'Yes! That\'s one of the best features. Since Docs is completely open-source, you can download the code from our GitHub repository and run it on your own infrastructure. Perfect for enterprises that need complete data sovereignty.',
  },
  {
    question: 'Is my data encrypted and private?',
    answer:
      'Yes. Your documents are yours alone. We don\'t track your usage, we don\'t harvest your data, and we don\'t sell your information. The entire codebase is open-source, so you can audit the security yourself. If you self-host, your data never leaves your servers.',
  },
  {
    question: 'Does Docs support real-time collaboration?',
    answer:
      'Absolutely. Multiple users can edit the same document simultaneously. You\'ll see changes in real-time, can leave comments, and have access to full version history so you can see who changed what and when.',
  },
  {
    question: 'Can I use AI features with Docs?',
    answer:
      'Yes. Docs supports bring-your-own-key AI integration. You can add your own API keys (OpenAI, etc.) to unlock AI-powered document features like writing assistance, summarization, and more. No corporate AI agenda—just tools you control.',
  },
];
