import { headers } from "next/headers";
import Experience from "@/components/Experience";
import { parseVisitor } from "@/lib/visitor";

export default async function Page() {
  const h = await headers();
  const visitor = parseVisitor(
    (name) => h.get(name),
    process.env.NODE_ENV !== "production" ? process.env.DEV_VISITOR : undefined,
  );
  return <Experience visitor={visitor} />;
}
