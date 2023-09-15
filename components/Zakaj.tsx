/* eslint-disable react/no-unescaped-entities */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Image from "next/image";
import OnViewOpenComponent from "./OnViewOpen";

export default function Zakaj() {
  return (
    <div className="mx-auto mb-16 lg:mb-32 max-w-[1780px] space-y-16">
      <div className="mb-0 block items-center justify-between sm:flex sm:flex-col">
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl">Zakaj izbrati nas?</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-12  sm:grid-cols-2 xl:mx-16 xl:grid-cols-4 mx-8">
        <div className=" block items-center justify-center sm:flex sm:flex-col">
          <div className="border-2 border-b-4 border-neutral-200 border-b-red-500 p-8 h-96 sm:h-[440px] md:h-88 lg:h-80 xl:h-[460px]">
            <div className="pb-4 text-center  text-xl">
              <p>GOOGLE CERTIFICIRANI STRUČNJACI</p>
            </div>
            <Image
              className="mx-auto my-4"
              src="/images/street_view_trusted.png"
              alt=""
              width={200}
              height={150}
            />

            <div className="mt-2 border-t-2 border-neutral-100 pt-8 text-center  text-lg">
              <p>
                Višegodišnje iskustvo u radu sa Google moderatoratorima i Google
                certificiranim stručnjacima.
              </p>
            </div>
          </div>
        </div>

        <div className=" block items-center justify-center sm:flex  sm:flex-col ">
          <div className=" border-2 border-b-4 border-neutral-200 border-b-yellow-400 p-8 h-96 sm:h-[440px] md:h-88 lg:h-80 xl:h-[460px]">
            <div className="pb-4 text-center  text-xl">
              <p>VRHUNSKA KVALITETA IZRADE</p>
            </div>
            <Image
              className="mx-auto my-4"
              src="/images/street_view_trusted.png"
              alt=""
              width={200}
              height={150}
            />

            <div className="mt-2 border-t-2 border-neutral-100 pt-8 text-center  text-lg">
              <p>
                Naši Google certificirani stručnjaci se drže strogih pravila i
                normi definiranih od strane Googlea.
              </p>
            </div>
          </div>
        </div>
        <div className=" block items-center justify-center sm:flex sm:flex-col ">
          <div className=" border-2 border-b-4 border-neutral-200 border-b-green-600 p-8 h-96 sm:h-[440px] md:h-88 lg:h-80 xl:h-[460px]">
            <div className="pb-4 text-center  text-xl">
              <p>NAŠE RADOVE SU PREPOZNALE RENOMIRANE TVRTKE</p>
            </div>
            <Image
              className="mx-auto my-4"
              src="/images/street_view_trusted.png"
              alt=""
              width={200}
              height={150}
            />

            <div className="mt-2 border-t-2 border-neutral-100 pt-8 text-center  text-lg">
              <p>
                Najbolja motivacija za nastavak i razvoj poslovanja nam je
                pozitivna kritika naših klijenata.
              </p>
            </div>
          </div>
        </div>
        <div className="block items-center justify-center sm:flex sm:flex-col ">
          <div className="border-2 border-b-4 border-neutral-200 border-b-blue-600 p-8 h-96 sm:h-[440px] md:h-88 lg:h-80 xl:h-[460px]">
            <div className="pb-4 text-center  text-xl">
              <p>VIŠE OD 64 MILIJUNA PREGLEDA</p>
            </div>
            <Image
              className="mx-auto my-4"
              src="/images/street_view_trusted.png"
              alt=""
              width={200}
              height={150}
            />

            <div className="mt-2 border-t-2 border-neutral-100 pt-8 text-center  text-lg">
              <p>
                Tijekom 6 godina poslovanja, naši radovi imaju više od 64
                milijuna pregleda na Google-u te ih je svakim danom sve više.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
