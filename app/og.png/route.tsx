import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { totals } from "@/lib/seo";
import { compact, fmt } from "@/lib/types";

/** The link preview (Facebook, WhatsApp, LinkedIn, X, chats): built once, at build time. */
export const dynamic = "force-static";

export async function GET() {
  const file = (p: string) => readFile(path.join(process.cwd(), p));
  const [semibold, regular, logo] = await Promise.all([
    file("public/fonts/BasierSquare-SemiBold.ttf"),
    file("public/fonts/BasierSquare-Regular.ttf"),
    file("public/logo.png"),
  ]);
  const n = totals();
  const stats = [
    [String(n.obcine), "občin"],
    [`${fmt(Math.floor(n.places / 10) * 10)}+`, "podjetij in krajev"],
    [fmt(n.panoramas), "panoram"],
    [compact(n.views), "ogledov"],
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#eef2f8",
          fontFamily: "Basier",
          background:
            "radial-gradient(120% 80% at 75% 120%, rgba(246,169,59,0.28), transparent 60%), radial-gradient(90% 90% at 65% 60%, #2a3f7a 0%, #14244f 40%, #081230 80%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={`data:image/png;base64,${logo.toString("base64")}`} width={72} height={72} style={{ borderRadius: 16 }} />
          <div style={{ display: "flex", fontSize: 40 }}>
            webvisit<span style={{ color: "#f6a93b", fontWeight: 600 }}>360</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2, lineHeight: 1.04 }}>Sprehodite se, preden pridete.</div>
          <div style={{ fontSize: 32, color: "#c9d3ea" }}>360° virtualni sprehodi za občine, hotele, vinarje in trgovine</div>
        </div>
        <div style={{ display: "flex", gap: 56 }}>
          {stats.map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 600, color: "#ffd27a" }}>{v}</div>
              <div style={{ fontSize: 22, color: "#93a3c4" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Basier", data: semibold, weight: 600, style: "normal" },
        { name: "Basier", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
