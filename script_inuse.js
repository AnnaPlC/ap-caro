// IN USE START

(() => {
  const viewport = document.getElementById('inuseViewport');
  if (!viewport) return;

  const mq = window.matchMedia('(min-width: 1024px)');

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;

  const onPointerDown = (e) => {
    if (!mq.matches) return;
    isDown = true;
    viewport.classList.add('is-dragging');
    startX = e.clientX;
    startScrollLeft = viewport.scrollLeft;
    viewport.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!mq.matches || !isDown) return;
    const dx = e.clientX - startX;
    viewport.scrollLeft = startScrollLeft - dx;
  };

  const endDrag = () => {
    isDown = false;
    viewport.classList.remove('is-dragging');
  };

  //const onWheel = (e) => {
  //  if (!mq.matches) return;
  //  // Convert vertical wheel into horizontal scroll (like many drag carousels)
  //  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
  //    viewport.scrollLeft += e.deltaY;
  //    e.preventDefault();
  //  }
  //};
  const onWheel = (e) => {
    if (!mq.matches) return;
    // Convert vertical wheel into horizontal scroll. Only consume the wheel
    // when we can actually scroll horizontally; otherwise let the page scroll.
    const useY = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
    if (!useY) return; // trackpads that already scroll horizontally, let default

    const max = viewport.scrollWidth - viewport.clientWidth;
    if (max <= 0) return; // nothing to scroll, let page handle it

    const current = viewport.scrollLeft;
    const proposed = current + e.deltaY;
    // Clamp to [0, max]
    const next = Math.max(0, Math.min(max, proposed));

    if (next !== current) {
      viewport.scrollLeft = next;
      // We consumed this wheel event to move horizontally
      e.preventDefault();
    } else {
      // Already at an edge; do NOT prevent default so vertical scroll continues
      // to the next section naturally.
    }
  };

  // Prevent native image drag ghost
  viewport.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', (ev) => ev.preventDefault());
  });

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('wheel', onWheel, { passive: false });
})();



// IN USE FINISH

// -----------------------------------------------
// Baselines: inline SVG and rotate asterisk (desktop/tablet)
// -----------------------------------------------
(function(){
  const picture = document.querySelector('.baselines .baselines_figure');
  if (!picture) return;

  const MOBILE_BREAK = 900;
  const MOBILE_SRC_LIGHT = './assets/lines_section_mobile.svg';
  const MOBILE_SRC_DARK  = './assets/lines_section_mobile_dark.svg';

  // Keep reference to original <img> for mobile restore
  const originalImg = picture.querySelector('img.baselines_image');
  const originalMobileSrc = originalImg ? originalImg.getAttribute('src') : null;
  const originalAlt = originalImg ? originalImg.getAttribute('alt') : 'glyphs baselines';

  let rafId = null;
  let currentSrc = null;

  function pickCurrentSrc(){
    // Find matching <source> by media; first match wins
    const sources = Array.from(picture.querySelectorAll('source'));
    for (const s of sources){
      const media = s.getAttribute('media');
      if (!media || (window.matchMedia && window.matchMedia(media).matches)){
        const srcset = s.getAttribute('srcset');
        if (srcset) return srcset;
      }
    }
    // Fallback to img
    const img = picture.querySelector('img');
    return img ? img.getAttribute('src') : null;
  }

  async function fetchSVG(url){
    const res = await fetch(url, { cache: 'force-cache' });
    const txt = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(txt, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    return svg;
  }

  function findAsteriskPath(svg){
    const paths = Array.from(svg.querySelectorAll('path'));
    // Known prefixes for desktop/tablet assets
    const prefixes = ['M1357.51', 'M1012.08'];
    for (const p of paths){
      const d = p.getAttribute('d') || '';
      if (prefixes.some(pref => d.startsWith(pref))){
        return p;
      }
    }
    return null;
  }

  function animateRotation(target){
    if (!target) return;
    const bbox = target.getBBox();
    const cx = bbox.x + bbox.width/2;
    const cy = bbox.y + bbox.height/2;
    let t0 = performance.now();
    const speed = 48; // deg per second (more visible)

    function frame(now){
      const dt = (now - t0) / 1000;
      const angle = (dt * speed) % 360;
      target.setAttribute('transform', `rotate(${angle} ${cx} ${cy})`);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function cancel(){
    if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
  }

  async function inject(){
    // Guard for mobile: keep picture with img to avoid jump
    if (window.innerWidth < MOBILE_BREAK){
      cancel();
      // Ensure IMG exists (if we previously injected SVG)
      const existingSVG = picture.querySelector('svg.baselines_image');
      if (existingSVG) existingSVG.remove();
      let img = picture.querySelector('img.baselines_image');
      if (!img){
        img = document.createElement('img');
        img.className = 'baselines_image';
        img.alt = originalAlt;
        picture.appendChild(img);
      }
      // Choose mobile asset based on theme: data-theme overrides system preference
      const hasAttr = document.documentElement.hasAttribute('data-theme');
      const isDarkAttr = document.documentElement.getAttribute('data-theme') === 'dark';
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const useDark = hasAttr ? isDarkAttr : prefersDark;

      const desired = useDark ? MOBILE_SRC_DARK : MOBILE_SRC_LIGHT;
      if (img.getAttribute('src') !== desired) img.setAttribute('src', desired);

      currentSrc = null;
      return;
    }

    const wanted = pickCurrentSrc();
    if (!wanted || wanted === currentSrc) return;
    currentSrc = wanted;

    cancel();

    // Remove existing inline SVG if present
    const prev = picture.querySelector('svg.baselines_image');
    if (prev) prev.remove();

    // Ensure no duplicate IMG if we will replace
    const img = picture.querySelector('img.baselines_image');
    if (img) img.remove();

    try {
      const svg = await fetchSVG(wanted);
      if (!svg) return;
      svg.classList.add('baselines_image');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      picture.appendChild(svg);

      const star = findAsteriskPath(svg);
      animateRotation(star);
    } catch (e){
      // On error, restore the image to avoid broken UI
      if (originalMobileSrc){
        const fallback = document.createElement('img');
        fallback.className = 'baselines_image';
        fallback.src = originalMobileSrc;
        fallback.alt = originalAlt;
        picture.appendChild(fallback);
      }
    }
  }

  const onResize = () => {
    // Debounce via rAF
    requestAnimationFrame(inject);
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('DOMContentLoaded', inject);
  inject();

  // Re-inject on theme toggles (data-theme attribute changes)
  const mo = new MutationObserver((muts) => {
    for (const m of muts){
      if (m.type === 'attributes' && m.attributeName === 'data-theme'){
        requestAnimationFrame(inject);
        break;
      }
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Also adapt when system color scheme changes
  if (window.matchMedia){
    const mm = window.matchMedia('(prefers-color-scheme: dark)');
    mm.addEventListener?.('change', () => requestAnimationFrame(inject));
  }
})();