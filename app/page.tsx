import { headers } from "next/headers";
import { pageMeta } from "@/lib/seo";
import Experience from "@/components/Experience";
import { parseVisitor } from "@/lib/visitor";

export const metadata = {
  ...pageMeta({
    title: "360° virtualni sprehodi",
    description: "360° virtualni sprehodi za občine, hotele, vinarje in trgovine po vsej Sloveniji. Sprehodite se, preden pridete.",
    path: "/",
  }),
  // The home page keeps the plain brand title (no template).
  title: { absolute: "Webvisit360 · 360° virtualni sprehodi" },
};

export default async function Page() {
  const h = await headers();
  const visitor = parseVisitor(
    (name) => h.get(name),
    process.env.NODE_ENV !== "production" ? process.env.DEV_VISITOR : undefined,
  );
  return <Experience visitor={visitor} />;
}
