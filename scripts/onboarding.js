// ================================================================
// onboarding.js — Step-by-Step Profile Wizard & Spotlight Tour Engine
// NutriPlan-Lite
// ================================================================

window.Onboarding = (() => {
  let activeStep = 1;
  const totalSteps = 5;

  let tourIndex = 0;
  let activeTourElement = null;

  // ── Step-by-Step Onboarding Profile Wizard ─────────────────────

  function showWizardStep(stepNum) {
    activeStep = stepNum;

    // 1. Toggle step panels visibility
    for (let i = 1; i <= totalSteps; i++) {
      const panel = document.getElementById(`onboarding-step-${i}`);
      if (panel) {
        panel.classList.toggle('active', i === stepNum);
        panel.classList.toggle('hidden', i !== stepNum);
      }
    }

    // 2. Update wizard headers
    const progressFill = document.getElementById('onboarding-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${(stepNum / totalSteps) * 100}%`;
    }

    const stepLabel = document.getElementById('onboarding-eyebrow');
    if (stepLabel) {
      const titles = [
        'Welcome',
        'Physical Metrics',
        'Goals & Activity',
        'Dietary & Hydration',
        'Memact Context'
      ];
      stepLabel.textContent = `Step ${stepNum} of ${totalSteps} • ${titles[stepNum - 1]}`;
    }

    const modalTitle = document.getElementById('onboarding-title');
    if (modalTitle) {
      const headings = [
        'Welcome to NutriPlan',
        'Body Metrics',
        'Fitness & Energy Goals',
        'Preferences & Water Target',
        'Optional Fitness Sync'
      ];
      modalTitle.textContent = headings[stepNum - 1];
    }

    // 3. Update wizard step dot indicators
    const dots = document.querySelectorAll('.onboarding-wizard-footer .step-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === stepNum - 1);
    });

    // 4. Toggle buttons visibility
    const backBtn = document.getElementById('btn-onboarding-back');
    if (backBtn) {
      backBtn.classList.toggle('hidden', stepNum === 1);
    }

    const nextBtn = document.getElementById('btn-onboarding-next');
    const saveBtn = document.getElementById('save-profile-btn');
    if (nextBtn && saveBtn) {
      if (stepNum === totalSteps) {
        nextBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
      } else {
        nextBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
      }
    }
  }

  function validateWizardStep(stepNum) {
    if (stepNum === 2) {
      const ageVal = parseFloat(document.getElementById('age')?.value);
      const weightVal = parseFloat(document.getElementById('weight')?.value);
      const heightVal = parseFloat(document.getElementById('height')?.value);

      if (isNaN(ageVal) || ageVal < 1 || ageVal > 120) {
        Toast.show('Please enter a valid age (1-120).', 'warning');
        return false;
      }
      if (isNaN(weightVal) || weightVal < 20 || weightVal > 300) {
        Toast.show('Please enter a valid weight in kg (20-300).', 'warning');
        return false;
      }
      if (isNaN(heightVal) || heightVal < 50 || heightVal > 280) {
        Toast.show('Please enter a valid height in cm (50-280).', 'warning');
        return false;
      }
    } else if (stepNum === 4) {
      const waterVal = parseFloat(document.getElementById('waterTarget')?.value);
      if (isNaN(waterVal) || waterVal < 500 || waterVal > 10000) {
        Toast.show('Please enter a valid hydration goal (500ml - 10L).', 'warning');
        return false;
      }
    }
    return true;
  }

  function nextWizardStep() {
    if (validateWizardStep(activeStep)) {
      if (activeStep < totalSteps) {
        showWizardStep(activeStep + 1);
      }
    }
  }

  function prevWizardStep() {
    if (activeStep > 1) {
      showWizardStep(activeStep - 1);
    }
  }

  function showWizard() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.classList.remove('hidden');
      showWizardStep(1);
    }
  }

  // ── Spotlight Interactive Tour Configuration & Methods ─────────

  const tourSteps = [
    {
      selector: '#nutrition-score-ring',
      title: 'Daily Readiness Score',
      desc: 'This premium indicator measures your daily health index and adherence scores by analyzing food intake balances, target calories, and hydration indexes.',
      position: 'bottom'
    },
    {
      selector: '#calories-card',
      title: 'Daily Energy & Macros',
      desc: 'Track calories consumed against targets. View live protein, carb, and fat progress bars paired with an interactive macro balance label.',
      position: 'bottom'
    },
    {
      selector: '#meals',
      title: 'Meal Timeline & Loggers',
      desc: 'Add breakfast, lunch, dinner, or snacks here. Click + Add Food, use the search queries bar, or select quick filter chips to isolate records.',
      position: 'top'
    },
    {
      selector: '.hydration-panel',
      title: 'Hydration Tracker',
      desc: 'Monitor daily water goals with this animated bottle visualizer. Click quick-add buttons (+100ml, +250ml, +500ml) to log fluids in real-time.',
      position: 'left'
    },
    {
      selector: '.memact-context-card',
      title: 'AI Recommendations & Context',
      desc: 'Receive personalized action recommendations based on your goals, and manage your high-privacy Memact connections securely.',
      position: 'left'
    },
    {
      selector: '.charts-panel',
      title: 'Analytics & Printable Reports',
      desc: 'Toggle weekly trends, macro ratios, or water logs. Click the Report button to generate high-resolution PDF or CSV nutrition reports 100% locally.',
      position: 'top'
    }
  ];

  function startTour() {
    // Hide onboarding wizard drawer if open
    const onboardingModal = document.getElementById('onboarding-modal');
    if (onboardingModal) onboardingModal.classList.add('hidden');

    // Only allow tour on the dashboard page
    const pageHash = window.location.hash.replace('#', '');
    if (pageHash !== 'dashboard') {
      window.location.hash = 'dashboard';
      // Wait for page transition to complete
      setTimeout(() => startTour(), 500);
      return;
    }

    tourIndex = 0;
    const overlay = document.getElementById('tour-spotlight-overlay');
    const container = document.getElementById('tour-tooltip-container');

    if (!overlay || !container) return;

    overlay.classList.remove('hidden');
    container.classList.remove('hidden');
    document.body.classList.add('tour-active');

    // Listen for resize and scroll to adjust spotlight mask dynamically
    window.addEventListener('resize', repositionSpotlight);
    window.addEventListener('scroll', repositionSpotlight);

    showTourStep(0);
  }

  function showTourStep(index) {
    if (index < 0 || index >= tourSteps.length) return;
    tourIndex = index;

    const step = tourSteps[index];
    const targetEl = document.querySelector(step.selector);

    if (!targetEl) {
      // If target element is not on screen yet (e.g. dynamic layout load delay), retry shortly
      setTimeout(() => {
        const retryEl = document.querySelector(step.selector);
        if (retryEl) renderStep(retryEl, step);
        else skipTour(); // Fail-safe fallback
      }, 150);
      return;
    }

    renderStep(targetEl, step);
  }

  function renderStep(targetEl, step) {
    activeTourElement = targetEl;

    // 1. Smoothly scroll target element into viewport center
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait slightly for scroll to finalize before drawing spotlight highlight bounds
    setTimeout(() => {
      repositionSpotlight();

      // 2. Fill Tooltip textual contents
      document.getElementById('tour-step-title').textContent = step.title;
      document.getElementById('tour-step-desc').textContent = step.desc;
      document.getElementById('tour-step-counter').textContent = `Step ${tourIndex + 1} of ${tourSteps.length}`;
      document.getElementById('tour-progress-fill').style.width = `${((tourIndex + 1) / tourSteps.length) * 100}%`;

      // 3. Update buttons visibility
      const backBtn = document.getElementById('btn-tour-back');
      if (backBtn) backBtn.classList.toggle('hidden', tourIndex === 0);

      const nextBtn = document.getElementById('btn-tour-next');
      const finishBtn = document.getElementById('btn-tour-finish');
      if (nextBtn && finishBtn) {
        if (tourIndex === tourSteps.length - 1) {
          nextBtn.classList.add('hidden');
          finishBtn.classList.remove('hidden');
        } else {
          nextBtn.classList.remove('hidden');
          finishBtn.classList.add('hidden');
        }
      }

      // 4. Calculate floating tooltip placement next to targeted element
      positionTooltip(targetEl, step.position);
    }, 350);
  }

  function repositionSpotlight() {
    const overlay = document.getElementById('tour-spotlight-overlay');
    if (!overlay || !activeTourElement || overlay.classList.contains('hidden')) return;

    const rect = activeTourElement.getBoundingClientRect();
    const padding = 8; // Extra breathing room outline around spotlight target

    // SVG polygon clip path: builds a darkened overlay backdrop screen
    // with a sharp, cut-out rectangle spotlight over the active targeted bounds
    const top = rect.top - padding;
    const left = rect.left - padding;
    const bottom = rect.bottom + padding;
    const right = rect.right + padding;

    overlay.style.clipPath = `polygon(
      0% 0%, 0% 100%, 
      ${left}px 100%, 
      ${left}px ${top}px, 
      ${right}px ${top}px, 
      ${right}px ${bottom}px, 
      ${left}px ${bottom}px, 
      ${left}px 100%, 
      100% 100%, 100% 0%
    )`;
  }

  function positionTooltip(targetEl, placement) {
    const container = document.getElementById('tour-tooltip-container');
    const arrow = container.querySelector('.tour-tooltip-arrow');
    if (!container || !arrow) return;

    const targetRect = targetEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let tooltipLeft = 0;
    let tooltipTop = 0;
    const offset = 16; // Margins between tooltip bubble and element

    // Reset arrow classes
    arrow.className = 'tour-tooltip-arrow';

    // 1. Calculate ideal position based on preferred bounds placement
    if (placement === 'bottom') {
      tooltipLeft = targetRect.left + (targetRect.width - containerRect.width) / 2;
      tooltipTop = targetRect.bottom + offset;
      arrow.classList.add('arrow-top');
    } else if (placement === 'top') {
      tooltipLeft = targetRect.left + (targetRect.width - containerRect.width) / 2;
      tooltipTop = targetRect.top - containerRect.height - offset;
      arrow.classList.add('arrow-bottom');
    } else if (placement === 'left') {
      tooltipLeft = targetRect.left - containerRect.width - offset;
      tooltipTop = targetRect.top + (targetRect.height - containerRect.height) / 2;
      arrow.classList.add('arrow-right');
    } else if (placement === 'right') {
      tooltipLeft = targetRect.right + offset;
      tooltipTop = targetRect.top + (targetRect.height - containerRect.height) / 2;
      arrow.classList.add('arrow-left');
    }

    // 2. Dynamic viewport boundaries collision checks (prevent off-screen clipping)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal bounds check
    if (tooltipLeft < 12) {
      tooltipLeft = 12; // Snap to left margin
    } else if (tooltipLeft + containerRect.width > viewportWidth - 12) {
      tooltipLeft = viewportWidth - containerRect.width - 12; // Snap to right margin
    }

    // Vertical bounds check (if placement is top/bottom but overflows screen, flip it)
    if (placement === 'top' && tooltipTop < 12) {
      tooltipTop = targetRect.bottom + offset; // Flip to bottom
      arrow.classList.remove('arrow-bottom');
      arrow.classList.add('arrow-top');
    } else if (placement === 'bottom' && tooltipTop + containerRect.height > viewportHeight - 12) {
      tooltipTop = targetRect.top - containerRect.height - offset; // Flip to top
      arrow.classList.remove('arrow-top');
      arrow.classList.add('arrow-bottom');
    }

    // Apply inline style coordinates
    container.style.left = `${tooltipLeft + scrollX}px`;
    container.style.top = `${tooltipTop + scrollY}px`;

    // Position arrow perfectly centered relative to the target element
    const arrowRect = arrow.getBoundingClientRect();
    if (placement === 'top' || placement === 'bottom') {
      const relativeCenter = (targetRect.left + targetRect.width / 2) - tooltipLeft;
      arrow.style.left = `${Math.max(12, Math.min(containerRect.width - 24, relativeCenter))}px`;
      arrow.style.top = '';
    } else {
      const relativeCenter = (targetRect.top + targetRect.height / 2) - tooltipTop;
      arrow.style.top = `${Math.max(12, Math.min(containerRect.height - 24, relativeCenter))}px`;
      arrow.style.left = '';
    }
  }

  function nextStep() {
    if (tourIndex < tourSteps.length - 1) {
      showTourStep(tourIndex + 1);
    }
  }

  function prevStep() {
    if (tourIndex > 0) {
      showTourStep(tourIndex - 1);
    }
  }

  function skipTour() {
    closeTour();
    Toast.show('You can restart the tour anytime by clicking the ❓ icon!', 'info');
  }

  function finishTour() {
    closeTour();
    localStorage.setItem('nutriplan_tour_completed', 'true');
    Toast.show('Onboarding completed! Welcome to NutriPlan Lite 🎉', 'success');
  }

  function closeTour() {
    const overlay = document.getElementById('tour-spotlight-overlay');
    const container = document.getElementById('tour-tooltip-container');

    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.clipPath = '';
    }
    if (container) {
      container.classList.add('hidden');
    }

    document.body.classList.remove('tour-active');
    activeTourElement = null;

    window.removeEventListener('resize', repositionSpotlight);
    window.removeEventListener('scroll', repositionSpotlight);
  }

  // ── Global Event Wiring & Delegation ───────────────────────────

  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;

    // Document level clicks event delegation
    document.addEventListener('click', e => {
      // A. Profile Setup Wizard Button Actions
      if (e.target.closest('#btn-onboarding-next')) {
        nextWizardStep();
      } else if (e.target.closest('#btn-onboarding-back')) {
        prevWizardStep();
      }

      // B. Walkthrough Spotlight Tour Button Actions
      if (e.target.closest('#btn-tour-next')) {
        nextStep();
      } else if (e.target.closest('#btn-tour-back')) {
        prevStep();
      } else if (e.target.closest('#btn-tour-skip') || e.target.closest('#btn-tour-close')) {
        skipTour();
      } else if (e.target.closest('#btn-tour-finish')) {
        finishTour();
      }

      // C. Replay Tour Actions
      if (e.target.closest('#btn-replay-tour') || e.target.closest('#mobile-btn-replay-tour')) {
        e.preventDefault();
        
        // Close mobile nav drawer if open
        const mobileDrawer = document.getElementById('mobile-menu-drawer');
        if (mobileDrawer) {
          mobileDrawer.classList.add('hidden');
          document.body.style.overflow = '';
        }

        startTour();
      }
    });

    // Auto-trigger setup flows for first time users
    setTimeout(() => {
      const isSetup = window.Storage ? window.Storage.getProfile().isSetup : false;
      if (!isSetup) {
        showWizard();
      } else {
        const tourDone = localStorage.getItem('nutriplan_tour_completed') === 'true';
        if (!tourDone) {
          startTour();
        }
      }
    }, 1200); // Breathe space after first page boot animations
  }

  // ── Public APIs ──────────────────────────────────────────────────
  return {
    init,
    showWizard,
    startTour,
    nextWizardStep,
    prevWizardStep
  };
})();
