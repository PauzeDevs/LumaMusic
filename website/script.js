(() => {
  "use strict";

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const header = document.getElementById("topnav");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("nav-links");

  const closeMenu = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    nav.classList.remove("is-open");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
    }, { passive: true });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = document.querySelectorAll(".reveal, .feature-row");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });

    revealTargets.forEach((element, index) => {
      element.style.transitionDelay = (index % 3) * 55 + "ms";
      observer.observe(element);
    });
  }

  const tourImage = document.getElementById("tour-image");
  const tourCount = document.getElementById("tour-count");
  const tourTabs = Array.from(document.querySelectorAll(".tour-tab"));
  const tourFrame = document.querySelector(".tour-image-wrap");

  if (tourImage && tourTabs.length) {
    tourTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        if (tab.classList.contains("is-active")) return;

        tourTabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });

        if (tourFrame) tourFrame.classList.add("is-changing");

        const nextImage = new Image();
        nextImage.onload = () => {
          tourImage.src = tab.dataset.image;
          tourImage.alt = tab.dataset.alt || "LumaMusic app screen";
          if (tourCount) tourCount.textContent = String(index + 1).padStart(2, "0") + " / " + String(tourTabs.length).padStart(2, "0");
          requestAnimationFrame(() => {
            if (tourFrame) tourFrame.classList.remove("is-changing");
          });
        };
        nextImage.onerror = () => {
          if (tourFrame) tourFrame.classList.remove("is-changing");
          const activeTab = tourTabs.find((item) => item.classList.contains("is-active"));
          if (activeTab) {
            activeTab.classList.remove("is-active");
            activeTab.setAttribute("aria-selected", "false");
          }
          tourTabs[0].classList.add("is-active");
          tourTabs[0].setAttribute("aria-selected", "true");
        };
        nextImage.src = tab.dataset.image;
      });
    });
  }

  if (header) {
    const updateHeader = () => header.classList.toggle("solid", window.scrollY > 20);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const visual = document.querySelector(".hero-visual");
    const player = document.querySelector(".device-player");
    const stats = document.querySelector(".device-stats");

    if (visual && player && stats) {
      let frame = 0;

      visual.addEventListener("pointermove", (event) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const bounds = visual.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;
          player.style.setProperty("--pointer-x", (x * 5).toFixed(2) + "deg");
          player.style.setProperty("--pointer-y", (y * -4).toFixed(2) + "deg");
          stats.style.setProperty("--pointer-x", (x * -3).toFixed(2) + "deg");
        });
      });

      visual.addEventListener("pointerleave", () => {
        player.style.removeProperty("--pointer-x");
        player.style.removeProperty("--pointer-y");
        stats.style.removeProperty("--pointer-x");
      });
    }
  }
})();
