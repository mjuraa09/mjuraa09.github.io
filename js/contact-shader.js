// Contact page hero: Paper's "Warp" shader, live (shaders.paper.design/warp, the settings below are
// that page's URL parameters). The <picture> under it is frame 0 of the same shader, so the page
// shows it while WebGL starts and the canvas takes over on the same frame, with no jump.
// The picture stays (no animation) under reduced motion, without WebGL2, if the shader fails to
// start or the GPU drops its context later (the canvas is removed), and in the visual tests
// (they set window.__stillShader in tests/fixed-activity.js). Not navigator.webdriver: browsers
// driven by an agent or launched with automation flags report it too, and showed only the still.
// ShaderMount pauses itself while the tab is hidden or the hero is off screen.
// Library: js/vendor/paper-warp.js, a Warp-only bundle of @paper-design/shaders (Apache-2.0).
import {
  ShaderMount, warpFragmentShader, WarpPatterns, ShaderFitOptions,
  getShaderColorFromString, getShaderNoiseTexture,
} from './vendor/paper-warp.js';

const host = document.querySelector('.contact-hero-shader');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches || window.__stillShader;
const gl = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();

if (host && !still && gl) {
  const colors = ['#1d1d1b', '#f49762', '#efb525', '#faf9f5'];
  const noise = getShaderNoiseTexture();
  // Back to the still: drop the canvas so nothing blank or black covers the picture.
  const fallBack = (mount) => {
    try { if (mount) mount.dispose(); } catch (e) { /* already gone */ }
    host.classList.remove('is-live');
    host.replaceChildren();
  };
  const start = () => {
    let mount;
    try {
      mount = new ShaderMount(host, warpFragmentShader, {
        u_colors: colors.map(getShaderColorFromString),
        u_colorsCount: colors.length,
        u_proportion: 0.5,
        u_softness: 1,
        u_distortion: 0.09,
        u_swirl: 0.9,
        u_swirlIterations: 6,
        u_shape: WarpPatterns.checks,
        u_shapeScale: 0.25,
        u_noiseTexture: noise,
        u_fit: ShaderFitOptions.none,
        u_scale: 2.5,
        u_rotation: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_offsetX: 0,
        u_offsetY: 0,
        u_worldWidth: 0,
        u_worldHeight: 0,
      }, undefined, 0.6, 0, 1, 1920 * 1200); // speed 0.6, frame 0; soft colour fields need no 2x canvas
    } catch (e) { fallBack(mount); return; }   // shader did not compile, context refused, ...
    const canvas = host.querySelector('canvas');
    // A shader that fails to compile only logs an error and leaves no program behind.
    if (!canvas || !mount.program) { fallBack(mount); return; }
    // The GPU can drop the context later (driver reset, too many WebGL pages, sleep).
    canvas.addEventListener('webglcontextlost', () => fallBack(mount), { once: true });
    host.classList.add('is-live');
  };
  if (noise.complete) start(); else noise.addEventListener('load', start, { once: true });
}
