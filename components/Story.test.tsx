// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Story from "./Story";
import { about } from "@/lib/about";

afterEach(cleanup);
const a = about.en;

const renderStory = () => {
  const handlers = { onBack: vi.fn(), onEnquire: vi.fn(), onReference: vi.fn(), onPrivacy: vi.fn() };
  render(<Story copy={a} privacyLabel="Privacy" {...handlers} />);
  return handlers;
};

test("tells the story: slogan, badge, five steps and the company details", () => {
  renderStory();
  expect(screen.getByRole("heading", { level: 1, name: a.hero.title })).toBeTruthy();
  expect(screen.getByAltText("Google Street View Trusted")).toBeTruthy();
  expect(within(screen.getByRole("list", { name: a.process.title })).getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getByText("SI32150245", { exact: false })).toBeTruthy();
  expect(screen.getByRole("link", { name: "info@webvisit360.com" }).getAttribute("href")).toBe("mailto:info@webvisit360.com");
  expect(screen.getByRole("link", { name: "+386 41 698 386" }).getAttribute("href")).toBe("tel:+38641698386");
});

test("reference municipalities show on the globe, and still work as plain links", () => {
  const h = renderStory();
  const trbovlje = screen.getByRole("link", { name: "Trbovlje" });
  expect(trbovlje.getAttribute("href")).toBe("/?tour=trbovlje");
  fireEvent.click(trbovlje);
  expect(h.onReference).toHaveBeenCalledWith("trbovlje");
});

test("back and the call to action act in place", () => {
  const h = renderStory();
  fireEvent.click(screen.getByRole("link", { name: `← ${a.back}` }));
  expect(h.onBack).toHaveBeenCalled();
  const cta = screen.getByRole("link", { name: a.cta.button });
  expect(cta.getAttribute("href")).toBe("/?povprasevanje");
  fireEvent.click(cta);
  expect(h.onEnquire).toHaveBeenCalled();
});

test("publishes no unsourced statistics and no personal email", () => {
  renderStory();
  expect(document.body.textContent).not.toMatch(/\d+\s?%|vid\.slovenia7|gmail/);
});
