import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import OnViewOpenComponent from "./OnViewOpen";
import Button from "./Button";

export default function Timeline() {
  const timelineItems = [
    {
      headline: "Sastanak i procjena",
      text: "Za početak predlažemo neobavezujući sastanak putem platforme Zoom, ili u prostorijama koje želite fotografirati. Odgovorimovam na sva pitanja, objasnimo sve detalje i procjenimo koliko ćeto koštati (cijena ovisi o veličini prostora). Dogovorimo terminfotografiranja i potpišemo ugovor o autorskim pravima.",
    },
    {
      headline: "Order Shipped",
      text: "Da bi Google mogao objaviti virtualnu šetnju po vašoj firmi - vi morate imati Google vizitku na kojoj će biti i virtualna šetnja i fotografije.Pokažite klijentima da radite,objavite radno vrijeme, telefonski broj i upute do tvrtke na Google pretraživanju i na Kartama - uz Google vizitku. Ukoliko trebate pomoć, rado ćemo vam pomoći u tome.",
    },
    {
      headline: "Google vizitka",
      text: "Fotografiranje traje u prosjeku od 45 min. do 90 min, ali ovisi o veličini prostora koji se fotografira. Molimo vas da pripremite sve prostorije i uzmete u obzir da se na 360º panoramama vidi sve.",
    },
    {
      headline: "Fotografiranje",
      text: "Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum morbi blandit cursus risus.",
    },
    {
      headline: "Objavljivanje",
      text: "Virtualna šetnja i fotografije će biti objavljeni na Googlu za nekoliko dana (max 14). Naši google certificirani djelatnici fotografije prvo moraju pripremiti u specijalnim programima za obradu virtualnih fotografija. Količina posla ovisi o količini fotografija koje ovise u veličini prostora koji se fotografira.",
    },
  ];
  return (
    <div className="container relative mx-auto w-screen items-center justify-center">
      <div className="before:-tranneutral-x-px lg:before:tranneutral-x-0 relative space-y-8 pb-16 pl-16 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-300 before:to-transparent lg:-space-y-4 lg:px-16 lg:before:mx-auto">
        {timelineItems.map((item, index) => (
          <div className="is-active group relative flex items-center justify-between lg:justify-normal lg:even:flex-row-reverse">
            <OnViewOpenComponent
              delay={1}
              duration={2}
              className="flex w-[calc(100%-4rem)] rounded border border-neutral-200 bg-neutral-50 p-4 shadow md:space-x-8 lg:w-[calc(50%-2.5rem)]"
            >
              <div className="hidden text-5xl text-[#f9b03e]/70 md:block md:text-8xl">
                {index + 1}
              </div>
              <div className="space-y-2">
                <div className="mb-1 flex items-center justify-between space-x-2">
                  <div className="text-3xl text-neutral-900">
                    {item.headline}
                  </div>
                </div>
                <div className="text-xl text-neutral-500">{item.text}</div>
              </div>
            </OnViewOpenComponent>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center pb-16">
        <Button className="px-12 py-3" href="/contact">
          Kontaktirajte nas
        </Button>
      </div>
    </div>
  );
}
