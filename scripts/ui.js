const UI = {
  qs(selector, scope = document) {
    return scope.querySelector(selector);
  },

  qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  },

  formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    return Promise.resolve();
  }
};

window.UI = UI;

// Hardware-Accelerated Interactive Custom Cursor Engine for Issue #78
document.addEventListener('DOMContentLoaded', () => {
  const cursorDot = document.getElementById('cursorDot');
  const cursorOutline = document.getElementById('cursorOutline');

  // Failsafe Safeguard: Touch devices (Mobile/Tablets) par natively exit ho jaye
  if (!cursorDot || !cursorOutline || window.matchMedia('(pointer: coarse)').matches) {
    if (cursorDot) cursorDot.style.display = 'none';
    if (cursorOutline) cursorOutline.style.display = 'none';
    return;
  }

  let hasMoved = false;

  // 1. Position Synchronization Engine (Smooth lag-free matrix updates)
  window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;
    
    // will make cursor visible when the mouse first visible in the browser
    if (!hasMoved) {
      cursorDot.classList.add('cursor-active');
      cursorOutline.classList.add('cursor-active');
      hasMoved = true;
    }

    // Performance optimal: translate3d prevents browser layout thrashing
    cursorDot.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`;
    cursorOutline.style.transform = `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -50%)`;
  });

  // 2. WINDOW BOUNDARY TRACKING 
  // when the mouse comes out the browser
  document.addEventListener('mouseleave', () => {
    cursorDot.classList.remove('cursor-active');
    cursorOutline.classList.remove('cursor-active');
    hasMoved = false; // Reset so it fades back in smoothly next time
  });

  // when the mouse comes in the browser
  document.addEventListener('mouseenter', () => {
    cursorDot.classList.add('cursor-active');
    cursorOutline.classList.add('cursor-active');
    hasMoved = true;
  });


  // 3. Interactive Micro-Interactions Strategy
  const targetSelectors = 'a, button, input, select, textarea, .theme-toggler, [role="button"], .interactive-card';
  
  function initializeCursorInteractions() {
    const interactables = document.querySelectorAll(targetSelectors);
    
    interactables.forEach((element) => {
      // Duplicate event listeners prevent 
      if (element.dataset.cursorBound) return;

      element.addEventListener('mouseenter', () => {
        cursorDot.classList.add('hovered');
        cursorOutline.classList.add('hovered');
      });

      element.addEventListener('mouseleave', () => {
        cursorDot.classList.remove('hovered');
        cursorOutline.classList.remove('hovered');
      });

      element.dataset.cursorBound = "true";
    });
  }

  // Initial Boot-up Execution
  initializeCursorInteractions();

  // Dynamic SPA View Updates Selector Strategy:
  window.addEventListener('hashchange', () => {
    setTimeout(initializeCursorInteractions, 150);
  });

  // Safe Mutation Observer Engine: will not crash in dynamic updates
  const observer = new MutationObserver(() => {
    initializeCursorInteractions();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 4. Click Matrix Compress Animation Handle
  window.addEventListener('mousedown', () => {
    cursorOutline.classList.add('clicked');
  });

  window.addEventListener('mouseup', () => {
    cursorOutline.classList.remove('clicked');
  });
});