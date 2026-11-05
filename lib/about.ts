import type { Lang } from "./i18n";

/**
 * Copy for the About page (/o-nas), adapted from the company's own texts.
 * Rules it follows: no statistics without a source, no fixed durations or prices.
 */

/** Reference municipalities, each on its own address; ids open them on the globe. */
export const REFERENCES = [
  { id: "trbovlje", name: "Trbovlje" },
  { id: "polzela", name: "Polzela" },
  { id: "zalec", name: "Žalec" },
  { id: "prebold", name: "Prebold" },
  { id: "braslovce", name: "Braslovče" },
  { id: "mozirje", name: "Mozirje" },
  { id: "solcava", name: "Solčava" },
  { id: "kozje", name: "Kozje" },
  { id: "tabor", name: "Tabor" },
  { id: "menges", name: "Mengeš" },
] as const;

const sl = {
  back: "Na zemljevid",
  hero: {
    kicker: "O nas",
    title: "Najprej se zaljubijo na prvi pogled. Potem pridejo.",
    lead: "Smo Webvisit360, blagovna znamka Agencije Sinhron d.o.o. Od leta 2017 izdelujemo 360° virtualne sprehode v 3D in jih kot Google Street View Trusted partner objavljamo neposredno na Google Zemljevidih. Tako vaša lokacija ni le na vaši spletni strani, ampak povsod, kjer vas ljudje iščejo: na Google Zemljevidih, v Google Earth in v Iskanju.",
    facts: [
      { value: "2017", label: "ustvarjamo od leta" },
      { value: "1.000+", label: "predstavljenih lokacij" },
      { value: "0 €", label: "mesečnih naročnin" },
    ],
  },
  problem: {
    title: "Odločitev pade na telefonu, preden sploh pokličejo.",
    text: [
      "Kdor na Google Zemljevidih pokaže le tri fotografije pročelja, izgubi gosta proti tistemu, ki pokaže notranjost v 360°.",
      "Z virtualnim sprehodom ne kupite fotografij, ampak zaupanje pred prihodom. Hotel pokaže občutek sobe, občina razlog za obisk, nepremičninar pa pride do resnih kupcev.",
    ],
  },
  why: {
    title: "Zakaj 360° sprehod",
    items: [
      { t: "Vidnost", d: "Google profil s 360° sprehodom prikaže bogateje. Obiskovalec ostane dlje in si zapomni vas, ne konkurence." },
      { t: "Zaupanje", d: "Gost, ki je sobo že virtualno obiskal, rezervira z manj vprašanji in manj dvoma." },
      { t: "Čas", d: "Manj praznih ogledov in klicev »kako pa izgleda«, več resnih povpraševanj." },
      { t: "Trajnost", d: "Enkratna naložba brez mesečnih stroškov. Sprehod ostane objavljen na Google Zemljevidih." },
      { t: "Prednost", d: "Večina lokalnih konkurentov tega še nima. Prvi v kraju dobi največ pozornosti." },
      { t: "Trend v turizmu", d: "Gostje želijo ambient in naravo začutiti že pred obiskom, zato se lažje odločijo, da pridejo." },
    ],
  },
  services: {
    title: "Kaj delamo",
    forLabel: "Za koga",
    items: [
      {
        title: "360° virtualni sprehod v 3D",
        text: "Interaktiven sprehod, v katerem se obiskovalec premika med točkami kot v resnici, odpre meni in skoči v sobo, na bazen, v restavracijo ali na trg.",
        for: "hoteli in apartmaji, restavracije in vinske kleti, wellness in šport, showroomi in trgovine, zdravstvene ustanove, nepremičnine",
      },
      {
        title: "360° posnetki z dronom",
        text: "Zračni pogled na občino, dolino, hotelski kompleks ali smučišče, povezan s sprehodom na tleh. Obiskovalec začne v zraku, vidi celoto in se z enim klikom spusti v center, k cerkvi ali v hotel.",
        for: "občine in turistične destinacije, hoteli in resorti, smučišča, golf igrišča, kampi, vinorodni okoliši, poslovne cone za investitorje",
      },
    ],
    obcina: {
      title: "Za občine",
      text: "Občina z zračnim 360° sprehodom pokaže celoto: trg, naravo, šport in kulturo. To je gradivo, ki ga županstvo, TIC in društva uporabljajo leta, in hkrati sodobna predstavitev za investitorje. Vsaka občina dobi svojo trajno domeno, na primer obcina.webvisit360.com.",
    },
  },
  included: {
    title: "Kaj dobite z enkratnim naročilom",
    items: [
      "Profesionalno 360° fotografiranje notranjosti in zunanjosti v visoki ločljivosti, s Sonyjevo opremo.",
      "3D povezavo točk: po prostoru se premikate, ne le vrtite na mestu.",
      "Interaktivni meni z razdelki, na primer recepcija, sobe, wellness, zunanjost.",
      "Objavo na Google Zemljevidih, Street View, Google Earth in v Iskanju prek pooblaščenega partnerja.",
      "Vdelavo na vašo spletno stran in povezave za Booking.com, Facebook in druga omrežja.",
      "Trajno gostovanje brez naročnine in skritih stroškov.",
    ],
    extrasTitle: "Po želji dodamo",
    extras: ["info točke z besedilom, slikami ali videom", "povezave na rezervacijo", "vaš logotip in barve", "večjezični meni", "360° video", "promocijski video z drona"],
    price: "Cena je odvisna od števila panoram, ki jih posnamemo in povežemo v sprehod. Plačate enkrat, brez naročnin, mi pa vam pripravimo osebno ponudbo.",
  },
  process: {
    title: "Kako poteka",
    lead: "Od dogovora do objave vi samo odprete vrata in potrdite končni izdelek.",
    steps: [
      { t: "Povpraševanje", d: "Pokažemo vam živ primer, popišemo prostore in pošljemo ponudbo z datumom snemanja." },
      { t: "Priprava", d: "Dobite kratek kontrolni seznam: urejeni prostori, prižgane luči, odprte sobe in brez ljudi v kadru." },
      { t: "Snemanje", d: "Pridemo na lokacijo in posnamemo vse, po želji tudi z dronom. Vi samo odprete vrata." },
      { t: "Obdelava", d: "Izdelamo sprehod, meni in info točke. Pošljemo vam predogled, ki ga potrdite ali dopolnite s pripombami." },
      { t: "Objava", d: "Objavimo ga na Google Zemljevidih in na vaši domeni, vgradimo na spletno stran ter predamo QR kode in navodila." },
    ],
  },
  references: {
    title: "Reference",
    obcine: "Občine, vsaka na svoji domeni",
    hint: "Kliknite in jo odprite na zemljevidu.",
    industriesTitle: "Panoge, kjer že delamo",
    industries: ["hoteli in wellness", "restavracije", "vinske kleti", "showroomi", "poslovni centri", "zdravstvene ustanove", "nepremičnine", "turistične destinacije"],
  },
  person: {
    title: "Kdo stoji za posnetki",
    text: "Franc (Frenk) Potočnik, fotograf in direktor. Ne posname le prostora, ampak to, kar želi gost doživeti, da se odloči priti. Od leta 2017 smo svetu predstavili že več kot 1.000 zelo različnih poslovnih in turističnih lokacij, in vsako leto je delo še boljše.",
  },
  faq: {
    title: "Pogosta vprašanja",
    items: [
      { q: "Ali ni to drago?", a: "Primerjajte z enim mesecem oglaševanja na Googlu ali Bookingu, ki po mesecu izgine. Sprehod ostane na Google Zemljevidih leta, plačate pa ga samo enkrat." },
      { q: "Fotografije že imamo. Zakaj še sprehod?", a: "Fotografije ostanejo. Fotografija pokaže, sprehod pa gostu pusti, da si sam ogleda, kar ga zanima. Google 360° vsebino prikazuje bogateje kot statične slike." },
      { q: "Ali lahko to naredimo sami s telefonom?", a: "Lahko. Razlika je v kakovosti, 3D povezavi, meniju in objavi kot pooblaščeni partner. Z veseljem vam pokažemo primer obojega, presodite sami." },
      { q: "Letos nimamo proračuna.", a: "Pripravimo ponudbo, ki jo vključite v naslednji proračun. Lahko pa začnemo z manjšim paketom, da imate referenco že letos." },
      { q: "Odločitev ni samo moja.", a: "Seveda. Za župana, lastnika ali upravo pripravimo kratko predstavitev z živim primerom iz vaše bližine." },
      { q: "Kako izmerimo rezultat?", a: "Google profil pokaže število ogledov. Po objavi skupaj primerjamo stanje pred in po." },
      { q: "Ali posnetki ne zastarajo?", a: "Osvežitev ponujamo po nižji ceni. Večina lokacij jo naredi vsaki dve do tri leta, po prenovi ali za novo sezono." },
      { q: "Kaj, če Google spremeni pravila?", a: "Sprehod živi tudi na vaši domeni in spletni strani, ne samo na Googlu. Ničesar ne izgubite." },
      { q: "Konkurenca tega nima, zakaj bi mi?", a: "Ravno zato. Prvi v kraju dobi vso pozornost, drugi se primerjajo z vami." },
    ],
  },
  cta: { title: "Pokažite se v 360°.", text: "Povejte nam, kaj bi radi pokazali, in pripravimo vam osebno ponudbo.", button: "Želim svoj sprehod" },
  company: {
    title: "Podatki podjetja",
    labels: {
      company: "Podjetje",
      brand: "Blagovna znamka",
      address: "Sedež",
      registration: "Matična številka",
      vat: "Davčna številka",
      director: "Direktor",
      email: "E-pošta",
      phone: "Telefon",
      status: "Status",
    },
    status: "Google Street View Trusted partner",
  },
};

