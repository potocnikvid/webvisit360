// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import About from "./About";
import { about } from "@/lib/about";

afterEach(cleanup);
const a = about.en;

test("tells the story: slogan, badge, five steps and the company details", () => {
  render(<About />);
  expect(screen.getByRole("heading", { level: 1, name: a.hero.title })).toBeTruthy();
  expect(screen.getAllByAltText("Google Street View Trusted").length).toBeGreaterThan(0);
  expect(within(screen.getByRole("list", { name: a.process.title })).getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getByText("SI32150245", { exact: false })).toBeTruthy();
  expect(screen.getByRole("link", { name: "info@webvisit360.com" }).getAttribute("href")).toBe("mailto:info@webvisit360.com");
  expect(screen.getByRole("link", { name: "+386 41 698 386" }).getAttribute("href")).toBe("tel:+38641698386");
});

test("reference municipalities open on the map", () => {
  render(<About />);
  expect(screen.getByRole("link", { name: "Trbovlje" }).getAttribute("href")).toBe("/?tour=trbovlje");
  expect(screen.getByRole("link", { name: "Mengeš" }).getAttribute("href")).toBe("/?tour=menges");
});

test("the call to action opens the enquiry chat", () => {
  render(<About />);
  for (const link of screen.getAllByRole("link", { name: a.cta.button })) expect(link.getAttribute("href")).toBe("/?povprasevanje");
});

test("publishes no unsourced statistics and no personal email", () => {
  const { container } = render(<About />);
  expect(container.textContent).not.toMatch(/\d+\s?%|vid\.slovenia7|gmail/);
});
