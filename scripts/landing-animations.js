// ================================================================
// landing-animations.js — GSAP Animations for the Landing Page
// ================================================================

window.LandingAnimations = (() => {
  let ctx;

  function init() {
    // Only run if gsap is loaded
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // Clean up previous animations if re-initializing
    if (ctx) ctx.revert();
    
    // Create a new GSAP context to keep animations scoped and easy to kill
    ctx = gsap.context(() => {
      // 1. Initial Hero Load Animation
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Navbar items drop down
      heroTl.from('.landing-header-container > *', {
        y: -20,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        clearProps: 'all' // removes inline styles after completion
      });

      // Hero text elements float up
      heroTl.from('.landing-title, .landing-subtitle', {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        clearProps: 'all'
      }, '-=0.4');

      // Hero buttons pop in
      heroTl.from('.hero-cta > *', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        clearProps: 'all'
      }, '-=0.6');

      // Hero visual (mock cards) float in with slight rotation
      heroTl.from('.mock-card', {
        y: 60,
        opacity: 0,
        rotationX: -15,
        duration: 1.2,
        stagger: 0.2,
        ease: 'back.out(1.2)',
        clearProps: 'all',
        transformPerspective: 1000
      }, '-=0.6');

      // 2. ScrollTrigger Animations for remaining sections
      
      // Features Grid Stagger
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '.landing-features',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        clearProps: 'all'
      });

      // Bottom CTA Panel
      gsap.from('.cta-panel', {
        scrollTrigger: {
          trigger: '.landing-cta',
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        },
        y: 40,
        opacity: 0,
        scale: 0.98,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'all'
      });

      // Footer Elements
      gsap.from('.landing-footer', {
        scrollTrigger: {
          trigger: '.landing-footer',
          start: 'top 95%',
          toggleActions: 'play none none reverse'
        },
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        clearProps: 'all'
      });

    });
  }

  return { init };
})();

// Listen for page loads to trigger animations
window.addEventListener('pageLoaded', (e) => {
  if (e.detail.page === 'landing') {
    // Slight delay to ensure DOM is fully painted
    setTimeout(() => {
      window.LandingAnimations.init();
    }, 50);
  }
});
