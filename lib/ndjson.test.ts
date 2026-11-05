import { expect, test } from "vitest";
import { readNdjson } from "./ndjson";

test("delivers each event once, in order, across chunk boundaries and without a final newline", async () => {
  const chunks = ['{"a":1}\n{"b"', ':2}\n', '{"c":3}'];
  const body = new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
      c.close();
    },
  });
  const seen: unknown[] = [];
  await readNdjson(new Response(body), (e) => seen.push(e));
  expect(seen).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
});
