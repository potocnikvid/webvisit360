// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { copy } from "@/lib/i18n";

// The globe needs WebGL; a stub renders one button per place that "clicks the pin".
vi.mock("next/dynamic", () => ({
  default: () =>
    function GlobeStub(props: { tours: { id: string; name: string }[]; onSelect: (id: string) => void }) {
      return (
        <div>
          {props.tours.map((t) => (
            <button key={t.id} onClick={() => props.onSelect(t.id)}>{`pin ${t.name}`}</button>
          ))}
        </div>
      );
    },
}));
vi.mock("./PanoPreview", () => ({ default: () => null }));
vi.mock("./GoogleTour", () => ({ default: () => null }));

const { default: Experience } = await import("./Experience");
const t = copy.en;

const tours = {
  stats: { obcine: 1, business: 0, placed: 1, scenes: 10, kuulaViews: 0 },
  items: [
    { id: "zalec", kind: "obcina", type: "obcina", source: "3dvista", name: "Občina Žalec", place: "Žalec", lat: 46.25, lng: 15.16,
      approx: false, url: "", cover: null, pano: false, scenes: 10, views: null, highlights: [] },
  ],
};

beforeEach(() => {
  Element.prototype.scrollTo = () => {};
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("tours.json")) return Response.json(tours);
    if (url.includes("geo.json")) return Response.json({ features: [] });
    const done = { type: "done", assistant: [{ type: "text", text: "Hi!" }], toolResults: [] };
    return new Response(JSON.stringify({ type: "text", text: "Hi!" }) + "\n" + JSON.stringify(done) + "\n");
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("looking at a tour mid-chat keeps the conversation", async () => {
  render(<Experience visitor={null} />);
  fireEvent.click(await screen.findByRole("button", { name: t.wantOwn }));
  fireEvent.change(screen.getByLabelText(t.chat.placeholder), { target: { value: "We run a hotel." } });
  fireEvent.click(screen.getByRole("button", { name: t.chat.send }));
  await screen.findByText("Hi!");

  fireEvent.click(await screen.findByRole("button", { name: "pin Občina Žalec" }));
  fireEvent.click(await screen.findByRole("button", { name: t.panel.wantThis }));
  await waitFor(() => expect(screen.getByText("We run a hotel.")).toBeTruthy());
});

test("a visitor with no known location can still ask for their exact location", async () => {
  render(<Experience visitor={null} />);
  expect(await screen.findByRole("button", { name: t.near.precise })).toBeTruthy();
});
