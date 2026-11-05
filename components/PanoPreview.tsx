"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";
import type { Copy } from "@/lib/i18n";

type Props = {
  /** Equirectangular image(s), lowest resolution first; each one replaces the previous when loaded. */
  src: string | string[];
  alt: string;
  /** Full-screen tour mode: no idle auto-pan, wider zoom range, no drag hint. */
  full?: boolean;
  copy: Copy;
};

type Viewer = {
  THREE: typeof THREE_NS;
  renderer: THREE_NS.WebGLRenderer;
  mat: THREE_NS.MeshBasicMaterial;
  loader: THREE_NS.TextureLoader;
};

/** Draggable, zoomable 360° viewer for equirectangular images. */
export default function PanoPreview({ src, alt, full = false, copy: t }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const srcs = Array.isArray(src) ? src : [src];
  const key = srcs.join("|");

  // ---- scene, camera and controls (once) ------------------------------------
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const el = host.current;
      if (disposed || !el) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(full ? 75 : 80, el.clientWidth / el.clientHeight, 0.1, 100);
      const geom = new THREE.SphereGeometry(10, 96, 64);
      geom.scale(-1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      scene.add(new THREE.Mesh(geom, mat));
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");

      // Look around: yaw/pitch in degrees. Preview starts slightly down (drone shots).
      let lon = 0;
      let lat = full ? 0 : -12;
      let fov = camera.fov;
      const minFov = full ? 25 : 50;
      const maxFov = full ? 100 : 90;
      let lastInteract = 0;
      const pointers = new Map<number, { x: number; y: number }>();
      let pinchDist = 0;

      const setFov = (f: number) => {
        fov = Math.max(minFov, Math.min(maxFov, f));
        camera.fov = fov;
        camera.updateProjectionMatrix();
      };
      const onDown = (e: PointerEvent) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        el.setPointerCapture(e.pointerId);
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        }
      };
      const onMove = (e: PointerEvent) => {
        const prev = pointers.get(e.pointerId);
        if (!prev) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        lastInteract = performance.now();
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDist) setFov(fov * (pinchDist / d));
          pinchDist = d;
          return;
        }
        // Drag speed scales with zoom so it feels the same at any fov.
        const k = (0.18 * fov) / 80;
        lon -= (e.clientX - prev.x) * k;
        lat += (e.clientY - prev.y) * k;
        lat = Math.max(-85, Math.min(85, lat));
      };
      const onUp = (e: PointerEvent) => {
        pointers.delete(e.pointerId);
        pinchDist = 0;
        lastInteract = performance.now();
      };
      const onWheel = (e: WheelEvent) => {
        if (!full) return; // keep page/globe scrolling in the small preview
        e.preventDefault();
        setFov(fov * Math.exp(e.deltaY * 0.001));
        lastInteract = performance.now();
      };
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      el.addEventListener("wheel", onWheel, { passive: false });

      const ro = new ResizeObserver(() => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
      });
      ro.observe(el);

      let raf = 0;
      let prevT = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(64, now - prevT);
        prevT = now;
        if (!full && !reduced && pointers.size === 0 && now - lastInteract > 2500) lon += dt * 0.006;
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      viewer.current = { THREE, renderer, mat, loader };
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.removeEventListener("wheel", onWheel);
        mat.map?.dispose();
        mat.dispose();
        geom.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        viewer.current = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [full]);

  // ---- load image(s): progressively replace the texture ------------------------
  useEffect(() => {
    const v = viewer.current;
    if (!ready || !v) return;
    let cancelled = false;
    let shown = false;
    let shownIdx = -1;
    setState("loading");
    srcs.forEach((url, i) => {
      v.loader.load(
        url,
        (tex) => {
          // Ignore stale loads, and a lower-res image that arrives after a sharper one.
          if (cancelled || (shown && i < shownIdx)) return tex.dispose();
          tex.colorSpace = v.THREE.SRGBColorSpace;
          tex.anisotropy = v.renderer.capabilities.getMaxAnisotropy();
          const old = v.mat.map;
          v.mat.map = tex;
          v.mat.color.set(0xffffff);
          v.mat.needsUpdate = true;
          old?.dispose();
          shown = true;
          shownIdx = i;
          setState("ready");
        },
        undefined,
        () => {
          if (!cancelled && !shown && i === srcs.length - 1) setState("error");
        },
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  return (
    <div
      className={`pano ${full ? "pano--full" : ""}`}
      ref={host}
      role="img"
      aria-label={`360° ${full ? t.viewer.tour : t.viewer.preview}: ${alt}`}
      data-state={state}
    >
      {state === "loading" && <span className="pano__hint">{t.viewer.loadingPano}</span>}
      {state === "error" && (
        // WebGL texture failed (network/CORS): show the panorama as a flat image instead.
        <img className="panel__cover" src={srcs[0]} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
      )}
      {state === "ready" && !full && <span className="pano__drag">{t.viewer.drag}</span>}
    </div>
  );
}
