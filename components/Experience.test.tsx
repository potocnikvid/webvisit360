// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { copy } from "@/lib/i18n";

type GlobeProps = {
  tours: { id: string; name: string }[];
  onSelect: (id: string) => void;
  you?: { lat: number; lng: number; precise: boolean; label: string } | null;
};
const globe = vi.hoisted(() => ({ props: null as unknown }));

// The globe needs WebGL; a stub renders one button per place that "clicks the pin".
vi.mock("next/dynamic", () => ({
  default: () =>
    function GlobeStub(props: GlobeProps) {
      globe.props = props;
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

/** Stands in for the browser's location permission prompt. */
const geolocation = (answer: "allow" | "deny") =>
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((ok: PositionCallback, fail: PositionErrorCallback) =>
        answer === "allow"
          ? ok({ coords: { latitude: 46.2397, longitude: 15.2677 } } as GeolocationPosition)
          : fail({ code: 1 } as GeolocationPositionError)),
    },
  });

const ZALEC_IP = { lat: 46.25, lng: 15.16, city: "Žalec", country: "SI" };
const props = () => globe.props as GlobeProps;

beforeEach(() => {
  Element.prototype.scrollTo = () => {};
  geolocation("deny");
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

test("asks for the exact location on arrival and marks the visitor there", async () => {
  geolocation("allow");
  render(<Experience visitor={null} />);
  await waitFor(() => expect(props()?.you).toMatchObject({ lat: 46.2397, lng: 15.2677, precise: true, label: t.you.here }));
  expect(await screen.findByText(t.near.kicker, { exact: false })).toBeTruthy();
  expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
});

test("if the visitor refuses, the approximate location is used, quietly", async () => {
  render(<Experience visitor={ZALEC_IP} />);
  await waitFor(() => expect(props()?.you).toMatchObject({ lat: 46.25, lng: 15.16, precise: false, label: t.you.around }));
  expect(screen.queryByText(t.near.denied)).toBeNull();
});

test("no marker when the location is unknown", async () => {
  render(<Experience visitor={null} />);
  await screen.findByRole("button", { name: t.near.precise });
  expect(props()?.you ?? null).toBeNull();
});

test("shows only the public contact address, never a personal one", async () => {
  render(<Experience visitor={null} />);
  const mail = await screen.findByRole("link", { name: "info@webvisit360.com" });
  expect(mail.getAttribute("href")).toBe("mailto:info@webvisit360.com");
  expect(document.body.innerHTML).not.toMatch(/vid\.slovenia7|gmail\.com/);
});

test("shows the Street View Trusted badge and links to the About page", async () => {
  render(<Experience visitor={null} />);
  expect(await screen.findByAltText("Google Street View Trusted")).toBeTruthy();
  const links = screen.getAllByRole("link", { name: t.nav.about });
  expect(links.length).toBe(2); // topbar, and the footer for phones (where the topbar hides links)
  for (const l of links) expect(l.getAttribute("href")).toBe("/o-nas");
});

test("?tour=<id> opens that place, so the About page can link to references", async () => {
  window.history.replaceState(null, "", "/?tour=zalec");
  render(<Experience visitor={null} />);
  expect(await screen.findByRole("heading", { name: "Občina Žalec" })).toBeTruthy();
  window.history.replaceState(null, "", "/");
});

test("?povprasevanje opens the enquiry chat", async () => {
  window.history.replaceState(null, "", "/?povprasevanje");
  render(<Experience visitor={null} />);
  expect(await screen.findByLabelText(t.chat.placeholder)).toBeTruthy();
  window.history.replaceState(null, "", "/");
});
