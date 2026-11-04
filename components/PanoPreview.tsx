"use client";

import { useEffect, useRef, useState } from "react";

/** Small draggable 360° viewer for an equirectangular cover image. */
export default function PanoPreview({ src, alt }: { src: string; alt: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    setState("loading");

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
      const camera = new THREE.PerspectiveCamera(80, el.clientWidth / el.clientHeight, 0.1, 100);
      const geom = new THREE.SphereGeometry(10, 64, 40);
      geom.scale(-1, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      scene.add(new THREE.Mesh(geom, mat));

      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(
        src,
        (tex) => {
          if (disposed) return tex.dispose();
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          setState("ready");
        },
        undefined,
        () => !disposed && setState("error"),
      );

      // Look around: yaw/pitch in degrees. Start looking slightly down (drone shots).
      let lon = 0;
      let lat = -12;
      let dragging = false;
      let lastInteract = 0;
      let px = 0;
      let py = 0;
      const onDown = (e: PointerEvent) => {
        dragging = true;
        px = e.clientX;
        py = e.clientY;
        el.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        lon -= (e.clientX - px) * 0.18;
        lat += (e.clientY - py) * 0.18;
        lat = Math.max(-85, Math.min(85, lat));
        px = e.clientX;
        py = e.clientY;
        lastInteract = performance.now();
      };
      const onUp = () => {
        dragging = false;
        lastInteract = performance.now();
      };
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);

      const ro = new ResizeObserver(() => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
      });
      ro.observe(el);

      let raf = 0;
      let prev = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(64, now - prev);
        prev = now;
        if (!reduced && !dragging && now - lastInteract > 2500) lon += dt * 0.006;
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        camera.lookAt(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        );
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        mat.map?.dispose();
        mat.dispose();
        geom.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src]);

  return (
    <div className="pano" ref={host} role="img" aria-label={`360° predogled: ${alt}`} data-state={state}>
      {state === "loading" && <span className="pano__hint">Nalagam panoramo…</span>}
      {state === "error" && <span className="pano__hint">Predogled ni na voljo</span>}
      {state === "ready" && <span className="pano__drag">Povlecite za razgled</span>}
    </div>
  );
}
