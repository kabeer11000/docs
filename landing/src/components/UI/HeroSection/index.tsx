'use client';
import Image from 'next/image';
import { Wrapper, Inner, Pill, HeroTextContainer } from './styles';
import ic_chevron_right from '../../../../public/svgs/ic_chevron_right.svg';
import { GetStartedButton } from '@/components';
import MaskText from '@/components/Common/MaskText';
import { useIsMobile } from '../../../../libs/useIsMobile';
import {
  mobileParagraphPhrases,
  mobilePhrases,
  paragraphPhrases,
  phrases,
} from './constants';
import AnimatedLink from '@/components/Common/AnimatedLink';

const HeroSection = () => {
  const isMobile = useIsMobile();
  return (
    <Wrapper>
      <Inner>
        <Pill>
          <span>Open-source document collaboration</span>
          <Image src={ic_chevron_right} alt="chevron-right" />
        </Pill>
        <HeroTextContainer>
          {isMobile ? (
            <>
              <MaskText phrases={mobilePhrases} tag="h1" />
              <MaskText phrases={mobileParagraphPhrases} tag="p" />
            </>
          ) : (
            <>
              <MaskText phrases={phrases} tag="h1" />
              <MaskText phrases={paragraphPhrases} tag="p" />
            </>
          )}
        </HeroTextContainer>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <GetStartedButton padding="1rem 2rem" />
          <div style={{display: 'flex', alignItems: 'center'}}>
            <AnimatedLink title={'Self-host'}></AnimatedLink>
          </div>
        </div>
      </Inner>
    </Wrapper>
  );
};

export default HeroSection;
