(() => {
  const frame = UI.qs(".app-frame");
  const openButton = UI.qs("[data-sidebar-toggle]");
  const closeTargets = UI.qsa("[data-sidebar-close]");

  function setSidebar(open) {
    frame.dataset.sidebarOpen = String(open);
  }

  openButton?.addEventListener("click", () => {
    setSidebar(frame.dataset.sidebarOpen !== "true");
  });

  closeTargets.forEach((target) => {
    target.addEventListener("click", () => setSidebar(false));
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setSidebar(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 920) setSidebar(false);
  });
})();
