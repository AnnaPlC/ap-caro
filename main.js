// FOOTER START
const footer = document.getElementById('caro-footer');
const getFont = footer.querySelector('.getfont');

const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    getFont.classList.add('is-visible');
    observer.disconnect();
  }
}, { threshold: 0.3 });

observer.observe(footer);
// FOOTER FINISH




// FLAG START
// Three.js (ES module) via CDN
import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const DPR = Math.min(2, window.devicePixelRatio || 1);

const flagSection = document.querySelector('.flag-section');
const canvas = document.getElementById('flag');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(DPR);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  42,
  flagSection.clientWidth / flagSection.clientHeight,
  0.1,
  100
);
camera.position.set(0, 0, 2.4);
renderer.setSize(flagSection.clientWidth, flagSection.clientHeight, false);

const clock = new THREE.Clock();

// --- Texture (PNG amb fons negre -> fem servir luminància com alpha) ---
const tex = await new THREE.TextureLoader().loadAsync('./assets/flag.png');
tex.colorSpace = THREE.SRGBColorSpace;
tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

// --- Geometry (més segments = deformació més suau) ---
const imgW = 1728;
const imgH = 1117;
const aspect = imgW / imgH;

const flagHeight = 1.20;              // unitats de món (mida lleugerament més gran)               // unitats de món
const flagWidth = flagHeight * aspect;

const segX = 240;
const segY = 160;

const geometry = new THREE.PlaneGeometry(flagWidth, flagHeight, segX, segY);

// Col·loquem l'origen al marge esquerre (com si fos el pal)
geometry.translate(flagWidth * 0.5, 0.01, 0);

// --- Shader (ones + shading suau) ---
const uniforms = {
  uTime: { value: 0 },
  uTex: { value: tex },
  uAmp: { value: 0.14 },
  uFreq: { value: 10.0 },
  uWind: { value: 1.0 },
  uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  uLightDir: { value: new THREE.Vector3(0.2, 0.35, 1.0).normalize() },
  uAlphaThresh: { value: 0.14 },
  uAlphaSoft: { value: 0.18 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  vertexShader: /* glsl */`
    uniform float uTime;
    uniform float uAmp;
    uniform float uFreq;
    uniform float uWind;
    uniform vec2  uMouse;

    varying vec2 vUv;
    varying vec3 vN;

    // remap 0..1 -> -1..1
    float remap(float v){ return v * 2.0 - 1.0; }

    void main() {
      vUv = uv;

      vec3 pos = position;

      // 0 (al pal, a l'esquerra) -> 1 (a l'extrem lliure, a la dreta)
      // (invertim perquè el moviment comenci clarament des de l'esquerra)
      float xN = 1.0 - vUv.x;

      // Vent segons cursor: esquerra/dreta canvia fase + amplitud
      float windDir = remap(uMouse.x);
      float wind = uWind + windDir * 1.4;

      float amp = uAmp * mix(0.15, 1.0, smoothstep(0.05, 1.0, xN));

      // Ones principals (tipus "cloth" simple)
      float t = uTime * (1.0 + wind * 0.35);

      float wave1 = sin((xN * uFreq * 1.8) + t * 2.0) * amp;
      float wave2 = sin((xN * uFreq * 3.2) + t * 3.2 + pos.y * 2.0) * amp * 0.35;

      // Petita ondulació vertical (depend del cursor Y)
      float yInfluence = remap(uMouse.y); // -1..1
      float wave3 = sin((pos.y * 4.0) + t * 2.6) * amp * (0.12 + 0.18 * abs(yInfluence));

      // "Curl" a la punta (efecte bandera)
      float curl = pow(xN, 2.2) * amp * 1.1;

      pos.z += wave1 + wave2 + wave3 + curl;

      // Normal aproximada (derivades a partir de la funció de desplaçament en x)
      float dx = 0.002;
      float xN2 = clamp(xN + dx, 0.0, 1.0);
      float wave1b = sin((xN2 * uFreq * 1.8) + t * 2.0) * (uAmp * mix(0.15, 1.0, smoothstep(0.05, 1.0, xN2)));
      float wave2b = sin((xN2 * uFreq * 3.2) + t * 3.2 + pos.y * 2.0) * (uAmp * mix(0.15, 1.0, smoothstep(0.05, 1.0, xN2))) * 0.35;
      float curlb  = pow(xN2, 2.2) * (uAmp * mix(0.15, 1.0, smoothstep(0.05, 1.0, xN2))) * 1.1;
      float z2 = wave1b + wave2b + wave3 + curlb;
      float dzdx = (z2 - (wave1 + wave2 + wave3 + curl)) / dx;

      vec3 n = normalize(vec3(-dzdx, 0.0, 1.0));
      vN = normalize(normalMatrix * n);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D uTex;
    uniform vec3 uLightDir;
    uniform float uAlphaThresh;
    uniform float uAlphaSoft;

    varying vec2 vUv;
    varying vec3 vN;

    void main() {
      vec4 texel = texture2D(uTex, vUv);

      // Luminància per convertir el fons negre en transparència
      float lum = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      float alpha = smoothstep(uAlphaThresh, uAlphaThresh + uAlphaSoft, lum);

      // shading (subtil) perquè sembli 3D
      float light = clamp(dot(normalize(vN), normalize(uLightDir)), 0.0, 1.0);
      float shade = mix(0.72, 1.10, pow(light, 1.2));

      vec3 color = vec3(1.0) * shade; // blanc
      gl_FragColor = vec4(color, alpha);

      // evita que quedin vores brutes quan alpha és molt baix
      if (gl_FragColor.a < 0.01) discard;
    }
  `
});

