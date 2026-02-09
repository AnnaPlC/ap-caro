/* ---------------- Secció Glyphs Set  ---------------- */

(() => {
  const grid = document.getElementById('glyphGrid');
  const desktopPreview = document.getElementById('previewGlyphDesktop');
  const floating = document.getElementById('previewFloating');
  const floatingGlyph = document.getElementById('previewGlyphFloating');

  const DEFAULT_GLYPH = 'a';
  const ALT_DUPLICATES = new Set(['a','g','k','t','y']);

  /**
   * Glyph list based on the provided mockups.
   * (Duplicates are kept where they appear in the layout.)
   */
  const glyphs = [
    'a','b','c','d','e',
    'f','g','h','i','j',
    'k','l','m','n','o',
    'p','q','r','s','t',
    'u','v','w','x','y',
    'z','A','B','C','D','E',
    'F','G','H','I','J','K',
    'L','M','N','O','P','Q',
    'R','S','T','U','V','W',
    'X','Y','Z','á','à','ä',
    'ã','æ','ç','é','è','ê',
    'ë','í','ì','î','ï','ñ',
    'ó','ò','ô','ö','õ','ø',
    'œ','ú','ù','û','ü','ÿ',
    'fi','fl','ff','Á','Ä','Æ',
    'Ç','É','È','Ë','Í','Ì',
    'Î','Ï','Ñ','Ó','Ò','Ô',
    'Ö','Ø','Œ','Ú','Ù','Û',
    'Ü','Ÿ','0','1','2','3',
    '4','5','6','7','8','9',
    '&','!','¡','?','¿','.',
    '·',',',':',';','…','‹',
    '›','«','»','‘','’','“',
    '”','/','\\','|','†','*',
    '–','—','#','+','−','×',
    '÷','=','<','>','°','€',
    '$','(',')','[',']','{',
    '}','@','≈'
  ];

  function isDesktop() {
    return window.matchMedia('(min-width: 1200px)').matches;
  }

  function setPreviewGlyph(char, isAlt = false) {
    const value = char ?? DEFAULT_GLYPH;
    if (desktopPreview) {
      desktopPreview.textContent = value;
      desktopPreview.classList.toggle('is-alt', !!isAlt);
    }
    if (floatingGlyph) {
      floatingGlyph.textContent = value;
      floatingGlyph.classList.toggle('is-alt', !!isAlt);
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Cache floating preview dimensions to avoid repeated layout reads
  let floatingW = 0;
  let floatingH = 0;
  function measureFloating() {
    if (!floating) return;
    const rect = floating.getBoundingClientRect();
    floatingW = rect.width;
    floatingH = rect.height;
  }

  function positionFloating(x, y) {
    // Keep the preview inside the viewport with a small margin.
    const margin = 16;
    const w = floatingW || floating.getBoundingClientRect().width;
    const h = floatingH || floating.getBoundingClientRect().height;

    const cx = clamp(x, margin + w / 2, window.innerWidth - margin - w / 2);
    const cy = clamp(y, margin + h / 2, window.innerHeight - margin - h / 2);

    // Left/top are used with translate(-50%, -50%) to center the preview
    floating.style.left = `${cx}px`;
    floating.style.top = `${cy}px`;
  }

  let hideTimer = null;
  function showFloating(x, y) {
    if (!floating) return;
    floating.classList.add('is-visible');
    floating.setAttribute('aria-hidden', 'false');
    // Measure once when showing to avoid repeated reads during pointermove
    measureFloating();
    positionFloating(x, y);
    if (hideTimer) window.clearTimeout(hideTimer);
    // Auto-hide on touch devices after a moment (similar feel to tooltip previews).
    hideTimer = window.setTimeout(() => {
      // Only auto-hide on non-desktop.
      if (!isDesktop()) hideFloating();
    }, 1400);
  }

  function hideFloating() {
    if (!floating) return;
    floating.classList.remove('is-visible');
    floating.setAttribute('aria-hidden', 'true');
  }

  // Build grid
  const frag = document.createDocumentFragment();
  const seenCounts = new Map();
  glyphs.forEach((g) => {
    const count = (seenCounts.get(g) || 0) + 1;
    seenCounts.set(g, count);
    const isAlt = ALT_DUPLICATES.has(g) && count === 2;

    const btn = document.createElement('button');
    btn.className = isAlt ? 'glyph glyph--alt' : 'glyph';
    btn.type = 'button';
    btn.textContent = g;
    btn.setAttribute('aria-label', `Glyph ${g}`);
    btn.dataset.glyph = g;
    if (isAlt) btn.dataset.alt = '1';
    frag.appendChild(btn);
  });
  grid.appendChild(frag);

  // Desktop hover behavior
  grid.addEventListener('pointerover', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const glyph = t.dataset.glyph;
    if (!glyph) return;

    if (isDesktop()) {
      setPreviewGlyph(glyph, t.dataset.alt === '1');
    }
  });

  // Tablet/mobile click-to-show + follow pointer
  grid.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const glyph = t.dataset.glyph;
    if (!glyph) return;

    if (!isDesktop()) {
      setPreviewGlyph(glyph, t.dataset.alt === '1');
      showFloating(e.clientX, e.clientY);
    }
  });

  // Follow cursor/finger while moving (tablet/mobile) — throttled via rAF
  let rafPending = false;
  let lastX = 0, lastY = 0;
  window.addEventListener('pointermove', (e) => {
    if (!floating || !floating.classList.contains('is-visible')) return;
    if (isDesktop()) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        positionFloating(lastX, lastY);
      });
    }
  }, { passive: true });

  // Hide on scroll / resize / escape / outside tap
  window.addEventListener('scroll', () => { if (!isDesktop()) hideFloating(); }, { passive: true });
  window.addEventListener('resize', () => { hideFloating(); setPreviewGlyph(DEFAULT_GLYPH); measureFloating(); }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideFloating();
  });

  window.addEventListener('pointerdown', (e) => {
    if (isDesktop()) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    // If click/tap outside a glyph, hide.
    if (!target.closest('.glyphs__grid')) hideFloating();
  });

  // Keyboard accessibility: update preview when focusing glyphs
  grid.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const glyph = t.dataset.glyph;
    if (!glyph) return;
    // Update preview on focus for keyboard users (desktop + non-desktop)
    setPreviewGlyph(glyph, t.dataset.alt === '1');
  });

  // Keyboard activation (Enter/Space): update preview explicitly
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const glyph = t.dataset.glyph;
    if (!glyph) return;
    setPreviewGlyph(glyph, t.dataset.alt === '1');
  });

  // Default glyph
  setPreviewGlyph(DEFAULT_GLYPH, false);
})();

