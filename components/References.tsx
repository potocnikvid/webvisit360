/* eslint-disable react/no-unescaped-entities */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Image from "next/image";

export default function References() {
    return (
        <div id="references" className="mx-auto max-w-[1780px] mb-16 lg:mb-32">
            <div className="block mb-0 sm:flex sm:flex-col items-center justify-between">
                <div className="text-center">
                    <h2 className="text-4xl lg:text-5xl">Reference</h2>
                </div>
            </div>
            <div className="grid gap-4 mx-8 xl:mx-16 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
                <div className="block mt-16 sm:flex sm:flex-col items-center h-72 sm:h-96 lg:h-128 2xl:h-144 justify-center">
                    <Image
                        className="object-cover mx-auto h-72 sm:h-144 sm:w-full"
                        src="/images/Screenshot 2022-11-26 at 23.19.57.png" alt=""
                        width={1200}
                        height={1200}
                    />
                    <div className="text-xl text-center mt-2">

                        <p>Ghetaldus Optika</p>
                    </div>
                </div>
                <div className="block mt-16 sm:flex sm:flex-col items-center h-72 sm:h-96 lg:h-128 2xl:h-144 justify-center">
                    <Image
                        className="object-cover mx-auto h-72 sm:h-144 sm:w-full"
                        src="/images/Screenshot 2022-11-26 at 23.25.31.png" alt=""
                        width={1200}
                        height={1200}
                    />
                    <div className="text-xl text-center  mt-2">

                        <p>Husqvarna</p>
                    </div>
                </div>
                <div className="block mt-16 sm:flex sm:flex-col items-center h-72 sm:h-96 lg:h-128 2xl:h-144 justify-center">
                    <Image
                        className="object-cover mx-auto h-72 sm:h-144 sm:w-full"
                        src="/images/Screenshot 2022-11-26 at 23.56.01.png" alt=""
                        width={1200}
                        height={1200}
                    />
                    <div className="text-xl text-center  mt-2">
                        <p>Optika</p>
                    </div>
                </div>
                <div className="block mt-16 sm:flex sm:flex-col items-center h-72 sm:h-96 lg:h-128 2xl:h-144 justify-center">
                    <Image
                        className="object-cover mx-auto h-72 sm:h-144 sm:w-full"
                        src="/images/Fanuc1.png" alt=""
                        width={1200}
                        height={1200}
                    />
                    <div className="text-xl text-center  mt-2">
                        <p>Fanuc</p>
                    </div>
                </div>
                <div className="block mt-16 sm:flex sm:flex-col  items-center h-72 sm:h-96 lg:h-128 2xl:h-144 justify-center">
                    <Image
                        className="object-cover mx-auto h-72 sm:h-144 sm:w-full"
                        src="/images/Screenshot 2022-11-26 at 23.48.03.png" alt=""
                        width={1200}
                        height={1200}
                    />
                    <div className="text-xl text-center  mt-2">
                        <p>Bamboo</p>
                    </div>
                </div>
                <div className="block mt-16 sm:flex sm:flex-col items-center h-72 sm:h-96 lg:h-128 2xl:h-144 justify-center">
                    <Image
                        className="object-cover mx-auto h-72 sm:h-144 sm:w-full"
                        src="/images/Screenshot 2022-11-26 at 23.51.22.png" alt=""
                        width={1200}
                        height={1200}
                    />
                    <div className="text-xl text-center  mt-2">
                        <p>Nebo</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
