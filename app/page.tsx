import { pageMeta } from "@/lib/seo";
import Experience from "@/components/Experience";

export const metadata = {
  ...pageMeta({
    title: "360° virtualni sprehodi",
    description: "360° virtualni sprehodi za občine, hotele, vinarje in trgovine po vsej Sloveniji. Sprehodite se, preden pridete.",
    path: "/",
  }),
  // The home page keeps the plain brand title (no template).
  title: { absolute: "Webvisit360 · 360° virtualni sprehodi" },
};

export default function Page() {
  return <Experience />;
}
