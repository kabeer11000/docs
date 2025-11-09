import { StaticImageData } from 'next/image';
import robert_fox from '../../../../public/images/robert_fox.png';
import cameron_williamson from '../../../../public/images/cameron_williamson.png';
import esther_howard from '../../../../public/images/esther_howard.png';

export type Props = {
  testimony: string;
  person: string;
  avatar: StaticImageData;
};

export const testimonials = [
  {
    testimony:
      "Finally, a document editor that respects my privacy. Docs is open-source, fast, and actually works. No more trusting my documents to big tech companies. I've switched my entire team over.",
    person: 'Robert Fox',
    avatar: robert_fox,
  },
  {
    testimony:
      "The real-time collaboration is incredible. Our team documents have never been more organized. Plus, knowing the code is open-source and we can self-host gives us peace of mind about our data security.",
    person: 'Cameron Williamson',
    avatar: cameron_williamson,
  },
  {
    testimony:
      "I love that Docs is completely free and open-source. No vendor lock-in, no surprise pricing changes. The AI integration is the cherry on top. This is what document editing should be.",
    person: 'Esther Howard',
    avatar: esther_howard,
  },
  {
    testimony:
      "The upcoming performance improvements look amazing. Already loving the current version, but this platform's future is bright. It's refreshing to see someone building a real Google Docs alternative.",
    person: 'Cameron Williamson',
    avatar: cameron_williamson,
  },
  {
    testimony:
      "We self-hosted Docs for our enterprise. The transparency and control it gives us is unmatched. Worth every minute of setup. Highly recommend for teams serious about data privacy.",
    person: 'Robert Fox',
    avatar: robert_fox,
  },
];

export const desktopHeaderPhrase = ['Trusted by developers', 'and teams worldwide'];