// Sentence Columns — Click to grow text and switch 3↔2 columns responsively
(function(){
  const container = document.querySelector('.sentence_columns');
  if (!container) return;
  const para = container.querySelector('.sentence_paragraph');
  if (!para) return;

  // Font size cycle (px)
  const MIN = 18;
  const MAX = 28;
  const STEP = 2;
  let size = MIN;

  function computeColumns(width, currentSize){
    // Base responsive: narrow screens reduce columns
    if (width < 640) return 1;
    if (width < 960) return 2;
    // On wider screens, click-growth toggles 3↔2 around a threshold
    return currentSize > 22 ? 2 : 3;
  }

  function apply(){
    para.style.setProperty('--columns-font-size', `${size}px`);
    const cols = computeColumns(container.clientWidth, size);
    para.style.columnCount = cols;
  }

  // Initial apply
  apply();

  // Click to grow font size (cycles)
  para.addEventListener('click', () => {
    size += STEP;
    if (size > MAX) size = MIN;
    apply();
  });

  // Recompute on resize
  window.addEventListener('resize', apply, { passive: true });
})();

// Poster section capture — capture full poster section (keeps top/bottom margins)
(function(){
  const poster = document.querySelector('.poster');
  const btn = document.querySelector('.poster_capture');
  const posterActions = document.querySelector('.poster_actions');
  const greetingsCard = document.querySelector('.poster_figure_greetings');
  if (!poster || !btn) return;

  function ensureHtml2Canvas(){
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.async = true;
      s.onload = () => resolve(window.html2canvas);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function capturePoster(){
    try {
      await ensureHtml2Canvas();
      // Ensure anything potentially outside is visible during capture
      const prevOverflow = poster.style.overflow;
      poster.style.overflow = 'visible';

      // Hide the button so it doesn't appear, but keep layout
      const prevVis = posterActions ? posterActions.style.visibility : null;
      if (posterActions) posterActions.style.visibility = 'hidden';

      // Expand poster height temporarily to include the greetings card if moved down
      const prevMinHeight = poster.style.minHeight;
      const prect = poster.getBoundingClientRect();
      if (greetingsCard) {
        const grect = greetingsCard.getBoundingClientRect();
        const neededHeight = Math.max(prect.height, Math.ceil(grect.bottom - prect.top + 20));
        if (neededHeight > prect.height) poster.style.minHeight = `${neededHeight}px`;
      }

      // Determine a proper background color (fallback to body)
      const bgPoster = getComputedStyle(poster).backgroundColor;
      const bgBody = getComputedStyle(document.body).backgroundColor;
      const backgroundColor = (bgPoster && bgPoster !== 'rgba(0, 0, 0, 0)' && bgPoster !== 'transparent') ? bgPoster : bgBody;

      const canvas = await window.html2canvas(poster, {
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        backgroundColor,
        logging: false,
        windowWidth: poster.scrollWidth,
        windowHeight: poster.scrollHeight
      });

      // Restore states
      poster.style.overflow = prevOverflow;
      poster.style.minHeight = prevMinHeight;
      if (posterActions && prevVis !== null) posterActions.style.visibility = prevVis;
      const link = document.createElement('a');
      link.download = 'poster-capture.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e){
      console.error('Capture failed', e);
    }
  }

  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); capturePoster(); });
})();



