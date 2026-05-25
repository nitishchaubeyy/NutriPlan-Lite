// scripts/animations/footer.js

export function initFooter(mm) {
  mm.add({
    reduceMotion: '(prefers-reduced-motion: reduce)',
    noPreference: '(prefers-reduced-motion: no-preference)'
  }, (context) => {
    const { reduceMotion } = context.conditions;

    const footerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.footer-divider',
        start: 'top 90%',
        toggleActions: 'play none none none'
      }
    });

    // Animate the divider line
    footerTl.from('.footer-divider', {
      scaleX: 0,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      clearProps: 'all'
    });

    // Reveal the footer background
    footerTl.from('.landing-footer', {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      clearProps: 'all'
    }, '-=0.3');

    // Staggered reveal of columns from left to right
    footerTl.from('.footer-column', {
      x: reduceMotion ? 0 : -20,
      y: reduceMotion ? 0 : 15,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.out',
      clearProps: 'all'
    }, '-=0.4');

    // Animate footer badges with slight delay
    footerTl.from('.badge-item', {
      scale: reduceMotion ? 1 : 0.8,
      opacity: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'back.out(1.5)',
      clearProps: 'all'
    }, '-=0.3');

    // Animate bottom section
    footerTl.from('.footer-divider-line, .footer-bottom', {
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
      clearProps: 'all'
    }, '-=0.2');
  });
}
