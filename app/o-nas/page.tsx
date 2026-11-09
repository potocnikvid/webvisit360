import { headers } from "next/headers";
import Experience from "@/components/Experience";
import JsonLd from "@/components/JsonLd";
import { faqLd, pageMeta } from "@/lib/seo";
import { parseVisitor } from "@/lib/visitor";

export const metadata = pageMeta({
  title: "O nas",
  description:
    "Webvisit360 od leta 2017 izdeluje 360° virtualne sprehode v 3D in jih kot Google Street View Trusted partner objavlja na Google Zemljevidih. Enkratna naložba, brez naročnin.",
  path: "/o-nas",
});

/** The globe, opened straight into the About story (the same page the map's "Why 360°?" opens). */
export default async function Page() {
  const h = await headers();
  const visitor = parseVisitor(
    (name) => h.get(name),
    process.env.NODE_ENV !== "production" ? process.env.DEV_VISITOR : undefined,
  );
  return (
    <>
      <JsonLd data={faqLd()} />
      <Experience visitor={visitor} initialStory />
    </>
  );
}