/* ---------------- Secció LIGATURES ---------------- */



(() => {
  const section = document.querySelector('.ligatures');
  if (!section) return;

  const wrappers = Array.from(section.querySelectorAll('.flight-wrapper'));
  if (!wrappers.length) return;

  let started = false;

  // Target card positions relative to the SVG box (percentages 0..1)
  const CARD_POS = {
    'flight-1': { x: 0.87, y: 0.36, rot: -12 }, // fl (dark), near upper-right of word
    'flight-2': { x: 0.15, y: 0.65, rot: -6 },  // fi (light), lower-left
    'flight-3': { x: 0.82, y: 0.90, rot: -12 }, // ff (dark), bottom-right
  };

  function positionCard(wrapper){
    const svg = wrapper.querySelector('.flight-svg');
    const card = wrapper.querySelector('.ligature-card');
    if (!svg || !card) return;

    const id = wrapper.id;
    const cfg = CARD_POS[id];
    if (!cfg) return;

    const rect = svg.getBoundingClientRect();
    const wrect = wrapper.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const targetLeft = (rect.left - wrect.left) + rect.width * cfg.x - cardRect.width / 2;
    const targetTop  = (rect.top - wrect.top)  + rect.height * cfg.y - cardRect.height / 2;

    card.style.left = `${Math.round(targetLeft)}px`;
    card.style.top  = `${Math.round(targetTop)}px`;
    card.style.transform = `rotate(${cfg.rot}deg)`;
  }

  function positionAll(){
    wrappers.forEach(positionCard);
  }

  const startSequence = () => {
    if (started) return;
    started = true;
    // Position cards and reveal them with a small stagger so the cascade feels intentional
    positionAll();
    wrappers.forEach((el, i) => {
      setTimeout(() => {
        // Use the CSS class that triggers the SVG frame animations
        el.classList.add('run');
      }, i * 300 + 200);
    });
  };

  // Trigger when section enters viewport
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startSequence();
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  io.observe(section);

  // Reposition on resize so cards stay attached to their SVGs across responsive
  window.addEventListener('resize', () => {
    if (!started) return;
    positionAll();
  }, { passive: true });

  // Hover-to-show video interleaved via foreignObject for all flight wrappers
  function wireHoverVideo(wrapper){
    const card = wrapper.querySelector('.ligature-card');
    const fo = wrapper.querySelector('.flight-fo');
    const video = wrapper.querySelector('.flight-fo .fo-video');
    if (!card || !fo || !video) return;

    const computeEnable = () => {
      const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const wideEnough = window.matchMedia('(min-width: 900px)').matches;
      return hasHover && wideEnough;
    };

    // Set sources programmatically to avoid mixing HTML in foreignObject
    if (!video.querySelector('source')){
      const s1 = document.createElement('source');
      s1.src = './assets/img/flight.mp4';
      s1.type = 'video/mp4';
      const s2 = document.createElement('source');
      s2.src = './assets/img/flight.mov';
      s2.type = 'video/quicktime';
      video.appendChild(s1);
      video.appendChild(s2);
    }

    const showVideo = () => {
      if (!computeEnable()) return;
      fo.style.opacity = '0.7';
      const tryPlay = () => {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      };
      if (video.readyState < 2) {
        video.load();
        video.addEventListener('loadeddata', tryPlay, { once: true });
      } else {
        tryPlay();
      }
    };
    const hideVideo = () => {
      fo.style.opacity = '0';
      video.pause();
    };

    card.addEventListener('mouseenter', showVideo);
    card.addEventListener('mouseleave', hideVideo);
    card.setAttribute('tabindex', '0');
    card.addEventListener('focus', showVideo);
    card.addEventListener('blur', hideVideo);

    // If resized to mobile, ensure video stays hidden
    window.addEventListener('resize', () => {
      if (!computeEnable()) hideVideo();
    }, { passive: true });
  }

  wrappers.forEach(wireHoverVideo);
})();




/* ---------------- Secció tester ---------------- */

/* ==========================================================================
   Caro — Type Tester (JS)
   - Auto-grow textarea (height increases with content)
   - Font size + tracking sliders (live)
   - Pangram randomiser (10 options)
   - Responsive: on tablet/mobile, click the font name to open/close sliders
   ========================================================================== */

