import { expect, test } from "vitest";
import { embedCode, embeddable } from "./embed";

test("only our own tours are offered for embedding", () => {
  expect(embeddable("https://solcava.webvisit360.com")).toBe(true);
  expect(embeddable("https://kuula.co/share/collection/7lvvv")).toBe(false);
  expect(embeddable("https://www.google.com/maps/embed?pb=x")).toBe(false);
  expect(embeddable("not a url")).toBe(false);
});

test("the embed code is an iframe of the tour plus a credit link to its page here", () => {
  const code = embedCode({ name: 'Občina "Solčava"', url: "https://solcava.webvisit360.com" }, "/sprehod/obcina-solcava");
  expect(code).toContain('<iframe src="https://solcava.webvisit360.com"');
  expect(code).toContain('title="Občina &quot;Solčava&quot; – 360° virtualni sprehod"');
  expect(code).toContain('href="https://www.webvisit360.com/sprehod/obcina-solcava"');
  expect(code).toContain("allowfullscreen");
});
