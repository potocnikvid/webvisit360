/* eslint-disable react/no-unescaped-entities */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Image from "next/image";
import Example from "./ReferenceSelector";

export default function References() {
  return (
    <div id="references" className="mx-auto mb-16 max-w-[1780px] lg:mb-32">
      <div className="space-y-8 lg:space-y-16 items-center justify-between flex flex-col">
          <h2 className="text-center text-4xl lg:text-5xl">Reference</h2>
          <Example />
      </div>
      <div className="mx-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:mx-16 2xl:grid-cols-4">
        <div className="mt-16 block h-72 items-center justify-center sm:flex sm:h-96 sm:flex-col lg:h-128 2xl:h-144">
          <Image
            className="mx-auto h-72 object-cover sm:h-144 sm:w-full"
            src="/images/Screenshot 2022-11-26 at 23.19.57.png"
            alt=""
            width={1200}
            height={1200}
          />
          <div className="mt-2 text-center text-xl">
            <p>Ghetaldus Optika</p>
          </div>
        </div>
        <div className="mt-16 block h-72 items-center justify-center sm:flex sm:h-96 sm:flex-col lg:h-128 2xl:h-144">
          <Image
            className="mx-auto h-72 object-cover sm:h-144 sm:w-full"
            src="/images/Screenshot 2022-11-26 at 23.25.31.png"
            alt=""
            width={1200}
            height={1200}
          />
          <div className="mt-2 text-center  text-xl">
            <p>Husqvarna</p>
          </div>
        </div>
        <div className="mt-16 block h-72 items-center justify-center sm:flex sm:h-96 sm:flex-col lg:h-128 2xl:h-144">
          <Image
            className="mx-auto h-72 object-cover sm:h-144 sm:w-full"
            src="/images/Screenshot 2022-11-26 at 23.56.01.png"
            alt=""
            width={1200}
            height={1200}
          />
          <div className="mt-2 text-center  text-xl">
            <p>Optika</p>
          </div>
        </div>
        <div className="mt-16 block h-72 items-center justify-center sm:flex sm:h-96 sm:flex-col lg:h-128 2xl:h-144">
          <Image
            className="mx-auto h-72 object-cover sm:h-144 sm:w-full"
            src="/images/Fanuc1.png"
            alt=""
            width={1200}
            height={1200}
          />
          <div className="mt-2 text-center  text-xl">
            <p>Fanuc</p>
          </div>
        </div>
        <div className="mt-16 block h-72 items-center  justify-center sm:flex sm:h-96 sm:flex-col lg:h-128 2xl:h-144">
          <Image
            className="mx-auto h-72 object-cover sm:h-144 sm:w-full"
            src="/images/Screenshot 2022-11-26 at 23.48.03.png"
            alt=""
            width={1200}
            height={1200}
          />
          <div className="mt-2 text-center  text-xl">
            <p>Bamboo</p>
          </div>
        </div>
        <div className="mt-16 block h-72 items-center justify-center sm:flex sm:h-96 sm:flex-col lg:h-128 2xl:h-144">
          <Image
            className="mx-auto h-72 object-cover sm:h-144 sm:w-full"
            src="/images/Screenshot 2022-11-26 at 23.51.22.png"
            alt=""
            width={1200}
            height={1200}
          />
          <div className="mt-2 text-center  text-xl">
            <p>Nebo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