const tester = document.getElementById("tester");
const textEl = document.getElementById("text");
const sizeEl = document.getElementById("size");
const trackingEl = document.getElementById("tracking");
const pangramBtns = [
  document.getElementById("pangramBtnDesktop"),
  document.getElementById("pangramBtnTop")
].filter(Boolean);
const fontToggle = document.getElementById("fontToggle");
const alignBtns = Array.from(document.querySelectorAll(".iconbtn[data-align]"));

const PANGRAMS = [
  "Quiet frozen winds mix bold icy glyphs at zero flux.",
  "Cold breeze shapes mixed glyphs with quiet frozen joy.",
  "Six frozen waves quickly mix calm typographic glyphs.",
  "Bold icy shapes flex quietly under frozen wind.",
  "Quick frozen breeze moves calm glyphs with icy depth.",
  "Frozen silence quietly mixes bold, calm typographic waves.",
  "Cold light shapes flexible glyphs with quiet frozen rhythm.",
  "Icy calm winds quickly flex bold typographic shapes.",
  "Quiet icy glyphs flex under cold winds.",
  "Frozen calm shapes mix bold icy glyphs."
];

function setCSSVar(name, value){
  document.documentElement.style.setProperty(name, value);
}

function autoGrow(el){
  // Reset first so shrinking works too
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function setFontSize(px){
  setCSSVar("--font-size", `${px}px`);
  autoGrow(textEl);
}

function setTracking(em){
  setCSSVar("--tracking", `${em}em`);
  autoGrow(textEl);
}

function pickRandomPangram(){
  const current = textEl.value.trim();
  // Avoid returning the same one if possible
  const candidates = PANGRAMS.filter(p => p !== current);
  const arr = candidates.length ? candidates : PANGRAMS;
  return arr[Math.floor(Math.random() * arr.length)];
}

function setAlignment(align){
  textEl.style.textAlign = align;

  alignBtns.forEach(btn => {
    const active = btn.dataset.align === align;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function isSmallLayout(){
  return window.matchMedia("(max-width: 1024px)").matches;
}

function closePanel(){
  tester.dataset.panelOpen = "false";
  fontToggle.setAttribute("aria-expanded", "false");
}

function togglePanel(){
  const open = tester.dataset.panelOpen === "true";
  tester.dataset.panelOpen = open ? "false" : "true";
  fontToggle.setAttribute("aria-expanded", open ? "false" : "true");
}

/* ---------------------------
   Event bindings
---------------------------- */
textEl.addEventListener("input", () => autoGrow(textEl));

sizeEl.addEventListener("input", (e) => {
  setFontSize(Number(e.target.value));
});

trackingEl.addEventListener("input", (e) => {
  // Keep as a number (in em)
  setTracking(Number(e.target.value));
});

pangramBtns.forEach(btn => {
  btn.addEventListener("click", (e) => {
    // Clicking the pangram icon/button should only change the pangram
    // and NOT activate the text cursor in the textarea.
    textEl.value = pickRandomPangram();
    autoGrow(textEl);
    // Intentionally do not focus the textarea or move the caret here.
    // The caret should only appear when the user clicks the textarea itself.
  });
});

alignBtns.forEach(btn => {
  btn.addEventListener("click", () => setAlignment(btn.dataset.align));
});

/* On tablet/mobile: clicking the font name opens slider panel */
fontToggle.addEventListener("click", () => {
  if (!isSmallLayout()) return; // panel is always visible on desktop
  togglePanel();
});

/* Close panel when clicking outside (small layouts only) */
document.addEventListener("click", (e) => {
  if (!isSmallLayout()) return;
  if (tester.dataset.panelOpen !== "true") return;

  const clickedInside = e.target.closest(".controls");
  if (!clickedInside) closePanel();
});

/* If we resize to desktop, ensure panel state doesn't hide controls */
window.addEventListener("resize", () => {
  if (!isSmallLayout()){
    tester.dataset.panelOpen = "false";
    fontToggle.setAttribute("aria-expanded", "false");
  }
  autoGrow(textEl);
});

/* ---------------------------
   Initial state
---------------------------- */
(function init(){
  // Set defaults (also matches the initial input values)
  // On mobile screens, start with a smaller size to reduce scroll length
  const isMobile = window.matchMedia("(max-width: 520px)").matches;
  let initialSize = Number(sizeEl.value);
  if (isMobile) {
    // Cap the initial size on mobile; keep within slider bounds
    initialSize = Math.min(initialSize, 55);
    sizeEl.value = String(initialSize);
  }
  setFontSize(initialSize);
  setTracking(Number(trackingEl.value));

  // Default align: desktop left, tablet centered (via CSS)
  setAlignment("left");

  // Grow once at start
  autoGrow(textEl);
})();




/* ---------------- Secció Coordenades ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector(".coords-section");
  if (!section) return;

  const activate = () => {
    // Skip activating internal animations while overlay stage is running
    if (section.classList.contains('overlay-stage')) return;
    if (!section.classList.contains("is-visible")) {
      section.classList.add("is-visible");
    }
  };

  // Activem quan la secció entra al viewport (desktop + mòbil)
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activate();
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(section);
  } else {
    // Fallback molt simple: activem després d'un petit delay
    setTimeout(activate, 800);
  }

  // Extra opcional: primer mouseenter també l'activa (desktop)
  section.addEventListener(
    "mouseenter",
    () => {
      activate();
    },
    { once: true }
  );
});



// Circle Animation (Alternates): trigger when entering section; after it ends,
// reset after 1s so it can trigger again on next re-entry.
const alternates = document.querySelector('.alternates');
const circle = document.querySelector('.circle');

if (alternates && circle) {
  let inside = false;         // whether the section is currently in view
  let canTrigger = true;      // arm to trigger on next entry
  let isAnimating = false;    // avoid double-starts
  let resetInProgress = false; // prevent duplicate resets

  const startAnimation = () => {
    if (isAnimating) return;
    isAnimating = true;
    circle.classList.add('triggered');
  };

  const scheduleReset = (evt) => {
    // Only schedule a reset when finishing the scale-out (triggered state)
    if (resetInProgress) return;
    if (!circle.classList.contains('triggered')) return;
    resetInProgress = true;
    // After the animation completes, wait 1s, then remove the trigger class so
    // the circle "reappears" in its initial state. Only re-arm if we're not in view,
    // so it won’t immediately retrigger while the user is still in the section.
    setTimeout(() => {
      // Step 1: set a hidden, centered base (no transition)
      circle.classList.add('circle--resetBase');
      // Remove the triggered end-state
      circle.classList.remove('triggered');
      // Force reflow to apply the base state immediately
      void circle.offsetWidth;
      // Step 2: smoothly reveal to the default state
      circle.classList.add('circle--reveal');

      const cleanupReveal = () => {
        circle.classList.remove('circle--reveal');
        circle.removeEventListener('transitionend', cleanupReveal);
      };
      circle.addEventListener('transitionend', cleanupReveal);

      // After we kick off the reveal, remove the base class so future animations work normally
      setTimeout(() => {
        circle.classList.remove('circle--resetBase');
      }, 0);
      isAnimating = false;
      // Arm for the next entry regardless; IntersectionObserver will only fire
      // when we actually re-enter, so it won't auto-trigger while still inside.
      canTrigger = true;
      resetInProgress = false;
    }, 1000);
  };

  // Support CSS animations (primary). If implemented via transitions, also listen for transitionend.
  circle.addEventListener('animationend', scheduleReset);
  circle.addEventListener('transitionend', scheduleReset);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target !== alternates) return;
      inside = entry.isIntersecting;

      if (entry.isIntersecting) {
        if (canTrigger) {
          canTrigger = false;
          startAnimation();
        }
      } else {
        // If we leave the section and the animation has already reset, arm for next entry
        if (!isAnimating) canTrigger = true;
      }
    });
  }, { threshold: 0.6 });

  io.observe(alternates);
}


/* Theme toggle and drag-drop functionality */
// Drag and Drop Implementation
document.addEventListener('DOMContentLoaded', () => {
  // Always start from top on refresh so the intro sequence feels first-visit
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  } catch (e) { /* ignore */ }
  // Loading overlay: fade out after the icon animation completes
  const overlay = document.getElementById('loadingOverlay');
  if (overlay){
    // Apply initial zoom state to mimic external site's "zoom-start" preloader
    overlay.classList.add('zoom-start');
    document.body.classList.add('has-loader');
    // Prepare: ensure nav/hero are hidden until hero reveal
    document.body.classList.add('pre-hero');
    const icon = overlay.querySelector('.loading-icon');
    const startCoordsFlow = () => {
      // After loader, show coords as overlay above hero, hold, then smooth-scroll to hero
      try {
        const coords = document.getElementById('coords');
        const hero = document.querySelector('.hero');
        if (!coords || !hero) {
          // If missing, just proceed to show hero/nav
          document.body.classList.remove('pre-hero');
          return;
        }

  // Lock viewport, show coords as overlay
        document.body.classList.add('has-overlay');
        coords.classList.add('overlay-stage');
  // Entry fade driven by CSS classes: overlay-stage (opacity 0) -> is-active (opacity 1)
  const ENTRY_MS = 1000; // full-section fade duration
  void coords.offsetWidth; // ensure transition applies
  // Trigger is-active on next frame to start the CSS transition from 0 -> 1
  requestAnimationFrame(() => { coords.classList.add('is-active'); });
  const HOLD_MS = 100; // hold before scroll

        // Trigger earlier video appearance independent of full content reveal
        const VIDEO_START_MS = 260;
        setTimeout(() => {
          coords.classList.add('is-video-visible');
        }, VIDEO_START_MS);

        // Full content reveal (lines/text) occurs after the section fade completes
        setTimeout(() => {
          coords.classList.add('is-visible');
        }, ENTRY_MS);

        setTimeout(() => {
          // Start visible journey: reveal hero/nav/paragraph beneath and keep overlay above
          document.body.classList.remove('pre-hero');
          coords.classList.add('is-exiting');
          // Disable CSS transition; we'll drive transform/opacity/blur manually for perfect sync
          coords.style.transition = 'none';
          coords.style.willChange = 'transform, opacity, backdrop-filter';
          // Solid background similar to Editor’s Note; reveal comes from sliding up
          coords.style.background = getComputedStyle(document.documentElement).getPropertyValue('--gray-color') || '#e4e4e4';

          const from = window.pageYOffset;
          // Compute exact hero top and adjust for fixed nav height so the hero frames perfectly in the viewport
          const heroTop = hero.getBoundingClientRect().top + window.pageYOffset;
          const navEl = document.querySelector('.nav');
          const navHeight = navEl ? navEl.getBoundingClientRect().height : 0;
          const to = Math.max(0, heroTop - navHeight);
          const DURATION_MS = 800; // slightly longer for clearer journey
          const start = performance.now();
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          if (reduceMotion) {
            window.scrollTo(0, to);
            coords.classList.remove('overlay-stage', 'is-active', 'is-exiting');
            coords.style.display = 'none';
            document.body.classList.remove('has-overlay');
            return;
          }

          // Ease in-out cubic for natural movement
          const ease = t => t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;

          function step(now){
            const raw = (now - start) / DURATION_MS;
            const p = raw > 1 ? 1 : raw < 0 ? 0 : raw;
            const e = ease(p);
            const y = from + (to - from) * e;
            window.scrollTo(0, y);

            // Slide overlay upward like "Editor’s Note" and fade towards the end
            const slideYvh = -100 * e; // translateY from 0 to -100vh
            coords.style.transform = `translateY(${slideYvh}vh)`;

            // Fade/blur in the tail end for polish
            const tail = p < 0.6 ? 1 : 1 - ease((p - 0.6) / 0.4); // hold longer, then ease-out
            const opacity = tail;
            const blur = Math.round(8 * tail);
            coords.style.opacity = String(opacity);
            coords.style.backdropFilter = `blur(${blur}px)`;
            coords.style.webkitBackdropFilter = `blur(${blur}px)`;

            if (p < 1) {
              requestAnimationFrame(step);
            } else {
              // Cleanup: remove overlay and hide coords (one-time per load)
              coords.classList.remove('overlay-stage', 'is-active', 'is-exiting', 'is-visible', 'is-video-visible');
              coords.style.display = 'none';
              document.body.classList.remove('has-overlay');
            }
          }

          requestAnimationFrame(step);
        }, ENTRY_MS + HOLD_MS);
      } catch (e) {
        // On any error, ensure hero/nav are visible so the page remains usable
        document.body.classList.remove('pre-hero');
      }
    };

    const cleanup = () => {
      overlay.classList.add('is-hidden');
      document.body.classList.remove('has-loader');
      // Remove from DOM after transition, then start coords flow
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        startCoordsFlow();
      }, 420);
    };
    if (icon){
      icon.addEventListener('animationend', cleanup, { once: true });
    } else {
      // Fallback timeout: 300ms initial delay + 2000ms cycle
      setTimeout(cleanup, 2300);
    }
  }
  const draggableElements = document.querySelectorAll('.poster_figure, .poster_figure_two, .poster_figure_greetings, #textSetToggle, #textSetToggleColumns');

    draggableElements.forEach(element => {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // Get initial transform and position
    const style = window.getComputedStyle(element);
    const transform = new DOMMatrix(style.transform);
    xOffset = transform.m41;
    yOffset = transform.m42;
    
  // Store original rotation using the computed transform matrix (more reliable than parsing strings)
  const matrixForRotation = new DOMMatrix(style.transform);
  const originalRotation = Math.atan2(matrixForRotation.b, matrixForRotation.a) * (180 / Math.PI);

    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events
    element.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === element) {
            isDragging = true;
            element.style.zIndex = "1000"; // Bring to front while dragging
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, element);
        }
    }

    function dragEnd() {
        if (isDragging) {
            isDragging = false;
            element.style.zIndex = "1"; // Reset z-index
        }
    }

    function setTranslate(xPos, yPos, el) {
        requestAnimationFrame(() => {
            // Preserve the original rotation while adding translation
            const rotation = originalRotation ? `rotate(${originalRotation}deg)` : '';
            el.style.transform = `translate(${xPos}px, ${yPos}px) ${rotation}`;
        });
    }
    });
});

