import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Timeline() {
  return (
    <div className="container relative mx-auto w-screen items-center justify-center">
      <div className="relative space-y-8 pb-16 pl-16 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent lg:-space-y-4 lg:px-16 lg:before:mx-auto lg:before:translate-x-0">
        
        <div className="is-active group relative flex items-center justify-between lg:justify-normal lg:even:flex-row-reverse">
          <div className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(50%-2.5rem)]">
            <div className="text-8xl text-[#f9b03e]/70">1</div>
            <div>
              <div className="mb-1 flex items-center justify-between space-x-2">
                <div className="text-3xl text-slate-900">
                  Sastanak i procjena
                </div>
              </div>
              <div className="text-xl text-slate-500">
                Za početak predlažemo neobavezujući sastanak putem platforme
                Zoom, ili u prostorijama koje želite fotografirati. Odgovorimo
                vam na sva pitanja, objasnimo sve detalje i procjenimo koliko će
                to koštati (cijena ovisi o veličini prostora). Dogovorimo termin
                fotografiranja i potpišemo ugovor o autorskim pravima.
              </div>
            </div>
          </div>
        </div>

        <div className="is-active group relative flex items-center justify-between lg:justify-normal lg:even:flex-row-reverse">
          <div className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(50%-2.5rem)]">
            <div className="text-8xl text-[#f9b03e]/70">2</div>
            <div>
              <div className="mb-1 flex items-center justify-between space-x-2">
                <div className="text-3xl text-slate-900">Order Shipped</div>
              </div>
              <div className="text-xl text-slate-500">
                Da bi Google mogao objaviti virtualnu šetnju po vašoj firmi - vi
                morate imati Google vizitku na kojoj će biti i virtualna šetnja
                i fotografije.Pokažite klijentima da radite,objavite radno
                vrijeme, telefonski broj i upute do tvrtke na Google
                pretraživanju i na Kartama – uz Google vizitku. Ukoliko trebate
                pomoć, rado ćemo vam pomoći u tome.
              </div>
            </div>
          </div>
        </div>

        <div className="is-active group relative flex items-center justify-between lg:justify-normal lg:even:flex-row-reverse">
          <div className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(50%-2.5rem)]">
            <div className="text-8xl text-[#f9b03e]/70">3</div>
            <div>
              <div className="mb-1 flex items-center justify-between space-x-2">
                <div className="text-3xl text-slate-900">Google vizitka</div>
              </div>
              <div className="text-xl text-slate-500">
                Fotografiranje traje u prosjeku od 45 min. do 90 min, ali ovisi
                o veličini prostora koji se fotografira. Molimo vas da
                pripremite sve prostorije i uzmete u obzir da se na 360º
                panoramama vidi sve.
              </div>
            </div>
          </div>
        </div>

        <div className="is-active group relative flex items-center justify-between lg:justify-normal lg:even:flex-row-reverse">
          <div className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(50%-2.5rem)]">
            <div className="text-8xl text-[#f9b03e]/70">4</div>
            <div>
              <div className="mb-1 flex items-center justify-between space-x-2">
                <div className="text-3xl text-slate-900">Fotografiranje</div>
              </div>
              <div className="text-xl text-slate-500">
                Pretium lectus quam id leo. Urna et pharetra aliquam vestibulum
                morbi blandit cursus risus.
              </div>
            </div>
          </div>
        </div>

        <div className="group relative flex items-center justify-between lg:justify-normal lg:even:flex-row-reverse">
          <div className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(50%-2.5rem)]">
            <div className="text-8xl text-[#f9b03e]/70">5</div>
            <div>
              <div className="mb-1 flex items-center justify-between space-x-2">
                <div className="text-3xl text-slate-900">Objavljivanje</div>
              </div>
              <div className="text-xl text-slate-500">
                Virtualna šetnja i fotografije će biti objavljeni na Googlu za
                nekoliko dana (max 14). Naši google certificirani djelatnici
                fotografije prvo moraju pripremiti u specijalnim programima za
                obradu virtualnih fotografija. Količina posla ovisi o količini
                fotografija koje ovise u veličini prostora koji se fotografira.
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <div className="relative bottom-0 inset-x-0 mx-auto pb-16">
        <Link
          href="/contact"
          className="rounded-lg  text-white bg-[#f9b03e] px-12 py-3 decoration-2 underline-offset-2"
        >
          Kontakt
        </Link>
      </div> */}
      <div className="flex items-center justify-center pb-16">
        <Link
          href="/contact"
          className="rounded-lg bg-[#f9b03e] px-12 py-3 text-white decoration-2 underline-offset-2"
        >
          Kontaktirajte nas
        </Link>
      </div>
    </div>
  );
}
