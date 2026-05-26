// scripts/animations/index.js

import { initMatchMedia, cleanupScrollTriggers } from './utils.js';
import { initNavbar } from './navbar.js';
import { initHero } from './hero.js';
import { initSections } from './sections.js';
import { initFooter } from './footer.js';

window.LandingAnimations = (() => {
  let ctx;

  function init() {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    
    if (prefersReducedMotion) {
      return;
    }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    if (ctx) ctx.revert();
    cleanupScrollTriggers();

    const mm = initMatchMedia();

    ctx = gsap.context(() => {
      initNavbar(mm);
      initHero(mm);
      initSections(mm);
      initFooter(mm);
    });
  }

  return { init };
})();

// Initialize automatically if script is loaded for landing page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash === 'landing') {
      setTimeout(() => {
        if (!window.__landingAnimationsInitialized) {
          window.__landingAnimationsInitialized = true;
          window.LandingAnimations.init();
        }
      }, 100);
    }
  });
} else {
  const hash = window.location.hash.replace('#', '');
  if (!hash || hash === 'landing') {
    setTimeout(() => {
      if (!window.__landingAnimationsInitialized) {
        window.__landingAnimationsInitialized = true;
        window.LandingAnimations.init();
      }
    }, 100);
  }
}

// React to SPA navigation
window.addEventListener('pageLoaded', (e) => {
  if (e.detail.page === 'landing') {
    setTimeout(() => {
      if (!window.__landingAnimationsInitialized) {
        window.__landingAnimationsInitialized = true;
        window.LandingAnimations.init();
      }
    }, 50);
  } else {
    // If we leave the landing page, we should clean up
    window.__landingAnimationsInitialized = false;
    cleanupScrollTriggers();
  }
});