// Theme toggle functionality
(function () {
  'use strict';

  const THEME_KEY = 'theme';
  const TOGGLE_SELECTOR = '.logo_link-toggle';
  const LIGHT = 'light';
  const DARK = 'dark';

  function applyTheme(theme) {
    // We use data-theme="dark" to enable dark-mode variable overrides in CSS.
    if (theme === DARK) document.documentElement.setAttribute('data-theme', DARK);
    else document.documentElement.removeAttribute('data-theme');
  }

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function storeTheme(theme) {
    try {
      if (theme) localStorage.setItem(THEME_KEY, theme);
      else localStorage.removeItem(THEME_KEY);
    } catch (e) { /* ignore */ }
  }

  function detectPreferred() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return LIGHT;
    return DARK;
  }

  function toggleTheme() {
    // Determine current theme from the DOM attribute only
    const current = (document.documentElement.getAttribute('data-theme') === DARK ? DARK : LIGHT);
    const next = current === LIGHT ? DARK : LIGHT;
    applyTheme(next);
    storeTheme(next);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Force LIGHT theme on every load regardless of previous choice
    applyTheme(LIGHT);
    // Clear persisted theme so refresh always starts in LIGHT
    storeTheme(null);

    const toggle = document.querySelector(TOGGLE_SELECTOR);
    if (toggle) {
      toggle.addEventListener('click', function (ev) {
        ev.preventDefault();
        toggleTheme();
      });
    }
  });
})();

