import { ldJson } from "@/lib/seo";

/** Structured data for search engines and AI tools (schema.org JSON-LD). */
export default function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
