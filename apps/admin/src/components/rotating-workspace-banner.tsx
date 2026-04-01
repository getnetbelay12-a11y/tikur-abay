'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ConsoleLanguage } from '../lib/i18n';
import { useConsoleI18n } from '../lib/use-console-i18n';

type WorkspaceBannerSlideContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type WorkspaceBannerSlide = {
  id: string;
  image?: string;
  content: Record<ConsoleLanguage, WorkspaceBannerSlideContent>;
};

type Props = {
  slides: WorkspaceBannerSlide[];
  className?: string;
};

const ROTATE_MS = 6000;

export function RotatingWorkspaceBanner({ slides, className = '' }: Props) {
  const { language } = useConsoleI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = slides[index] ?? slides[0];
  const activeContent = activeSlide?.content[language] ?? activeSlide?.content.en;

  useEffect(() => {
    slides.forEach((slide) => {
      if (!slide.image) return;
      const image = new Image();
      image.src = slide.image;
    });
  }, [slides]);

  useEffect(() => {
    if (!activeSlide || paused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [activeSlide, paused, slides.length]);

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(120deg, rgba(7, 19, 35, 0.8) 0%, rgba(7, 19, 35, 0.56) 45%, rgba(7, 19, 35, 0.22) 100%), url(${activeSlide?.image || '/branding/login-hero-transport.png'})`,
    }),
    [activeSlide],
  );

  if (!activeSlide || !activeContent) return null;

  return (
    <section
      className={`workspace-rotating-banner ${className}`.trim()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={activeSlide.id} className="workspace-rotating-banner-media" style={backgroundStyle} />
      <div className="workspace-rotating-banner-content">
        <div className="workspace-rotating-banner-copy">
          <div className="workspace-rotating-banner-eyebrow">
            {activeContent.eyebrow}
          </div>
          <h2>{activeContent.title}</h2>
          <p>{activeContent.subtitle}</p>
        </div>
      </div>

      <div className="workspace-rotating-banner-controls">
        <div className="workspace-rotating-banner-dots">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              className={slideIndex === index ? 'workspace-rotating-banner-dot active' : 'workspace-rotating-banner-dot'}
              aria-label={`Show banner ${slideIndex + 1}`}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
        <div className="workspace-rotating-banner-nav">
          <button
            type="button"
            className="workspace-rotating-banner-nav-button"
            aria-label="Previous banner"
            onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
          >
            ‹
          </button>
          <button
            type="button"
            className="workspace-rotating-banner-nav-button"
            aria-label="Next banner"
            onClick={() => setIndex((current) => (current + 1) % slides.length)}
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}

export const executiveBannerSlides: WorkspaceBannerSlide[] = [
  {
    id: 'executive-tracking',
    image: '/branding/tikur-abay-transport.png',
    content: {
      en: {
        eyebrow: 'Executive control',
        title: 'Live fleet visibility',
        subtitle: 'Track movement, delays, and corridor handoff before issues become executive escalations.',
      },
      am: {
        eyebrow: 'የአስፈፃሚ ቁጥጥር',
        title: 'የቀጥታ ፍሊት እይታ',
        subtitle: 'እንቅስቃሴን፣ መዘግየቶችን እና የኮሪደር ርክክብን ጉዳይ ከመሆኑ በፊት ይከታተሉ።',
      },
    },
  },
  {
    id: 'executive-corridor',
    image: '/branding/tikur-abay-transport-1.png',
    content: {
      en: {
        eyebrow: 'Executive control',
        title: 'Transport corridor operations',
        subtitle: 'Monitor Addis Ababa to Djibouti corridor operations in real time.',
      },
      am: {
        eyebrow: 'የአስፈፃሚ ቁጥጥር',
        title: 'የትራንስፖርት ኮሪደር ኦፕሬሽኖች',
        subtitle: 'ከአዲስ አበባ እስከ ጅቡቲ ያለውን የኮሪደር ኦፕሬሽን በቀጥታ ይከታተሉ።',
      },
    },
  },
  {
    id: 'executive-fleet',
    image: '/branding/tikur-abay-transport-2.png',
    content: {
      en: {
        eyebrow: 'Executive control',
        title: 'Fleet and trip management',
        subtitle: 'Review vehicles, dispatch queues, and maintenance follow-up.',
      },
      am: {
        eyebrow: 'የአስፈፃሚ ቁጥጥር',
        title: 'የፍሊት እና የጉዞ አስተዳደር',
        subtitle: 'ተሽከርካሪዎችን፣ የዲስፓች ወረፋዎችን እና የጥገና ክትትልን ይገምግሙ።',
      },
    },
  },
];

export const operationsBannerSlides: WorkspaceBannerSlide[] = [
  {
    id: 'operations-tracking',
    image: '/branding/login-hero-transport.png',
    content: {
      en: {
        eyebrow: 'Operations control',
        title: 'Live fleet visibility',
        subtitle: 'Open active vehicle movement, delayed trips, and dispatch follow-up from one control strip.',
      },
      am: {
        eyebrow: 'የኦፕሬሽን ቁጥጥር',
        title: 'የቀጥታ ፍሊት እይታ',
        subtitle: 'ንቁ የተሽከርካሪ እንቅስቃሴን፣ የዘገዩ ጉዞዎችን እና የዲስፓች ክትትልን ከአንድ የቁጥጥር ባነር ይክፈቱ።',
      },
    },
  },
  {
    id: 'operations-maintenance',
    image: '/branding/login-hero-transport.png',
    content: {
      en: {
        eyebrow: 'Operations control',
        title: 'Maintenance attention',
        subtitle: 'See blocked units, due service, and workshop ownership before assignment decisions.',
      },
      am: {
        eyebrow: 'የኦፕሬሽን ቁጥጥር',
        title: 'የጥገና ትኩረት',
        subtitle: 'የምደባ ውሳኔ ከመስጠትዎ በፊት የታገዱ ዩኒቶችን፣ የሚገባ ጥገናን እና የዎርክሾፕ ባለቤትነትን ይመልከቱ።',
      },
    },
  },
  {
    id: 'operations-finance',
    image: '/branding/login-hero-transport.png',
    content: {
      en: {
        eyebrow: 'Operations control',
        title: 'Payments and collections',
        subtitle: 'Keep finance follow-up visible while trips, fuel, and documents continue moving operationally.',
      },
      am: {
        eyebrow: 'የኦፕሬሽን ቁጥጥር',
        title: 'ክፍያዎች እና ስብስቦች',
        subtitle: 'ጉዞዎች፣ ነዳጅ እና ሰነዶች በኦፕሬሽን ሲቀጥሉ የፋይናንስ ክትትልን እንዲታይ ያድርጉ።',
      },
    },
  },
];

export const customerDeskBannerSlides: WorkspaceBannerSlide[] = [
  {
    id: 'customer-documents',
    image: '/branding/login-hero-transport.png',
    content: {
      en: {
        eyebrow: 'Customer workspace',
        title: 'Documents and agreements',
        subtitle: 'Keep customer records, signed files, and contract status in one operational workspace.',
      },
      am: {
        eyebrow: 'የደንበኛ የስራ ቦታ',
        title: 'ሰነዶች እና ስምምነቶች',
        subtitle: 'የደንበኛ መዝገቦችን፣ የተፈረሙ ፋይሎችን እና የውል ሁኔታን በአንድ የኦፕሬሽን የስራ ቦታ ውስጥ ያቆዩ።',
      },
    },
  },
  {
    id: 'customer-payments',
    image: '/branding/login-hero-transport.png',
    content: {
      en: {
        eyebrow: 'Customer workspace',
        title: 'Payments and collections',
        subtitle: 'Review invoices, receipts, and account follow-up without jumping between modules.',
      },
      am: {
        eyebrow: 'የደንበኛ የስራ ቦታ',
        title: 'ክፍያዎች እና ስብስቦች',
        subtitle: 'በሞጁሎች መካከል ሳይዘልሉ ደረሰኞችን፣ ደረሰኝ ማስረጃዎችን እና የመለያ ክትትልን ይገምግሙ።',
      },
    },
  },
  {
    id: 'customer-hr',
    image: '/branding/login-hero-transport.png',
    content: {
      en: {
        eyebrow: 'Customer workspace',
        title: 'Driver and HR workflow',
        subtitle: 'Keep people, onboarding, and driver workflow visible alongside customer delivery commitments.',
      },
      am: {
        eyebrow: 'የደንበኛ የስራ ቦታ',
        title: 'የሹፌር እና የHR የስራ ሂደት',
        subtitle: 'የደንበኛ ማድረስ ግዴታዎች ጋር በአንድ ጊዜ ሰዎችን፣ የመግቢያ ሂደትን እና የሹፌር የስራ ፍሰትን እንዲታይ ያድርጉ።',
      },
    },
  },
];