const flag = new THREE.Mesh(geometry, material);
flag.position.set(-flagWidth * 0.5, 0.01, 0);
flag.rotation.y = -0.35;
flag.rotation.x = 0.08;
scene.add(flag);

// --- Interacció (cursor -> vent + rotació) ---
const mouse = new THREE.Vector2(0.5, 0.5);
const mouseSmooth = new THREE.Vector2(0.5, 0.5);

function updateMouseFromEvent(e){
  const rect = flagSection.getBoundingClientRect();
  const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
  const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
  if (clientX == null || clientY == null) return;
  const nx = (clientX - rect.left) / rect.width;
  const ny = 1.0 - (clientY - rect.top) / rect.height;
  mouse.x = Math.min(1, Math.max(0, nx));
  mouse.y = Math.min(1, Math.max(0, ny));
}

// Support both Pointer Events and Mouse/Touch Events, scoped to the flag section
flagSection.addEventListener('pointermove', updateMouseFromEvent, { passive: true });
flagSection.addEventListener('mousemove', updateMouseFromEvent, { passive: true });
flagSection.addEventListener('touchmove', updateMouseFromEvent, { passive: true });

// (v3) Eliminem el zoom amb scroll: l'única interacció és el cursor.

function onResize(){
  renderer.setSize(flagSection.clientWidth, flagSection.clientHeight, false);
  camera.aspect = flagSection.clientWidth / flagSection.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

function animate(){
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  mouseSmooth.lerp(mouse, 0.08);
  uniforms.uTime.value = t;
  uniforms.uMouse.value.copy(mouseSmooth);

  // rotació suau segons cursor (efecte "parallax")
  const rx = THREE.MathUtils.lerp(flag.rotation.x, 0.05 + (mouseSmooth.y - 0.5) * 0.18, 0.06);
  const ry = THREE.MathUtils.lerp(flag.rotation.y, -0.35 + (mouseSmooth.x - 0.5) * 0.55, 0.06);
  flag.rotation.x = rx;
  flag.rotation.y = ry;

  renderer.render(scene, camera);
}
animate();

// FLAG FINISH

// -----------------------------------------------
// Nav ink color auto-switch based on background
// -----------------------------------------------
(function(){
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Parse CSS color strings to RGB
  function parseColor(str){
    if (!str) return null;
    str = str.trim();
    // rgb/rgba
    const m = str.match(/^rgba?\(([^)]+)\)/i);
    if (m){
      const parts = m[1].split(',').map(s => s.trim());
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      return { r, g, b, a };
    }
    // hex (#rgb, #rrggbb)
    const hx = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hx){
      let h = hx[1];
      if (h.length === 3){
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        return { r, g, b, a: 1 };
      } else {
        const r = parseInt(h.slice(0,2), 16);
        const g = parseInt(h.slice(2,4), 16);
        const b = parseInt(h.slice(4,6), 16);
        return { r, g, b, a: 1 };
      }
    }
    return null;
  }

  // Relative luminance (WCAG)
  function srgbToLinear(c){
    c /= 255;
    return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  }
  function luminance(rgb){
    const R = srgbToLinear(rgb.r);
    const G = srgbToLinear(rgb.g);
    const B = srgbToLinear(rgb.b);
    return 0.2126*R + 0.7152*G + 0.0722*B;
  }

  // Find the element behind the nav using elementFromPoint.
  function elementBehindNav(){
    const rect = nav.getBoundingClientRect();
    const x = Math.floor(window.innerWidth/2);
    const y = Math.max(1, Math.floor(rect.top + rect.height/2));
    // Temporarily allow hit-testing through the nav
    const prev = nav.style.pointerEvents;
    nav.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y) || document.body;
    nav.style.pointerEvents = prev;
    return el;
  }

  // Walk up ancestors to find a solid background color (non-transparent)
  function findBackgroundInfo(el){
    let node = el;
    while (node && node !== document.documentElement){
      // Manual override via attribute
      const attr = node.getAttribute && node.getAttribute('data-nav-theme');
      if (attr === 'dark' || attr === 'light'){
        return { type: 'attr', value: attr };
      }

      const cs = window.getComputedStyle(node);
      const bgImg = cs.backgroundImage;
      const bgColStr = cs.backgroundColor;
      const col = parseColor(bgColStr);
      if (col && col.a > 0){
        // If there's also a background-image, prefer manual data attribute where possible.
        if (bgImg && bgImg !== 'none'){ // complex background
          // keep walking to see if a parent sets a solid color; else return unknown
        } else {
          return { type: 'color', value: col };
        }
      }
      node = node.parentElement;
    }
    return { type: 'unknown' };
  }

  function updateNavInk(){
    const el = elementBehindNav();
    const info = findBackgroundInfo(el);
    let ink = 'dark'; // default dark ink for light backgrounds
    if (info.type === 'attr'){
      // attr describes the background
      ink = info.value === 'dark' ? 'light' : 'dark';
    } else if (info.type === 'color'){
      const L = luminance(info.value);
      // Threshold around ~0.45 feels good; tweakable.
      ink = L < 0.45 ? 'light' : 'dark';
    } else {
      // unknown (e.g., image). Prefer dark ink unless root theme is dark.
      const isRootDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ink = isRootDark ? 'light' : 'dark';
    }
    if (nav.dataset.color !== ink){
      nav.dataset.color = ink;
    }
  }

  // Throttle updates to animation frame
  let scheduled = false;
  function schedule(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; updateNavInk(); });
  }

  // Init and events
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('DOMContentLoaded', updateNavInk);
  // Also run once at start in case script loads late
  updateNavInk();
})();