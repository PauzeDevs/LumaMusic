(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = window.matchMedia("(min-width: 981px)");
  const topnav = document.getElementById("topnav");
  const nav = topnav?.querySelector(".nav");
  const toggle = topnav?.querySelector(".nav-toggle");
  const navLinks = document.getElementById("nav-links");

  const closeMenu = () => {
    if (!nav || !toggle) return;
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  };

  if (nav && toggle && navLinks) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) closeMenu();
    }, { passive: true });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const ease = (value) => 1 - Math.pow(1 - value, 3);
  const rounded = (value) => Math.round(value * 100) / 100;

  function setStyle(element, property, value) {
    if (!element) return;
    const cache = element._lumaStyleCache || (element._lumaStyleCache = {});
    if (cache[property] === value) return;
    cache[property] = value;
    element.style[property] = value;
  }

  function cssNumber(element, property, fallback) {
    const value = parseFloat(getComputedStyle(element).getPropertyValue(property));
    return Number.isFinite(value) ? value : fallback;
  }

  const stack = document.querySelector(".stack");
  const scenes = stack ? Array.from(stack.children) : [];
  const rail = document.querySelector(".rail");
  const track = rail?.querySelector(".rail-track");
  const cards = track ? Array.from(track.children) : [];
  const hero = document.querySelector(".hero");
  const railIndex = scenes.indexOf(rail);
  let railTravel = 0;
  let railHeight = 0;
  let cardCenters = [];
  let frameQueued = false;

  const parts = scenes.map((element) => {
    const isScene = element.classList.contains("scene");
    let shade = null;
    if (isScene) {
      shade = document.createElement("div");
      shade.className = "shade";
      shade.setAttribute("aria-hidden", "true");
      element.appendChild(shade);
    }
    return {
      element,
      body: element.querySelector(".scene-body"),
      shade,
      words: element.querySelector(".words, .rail-head"),
      flip: element.classList.contains("flip"),
      isRail: element === rail,
      slots: Array.from(element.querySelectorAll(".scene-phone")).map((slot) => ({
        element: slot,
        rise: 240,
        lift: 55,
        turn: 5
      })),
      ghost: element.querySelector(".ghost"),
      orbit: element.querySelector(".hero-orbit"),
      copy: element.querySelector(".hero-copy"),
      devices: element.querySelector(".hero-devices"),
      cue: element.querySelector(".scroll-cue")
    };
  });

  function measure() {
    parts.forEach((part) => {
      part.slots.forEach((slot) => {
        slot.rise = cssNumber(slot.element, "--rise", 240);
        slot.lift = cssNumber(slot.element, "--lift", 55);
        slot.turn = cssNumber(slot.element, "--turn", 5);
      });
    });

    if (!rail || !track) return;
    if (!desktop.matches || reduceMotion.matches) {
      rail.style.height = "";
      track.style.transform = "";
      cards.forEach((card) => setStyle(card, "transform", ""));
      railTravel = 0;
      return;
    }

    railTravel = Math.max(0, track.scrollWidth - window.innerWidth);
    railHeight = Math.round(window.innerHeight * 1.35 + railTravel);
    rail.style.height = railHeight + "px";
    cardCenters = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
  }

  function pose(part, progress, covered) {
    const leaving = 1 - progress;
    setStyle(part.body, "transform", covered ? "scale(" + rounded(1 - covered * .055) + ")" : "");
    if (part.shade) setStyle(part.shade, "opacity", covered ? String(rounded(covered * .58)) : "0");

    if (part.words) {
      const horizontal = part.isRail || !desktop.matches;
      const offset = horizontal ? "translate3d(0," + rounded(leaving * (part.isRail ? 70 : 42)) + "px,0)" :
        "translate3d(" + rounded(leaving * (part.flip ? 85 : -85)) + "px,0,0)";
      setStyle(part.words, "transform", leaving ? offset : "");
      setStyle(part.words, "opacity", leaving ? String(rounded(progress)) : "");
    }

    part.slots.forEach((slot) => {
      const y = leaving * slot.rise - covered * slot.lift;
      const transform = (y || leaving) ?
        "translate3d(0," + rounded(y) + "px,0) rotate(" + rounded(leaving * slot.turn) + "deg)" : "";
      setStyle(slot.element, "transform", transform);
    });

    if (part.ghost) setStyle(part.ghost, "transform", covered ? "translate3d(" + rounded(covered * -13) + "%,0,0)" : "");
    if (part.orbit) setStyle(part.orbit, "transform", covered ? "rotate(" + rounded(covered * 75) + "deg)" : "");
    if (part.copy) {
      setStyle(part.copy, "transform", covered ? "translate3d(0," + rounded(covered * -65) + "px,0)" : "");
      setStyle(part.copy, "opacity", covered ? String(rounded(clamp(1 - covered * 1.35))) : "");
    }
    if (part.devices) setStyle(part.devices, "transform", covered ? "translate3d(0," + rounded(covered * -48) + "px,0) scale(" + rounded(1 + covered * .035) + ")" : "");
    if (part.cue) setStyle(part.cue, "opacity", covered ? String(rounded(clamp(1 - covered * 4))) : "");
  }

  function renderFrame() {
    frameQueued = false;
    if (!topnav) return;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const tops = scenes.map((element) => element.getBoundingClientRect().top);

    parts.forEach((part, index) => {
      const nextTop = tops[index + 1];
      const isCovered = nextTop !== undefined && part.element.classList.contains("scene");
      const progress = ease(clamp((viewportHeight - tops[index]) / (viewportHeight * .62)));
      const covered = isCovered ? clamp(1 - nextTop / viewportHeight) : 0;
      pose(part, progress, covered);
    });

    if (hero) hero.classList.toggle("resting", tops[1] !== undefined && tops[1] <= 0);

    if (railTravel && rail && track && railHeight > viewportHeight) {
      const x = clamp(-tops[railIndex] / (railHeight - viewportHeight)) * railTravel;
      track.style.transform = "translate3d(" + (-x).toFixed(1) + "px,0,0)";
      cards.forEach((card, index) => {
        const distance = Math.min(1, Math.abs(cardCenters[index] - x - viewportWidth / 2) / viewportWidth * 1.55);
        setStyle(card, "transform", "scale(" + rounded(1 - distance * .055) + ")");
        const phone = card.querySelector(".card-phone");
        setStyle(phone, "transform", "translate(-50%,calc(38% + " + rounded(distance * 42) + "px)) rotate(" + rounded(distance * 3.5) + "deg)");
      });
    }
    topnav.classList.toggle("solid", window.scrollY > 24);
  }

  function queueFrame() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(renderFrame);
  }

  function setupScrollMotion() {
    if (reduceMotion.matches) {
      if (topnav) topnav.classList.toggle("solid", window.scrollY > 24);
      return;
    }
    measure();
    renderFrame();
    window.addEventListener("scroll", queueFrame, { passive: true });
    window.addEventListener("resize", () => {
      measure();
      queueFrame();
    }, { passive: true });
    window.addEventListener("load", () => {
      measure();
      queueFrame();
    }, { once: true });
    desktop.addEventListener("change", () => {
      measure();
      queueFrame();
    });
    reduceMotion.addEventListener?.("change", () => {
      measure();
      queueFrame();
    });
  }
  setupScrollMotion();

  const revealElements = document.querySelectorAll(".reveal");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("in"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      });
    }, { threshold: .16 });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const tourImage = document.getElementById("tour-image");
  const tourCount = document.getElementById("tour-count");
  const tourPhone = document.querySelector(".tour-phone");
  const tourTabs = Array.from(document.querySelectorAll(".tour-tab"));

  if (tourImage && tourTabs.length) {
    tourTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        if (tab.classList.contains("is-active")) return;
        tourTabs.forEach((item) => {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });
        tourPhone?.classList.add("changing");

        const image = new Image();
        image.onload = () => {
          tourImage.src = tab.dataset.image;
          tourImage.alt = tab.dataset.alt || "LumaMusic app screenshot";
          if (tourCount) tourCount.textContent = String(index + 1).padStart(2, "0") + " / " + String(tourTabs.length).padStart(2, "0");
          requestAnimationFrame(() => tourPhone?.classList.remove("changing"));
        };
        image.onerror = () => {
          tourPhone?.classList.remove("changing");
          const selected = tourTabs.find((item) => item.classList.contains("is-active"));
          selected?.classList.remove("is-active");
          selected?.setAttribute("aria-selected", "false");
          tourTabs[0].classList.add("is-active");
          tourTabs[0].setAttribute("aria-selected", "true");
        };
        image.src = tab.dataset.image;
      });
    });
  }

  if (!reduceMotion.matches && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    document.querySelectorAll(".scene-phone").forEach((phone) => {
      let pending = false;
      phone.addEventListener("pointermove", (event) => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          const bounds = phone.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - .5;
          const y = (event.clientY - bounds.top) / bounds.height - .5;
          phone.style.setProperty("--tilt-x", (x * 5).toFixed(2) + "deg");
          phone.style.setProperty("--tilt-y", (y * -5).toFixed(2) + "deg");
        });
      });
      phone.addEventListener("pointerleave", () => {
        phone.style.removeProperty("--tilt-x");
        phone.style.removeProperty("--tilt-y");
      });
    });
  }
})();