// Text Set Toggle — wrap/unwrap glyph 'a' using span.alt-a and CSS font-feature-settings
(function(){
  const btn = document.getElementById('textSetToggle');
  let isAlt = false;

  if (!btn) {
    console.warn('textSetToggle not found — toggle disabled');
    return;
  }

  btn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    const para = document.querySelector('.sentence_paragraph');
    if (!para) return;

    if (!isAlt) {
      wrapLetterNodes(para, 'a');
      btn.style.backgroundImage = "url('./assets/2_text_set2.svg')";
      isAlt = true;
    } else {
      unwrapAlt(para);
      btn.style.backgroundImage = "url('./assets/1_text_set1.svg')";
      isAlt = false;
    }
  });

  function wrapLetterNodes(root, letter) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      if (!node.nodeValue || node.nodeValue.indexOf(letter) === -1) return;
      // split preserving the letter tokens
      const parts = node.nodeValue.split(new RegExp('(' + letter + ')', 'g'));
      const frag = document.createDocumentFragment();
      parts.forEach(p => {
        if (p === letter) {
          const span = document.createElement('span');
          span.className = 'alt-a';
          span.textContent = p;
          frag.appendChild(span);
        } else if (p.length) {
          frag.appendChild(document.createTextNode(p));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function unwrapAlt(root) {
    const spans = root.querySelectorAll('span.alt-a');
    spans.forEach(s => {
      s.replaceWith(document.createTextNode(s.textContent));
    });
  }
})();

// Text Set Toggle (columns) — wrap/unwrap glyph 'g' using span.alt-g for the 3-column text
(function(){
  const btn = document.getElementById('textSetToggleColumns');
  let isAlt = false;

  if (!btn) return;

  // Ensure initial position and rotation match the design from the start
  (function placeInitial(){
    const cont = btn.closest('.sentence_columns');
    if (!cont) return;
    const para = cont.querySelector('.sentence_paragraph');
    if (!para) return;
    const w = btn.offsetWidth || 320;
    const h = btn.offsetHeight || 346;
    // Compute the gutter center between column 1 and 2
    const contRect = cont.getBoundingClientRect();
    const paraRect = para.getBoundingClientRect();
    const style = window.getComputedStyle(para);
    const gap = parseFloat(style.columnGap) || 0;
    const cols = parseInt(style.columnCount, 10) || 3;
    const paraWidth = paraRect.width;
    const colWidth = (paraWidth - gap * (cols - 1)) / cols;
    const paraOffsetLeft = paraRect.left - contRect.left;
    const gutterCenterX = paraOffsetLeft + colWidth + gap / 2;
    const x = gutterCenterX - (w / 2);
    // Slightly below the vertical center of the paragraph area
    const paraOffsetTop = paraRect.top - contRect.top;
    const y = paraOffsetTop + (paraRect.height * 0.48) - (h / 2);
    btn.style.left = `${Math.round(x)}px`;
    btn.style.top = `${Math.round(y)}px`;
  })();

  // Re-center on resize to preserve the designed placement
  window.addEventListener('resize', () => {
    const cont = btn.closest('.sentence_columns');
    if (!cont) return;
    const para = cont.querySelector('.sentence_paragraph');
    if (!para) return;
    const w = btn.offsetWidth || 320;
    const h = btn.offsetHeight || 346;
    const contRect = cont.getBoundingClientRect();
    const paraRect = para.getBoundingClientRect();
    const style = window.getComputedStyle(para);
    const gap = parseFloat(style.columnGap) || 0;
    const cols = parseInt(style.columnCount, 10) || 3;
    const paraWidth = paraRect.width;
    const colWidth = (paraWidth - gap * (cols - 1)) / cols;
    const paraOffsetLeft = paraRect.left - contRect.left;
    const gutterCenterX = paraOffsetLeft + colWidth + gap / 2;
    const x = gutterCenterX - (w / 2);
    const paraOffsetTop = paraRect.top - contRect.top;
    const y = paraOffsetTop + (paraRect.height * 0.48) - (h / 2);
    btn.style.left = `${Math.round(x)}px`;
    btn.style.top = `${Math.round(y)}px`;
  }, { passive: true });
  btn.style.backgroundImage = "url('./assets/1_text_set_3.svg')";

  btn.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    const root = document.querySelector('.sentence_columns .sentence_paragraph');
    if (!root) return;

    if (!isAlt) {
      wrapLetterNodes(root, 'g');
      btn.style.backgroundImage = "url('./assets/1_text_set_4.svg')";
      isAlt = true;
    } else {
      unwrapAlt(root);
      btn.style.backgroundImage = "url('./assets/1_text_set_3.svg')";
      isAlt = false;
    }
  });

  function wrapLetterNodes(root, letter) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      if (!node.nodeValue || node.nodeValue.indexOf(letter) === -1) return;
      const parts = node.nodeValue.split(new RegExp('(' + letter + ')', 'g'));
      const frag = document.createDocumentFragment();
      parts.forEach(p => {
        if (p === letter) {
          const span = document.createElement('span');
          span.className = 'alt-g';
          span.textContent = p;
          frag.appendChild(span);
        } else if (p.length) {
          frag.appendChild(document.createTextNode(p));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function unwrapAlt(root) {
    const spans = root.querySelectorAll('span.alt-g');
    spans.forEach(s => {
      s.replaceWith(document.createTextNode(s.textContent));
    });
  }
})();



/* ---------------- Article video inline autoplay (iOS-safe) ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const articleVideos = Array.from(document.querySelectorAll('.section_article .article video, .article video'));
  if (!articleVideos.length) return;

  function prepare(v){
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.preload = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'metadata' : 'auto';
  }

  function tryPlay(v){
    if (!v) return;
    prepare(v);
    const playAttempt = v.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {/* ignore */});
    }
  }

  // Autoplay when ready
  articleVideos.forEach(v => {
    v.addEventListener('canplay', () => tryPlay(v), { once: true });
    v.addEventListener('loadeddata', () => tryPlay(v), { once: true });
  });

  // Fallback: first user gesture triggers play
  const triggerAll = () => {
    articleVideos.forEach(v => tryPlay(v));
  };
  window.addEventListener('pointerdown', triggerAll, { once: true });
  window.addEventListener('touchstart', triggerAll, { once: true, passive: true });
  window.addEventListener('keydown', triggerAll, { once: true });
});




/* ---------------- Mobile-only: auto alternate in Main sentences ---------------- */
(function(){
  // Only run on mobile (match your tablet breakpoint: < 521px)
  const mq = window.matchMedia('(max-width: 520px)');
  let aTimer = null;
  let gTimer = null;

  function start(){
    stop();
    if (!mq.matches) return;
    // Sentence container: alternate 'a' via its toggle button
    const aBtn = document.getElementById('textSetToggle');
    if (aBtn) {
      // Start from normal, then flip every 2s
      aTimer = window.setInterval(() => {
        aBtn.click();
      }, 2000);
    }
    // Sentence columns: alternate 'g' via its toggle button
    const gBtn = document.getElementById('textSetToggleColumns');
    if (gBtn) {
      gTimer = window.setInterval(() => {
        gBtn.click();
      }, 2200);
    }
  }

  function stop(){
    if (aTimer){ window.clearInterval(aTimer); aTimer = null; }
    if (gTimer){ window.clearInterval(gTimer); gTimer = null; }
  }

  // React to viewport changes
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', start);
  } else {
    // Safari < 14
    mq.addListener(start);
  }

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // Initial
  start();
})();



