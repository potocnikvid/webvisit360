import type * as THREE_NS from "three";
import type { DotLook } from "@/lib/dots";

/**
 * Every place's dot drawn by the GPU in a single draw call, instead of one HTML element per
 * place repositioned on every frame. Each dot is drawn like the HTML pin's CSS: a core, a
 * dark outline ring and a blurred glow (box-shadow), in CSS pixels whatever the zoom.
 */
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;
  attribute float aRing;
  attribute vec4 aRingColor;
  attribute vec2 aGlow; // blur, spread
  attribute vec4 aGlowColor;
  attribute float aDelay;
  uniform float uPixelRatio;
  // The opening wave (see Globe's revealPins): ms since it started; < 0 before it.
  uniform float uReveal;
  varying float vAlpha;
  varying float vExtent;
  varying float vSize;
  varying vec4 vColor;
  varying float vRing;
  varying vec4 vRingColor;
  varying vec2 vGlow;
  varying vec4 vGlowColor;
  void main() {
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    // Hidden (an HTML pin stands in) or on the far side of the globe.
    // Each dot pops in after its own delay, like the pins' CSS pin-pop (an overshooting
    // scale, cubic-bezier(.34, 1.7, .5, 1) over .55 s, and opacity in by 60%).
    float k = uReveal < 0.0 ? 0.0 : clamp((uReveal - aDelay) / 550.0, 0.0, 1.0);
    float b = k - 1.0;
    float pop = 1.0 + 3.0 * b * b * b + 2.0 * b * b;
    vAlpha = clamp(k / 0.6, 0.0, 1.0);
    if (aSize <= 0.0 || k <= 0.0 || dot(wp, cameraPosition - wp) <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vSize = aSize;
    vExtent = aSize * 0.5 + max(aRing, aGlow.y + aGlow.x * 0.8) + 1.0;
    vColor = aColor;
    vRing = aRing;
    vRingColor = aRingColor;
    vGlow = aGlow;
    vGlowColor = aGlowColor;
    gl_PointSize = 2.0 * vExtent * uPixelRatio * max(pop, 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vExtent;
  varying float vSize;
  varying vec4 vColor;
  varying float vRing;
  varying vec4 vRingColor;
  varying vec2 vGlow;
  varying vec4 vGlowColor;
  vec4 over(vec4 s, vec4 d) {
    float a = s.a + d.a * (1.0 - s.a);
    return a <= 0.0 ? vec4(0.0) : vec4((s.rgb * s.a + d.rgb * d.a * (1.0 - s.a)) / a, a);
  }
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0 * vExtent; // CSS px from the centre
    float r = vSize * 0.5;
    // box-shadow: 0 0 blur spread — a disc of radius E = r + spread blurred with sigma = blur / 2.
    // These discs are small next to the blur, so the result is close to a Gaussian whose
    // peak is the share of the blur the disc covers: 1 - exp(-E² / 2σ²).
    float E = r + vGlow.y;
    float s2 = max(vGlow.x * vGlow.x * 0.25, 0.0001);
    float peak = 1.0 - exp(-E * E / (2.0 * s2));
    float glow = peak * exp(-d * d / (2.0 * (s2 + E * E * 0.5)));
    vec4 c = vec4(vGlowColor.rgb, vGlowColor.a * glow);
    // box-shadow: 0 0 0 ring — the dark outline.
    c = over(vec4(vRingColor.rgb, vRingColor.a * (1.0 - smoothstep(r + vRing - 0.5, r + vRing + 0.5, d))), c);
    c = over(vec4(vColor.rgb, vColor.a * (1.0 - smoothstep(r - 0.6, r + 0.6, d))), c);
    c.a *= uOpacity * vAlpha;
    if (c.a < 0.004) discard;
    gl_FragColor = c;
  }
`;

export type Dots = {
  object: THREE_NS.Points;
  /** Positions in scene coordinates, one per place. */
  setPositions: (xyz: Float32Array) => void;
  /** The look of place i; null hides its dot (an HTML pin is shown instead). */
  setLook: (i: number, look: DotLook | null) => void;
  /** Send changed looks to the GPU. */
  commit: () => void;
  setOpacity: (o: number) => void;
  /** When place i pops in during the opening wave (ms after it starts). */
  setDelay: (i: number, ms: number) => void;
  /** Time into the opening wave (ms); negative hides every dot, Infinity shows them all. */
  setReveal: (ms: number) => void;
  setPixelRatio: (r: number) => void;
};

export function createDots(THREE: typeof THREE_NS): Dots {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 }, uOpacity: { value: 1 }, uReveal: { value: 1e9 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  object.renderOrder = 10; // over the tiles and borders, like the pins were
  let attrs: Record<string, THREE_NS.BufferAttribute> = {};

  const setPositions = (xyz: Float32Array) => {
    const n = xyz.length / 3;
    attrs = {
      aSize: new THREE.BufferAttribute(new Float32Array(n), 1),
      aColor: new THREE.BufferAttribute(new Float32Array(n * 4), 4),
      aRing: new THREE.BufferAttribute(new Float32Array(n), 1),
      aRingColor: new THREE.BufferAttribute(new Float32Array(n * 4), 4),
      aGlow: new THREE.BufferAttribute(new Float32Array(n * 2), 2),
      aGlowColor: new THREE.BufferAttribute(new Float32Array(n * 4), 4),
      aDelay: new THREE.BufferAttribute(new Float32Array(n), 1),
    };
    for (const a of Object.values(attrs)) a.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", new THREE.BufferAttribute(xyz, 3));
    for (const [k, a] of Object.entries(attrs)) geometry.setAttribute(k, a);
  };

  const setLook = (i: number, look: DotLook | null) => {
    (attrs.aSize.array as Float32Array)[i] = look ? look.size : 0;
    if (!look) return;
    (attrs.aColor.array as Float32Array).set(look.color, i * 4);
    (attrs.aRing.array as Float32Array)[i] = look.ring;
    (attrs.aRingColor.array as Float32Array).set(look.ringColor, i * 4);
    (attrs.aGlow.array as Float32Array).set([look.blur, look.spread], i * 2);
    (attrs.aGlowColor.array as Float32Array).set(look.glowColor, i * 4);
  };

  const commit = () => {
    for (const a of Object.values(attrs)) a.needsUpdate = true;
  };

  return {
    object,
    setPositions,
    setLook,
    commit,
    setOpacity: (o) => (material.uniforms.uOpacity.value = o),
    setDelay: (i, ms) => ((attrs.aDelay.array as Float32Array)[i] = ms),
    setReveal: (ms) => (material.uniforms.uReveal.value = Number.isFinite(ms) ? ms : 1e9),
    setPixelRatio: (r) => (material.uniforms.uPixelRatio.value = r),
  };
}
