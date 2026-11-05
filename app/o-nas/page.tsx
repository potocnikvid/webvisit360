import type { Metadata } from "next";
import About from "@/components/About";

export const metadata: Metadata = {
  title: "O nas · Webvisit360",
  description:
    "Webvisit360 od leta 2017 izdeluje 360° virtualne sprehode v 3D in jih kot Google Street View Trusted partner objavlja na Google Zemljevidih. Enkratna naložba, brez naročnin.",
};

export default function Page() {
  return <About />;
}