export type AboutCopy = typeof sl;

const en: AboutCopy = {
  back: "To the map",
  hero: {
    kicker: "About",
    title: "First they fall in love at first sight. Then they come.",
    lead: "We are Webvisit360, a brand of Agencija Sinhron d.o.o. Since 2017 we have been making 3D 360° virtual tours, and as a Google Street View Trusted partner we publish them straight to Google Maps. So your place isn't only on your own website, but wherever people look for you: on Google Maps, in Google Earth and in Search.",
    facts: [
      { value: "2017", label: "making tours since" },
      { value: "1,000+", label: "places presented" },
      { value: "€0", label: "monthly subscription" },
    ],
  },
  problem: {
    title: "People decide on their phone, before they ever call.",
    text: [
      "A place that shows three photos of its front on Google Maps loses the guest to the one that shows its inside in 360°.",
      "With a virtual tour you're not buying photos, you're buying trust before arrival. A hotel shows how the room feels, a municipality gives a reason to visit, and an estate agent meets serious buyers.",
    ],
  },
  why: {
    title: "Why a 360° tour",
    items: [
      { t: "Visibility", d: "Google shows a profile with a 360° tour more richly. Visitors stay longer and remember you, not the competition." },
      { t: "Trust", d: "A guest who has already walked through the room books with fewer questions and less doubt." },
      { t: "Time", d: "Fewer wasted viewings and \"what does it look like\" calls, more serious enquiries." },
      { t: "Lasting", d: "A one-off investment with no monthly costs. The tour stays published on Google Maps." },
      { t: "Head start", d: "Most local competitors don't have one yet. The first in town gets the most attention." },
      { t: "Where tourism is going", d: "Guests want to feel the atmosphere and the nature before they visit, which makes it easier to decide to come." },
    ],
  },
  services: {
    title: "What we do",
    forLabel: "For",
    items: [
      {
        title: "3D 360° virtual tours",
        text: "An interactive tour where visitors move from point to point as if they were there, open the menu and jump to a room, the pool, the restaurant or the town square.",
        for: "hotels and apartments, restaurants and wineries, wellness and sport, showrooms and shops, clinics, real estate",
      },
      {
        title: "360° drone panoramas",
        text: "An aerial view of a municipality, a valley, a hotel resort or a ski area, joined with the tour on the ground. Visitors start in the air, see the whole place and drop into the centre, the church or the hotel with one click.",
        for: "municipalities and destinations, hotels and resorts, ski areas, golf courses, campsites, wine regions, business zones looking for investors",
      },
    ],
    obcina: {
      title: "For municipalities",
      text: "A municipality with an aerial 360° tour shows the whole picture: the square, nature, sport and culture. It's material the mayor's office, the tourist office and local societies use for years, and a modern presentation for investors. Every municipality gets its own permanent address, such as town.webvisit360.com.",
    },
  },
  included: {
    title: "What a one-off order includes",
    items: [
      "Professional high-resolution 360° photography of interiors and exteriors, with Sony equipment.",
      "3D linking of points: you move through the space, not just turn on the spot.",
      "An interactive menu with sections, for example reception, rooms, wellness, outside.",
      "Publishing on Google Maps, Street View, Google Earth and Search through an authorised partner.",
      "Embedding on your website and links for Booking.com, Facebook and other networks.",
      "Permanent hosting with no subscription and no hidden costs.",
    ],
    extrasTitle: "Optional extras",
    extras: ["info points with text, pictures or video", "booking links", "your logo and colours", "a multilingual menu", "360° video", "a promotional drone video"],
    price: "The price depends on how many panoramas we shoot and link into the tour. You pay once, with no subscription, and we prepare a personal offer for you.",
  },
  process: {
    title: "How it works",
    lead: "From agreement to publishing, all you do is open the doors and approve the result.",
    steps: [
      { t: "Enquiry", d: "We show you a live example, list the spaces and send an offer with a filming date." },
      { t: "Getting ready", d: "You get a short checklist: tidy rooms, lights on, doors open and no people in shot." },
      { t: "Filming", d: "We come to the place and shoot everything, with a drone if you like. You just open the doors." },
      { t: "Building", d: "We build the tour, the menu and the info points, and send you a preview to approve or comment on." },
      { t: "Publishing", d: "We publish it on Google Maps and on its own address, embed it on your website and hand over QR codes and instructions." },
    ],
  },
  references: {
    title: "References",
    obcine: "Municipalities, each on its own address",
    hint: "Click one to open it on the map.",
    industriesTitle: "Industries we already work in",
    industries: ["hotels and wellness", "restaurants", "wineries", "showrooms", "business centres", "clinics", "real estate", "tourist destinations"],
  },
  person: {
    title: "Who's behind the camera",
    text: "Franc (Frenk) Potočnik, photographer and director. He doesn't just photograph a space; he captures what a guest wants to experience in order to decide to come. Since 2017 we have shown the world more than 1,000 very different business and tourist places, and the work gets better every year.",
  },
  faq: {
    title: "Questions people ask",
    items: [
      { q: "Isn't it expensive?", a: "Compare it with one month of advertising on Google or Booking, which is gone after a month. The tour stays on Google Maps for years, and you pay for it once." },
      { q: "We already have photos. Why a tour?", a: "Keep the photos. A photo shows; a tour lets the guest look at whatever interests them. Google shows 360° content more richly than still images." },
      { q: "Can't we do it ourselves with a phone?", a: "You can. The difference is the quality, the 3D linking, the menu and publishing as an authorised partner. We're happy to show you both and let you judge." },
      { q: "We have no budget this year.", a: "We'll prepare an offer you can include in next year's budget. Or we can start with a smaller package so you have a reference this year." },
      { q: "It's not only my decision.", a: "Of course. We'll prepare a short presentation for the mayor, owner or board, with a live example from nearby." },
      { q: "How do we measure the result?", a: "Your Google profile shows the number of views. After publishing, we compare before and after together." },
      { q: "Won't the photos get outdated?", a: "We offer a refresh at a lower price. Most places refresh every two to three years, after a renovation or for a new season." },
      { q: "What if Google changes its rules?", a: "The tour also lives on your own address and website, not only on Google. You lose nothing." },
      { q: "Our competitors don't have one. Why should we?", a: "That's exactly why. The first in town gets all the attention; the rest get compared with you." },
    ],
  },
  cta: { title: "Show yourself in 360°.", text: "Tell us what you'd like to show and we'll prepare a personal offer.", button: "Get your own tour" },
  company: {
    title: "Company details",
    labels: {
      company: "Company",
      brand: "Brand",
      address: "Registered office",
      registration: "Registration no.",
      vat: "VAT no.",
      director: "Director",
      email: "Email",
      phone: "Phone",
      status: "Status",
    },
    status: "Google Street View Trusted partner",
  },
};

export const about: Record<Lang, AboutCopy> = { sl, en };
