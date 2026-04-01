'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  image: string;
  tone: string;
};

const slides: HeroSlide[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tikur Abay Manager Console',
    subtitle: 'Run one shipment journey from China supplier handoff to Djibouti release, inland delivery, customer approval, and empty return.',
    ctaLabel: 'Sign in',
    href: '#login-card',
    image: '/branding/login-hero-transport.png',
    tone: 'hero-slide-welcome',
  },
  {
    id: 'tracking',
    title: 'Track the corridor from gate-out to customer receipt',
    subtitle: 'Monitor inland truck movement, checkpoint updates, arrival confirmation, and return of the empty container to Djibouti.',
    ctaLabel: 'Open live tracking',
    href: '/tracking',
    image: '/branding/login-hero-transport.png',
    tone: 'hero-slide-tracking',
  },
  {
    id: 'workspace',
    title: 'Keep documents, approvals, and closure in one place',
    subtitle: 'Work through invoice, packing list, BL, release, customer approval after receipt, and empty-return closure without switching systems.',
    ctaLabel: 'Explore workspace',
    href: '/documents',
    image: '/branding/login-hero-transport.png',
    tone: 'hero-slide-workspace',
  },
];

const ROTATE_MS = 5000;

export function LoginHeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = slides[index];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(180deg, rgba(7, 19, 35, 0.16) 0%, rgba(7, 19, 35, 0.78) 100%), url(${activeSlide.image})`,
    }),
    [activeSlide.image],
  );

  return (
    <section
      className={`login-hero-shell ${activeSlide.tone}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="login-hero-media" style={backgroundStyle} />
      <div className="login-hero-overlay" />

      <div className="login-hero-content">
        <div className="login-hero-brand">
          <div className="login-hero-brand-chip">
            <img src="/branding/tikur-abay-logo.png" alt="Tikur Abay logo" className="login-hero-brand-logo" />
            <span>Tikur Abay</span>
          </div>
          <span className="login-hero-brand-line">Manager Console</span>
        </div>

        <div className="login-hero-copy">
          <div className="login-hero-kicker">Transport operations workspace</div>
          <h1>{activeSlide.title}</h1>
          <p>{activeSlide.subtitle}</p>
        </div>

        <div className="login-hero-actions">
          <Link href={activeSlide.href} className="btn login-hero-cta">
            {activeSlide.ctaLabel}
          </Link>

          <div className="login-hero-indicators" aria-label="Hero slides">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                className={slideIndex === index ? 'login-hero-dot active' : 'login-hero-dot'}
                aria-label={`Show slide ${slideIndex + 1}`}
                aria-pressed={slideIndex === index}
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="login-hero-nav">
        <button
          type="button"
          className="login-hero-nav-button"
          aria-label="Previous slide"
          onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
        >
          ‹
        </button>
        <button
          type="button"
          className="login-hero-nav-button"
          aria-label="Next slide"
          onClick={() => setIndex((current) => (current + 1) % slides.length)}
        >
          ›
        </button>
      </div>
    </section>
  );
}
