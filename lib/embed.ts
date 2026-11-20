import { SITE_URL } from "./seo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** True for tours we host ourselves (*.webvisit360.com), the only ones we offer to embed. */
export const embeddable = (url: string) => {
  try {
    return /(^|\.)webvisit360\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * HTML a client can paste into their own site: the tour in an iframe, with a small credit
 * line under it that links back to the tour's page here (which is what helps webvisit360.com
 * in search: links from municipalities' and companies' own sites).
 */
export function embedCode(tour: { name: string; url: string }, pagePath: string): string {
  const title = esc(`${tour.name} – 360° virtualni sprehod`);
  return [
    `<iframe src="${esc(tour.url)}" title="${title}" width="100%" height="520" style="border:0;border-radius:12px;max-width:100%" allow="fullscreen; gyroscope; accelerometer; xr-spatial-tracking" allowfullscreen loading="lazy"></iframe>`,
    `<p style="margin:6px 0 0;font:13px/1.4 system-ui,sans-serif;color:#666">360° virtualni sprehod: <a href="${esc(SITE_URL + pagePath)}" target="_blank" rel="noopener">Webvisit360</a></p>`,
  ].join("\n");
}
