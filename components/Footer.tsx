/* eslint-disable @next/next/no-html-link-for-pages */
import React from "react";
import Link from "next/link";
import Image from "next/image";

import { motion } from "framer-motion";
import Button from "./Button";

export default function Footer() {
  return (
    <motion.nav
      key="footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="mt-24 bg-white
      "
    >
      <div className=" container mx-auto ">
        <div className="flex w-full justify-between overflow-auto px-3 py-6 text-black lg:flex-row">
          <div className="flex flex-row items-center justify-between space-x-8">
            <Link href="/">
              <Image
                className="pointer-events-auto"
                src="/logo.png"
                alt="webvisit360"
                width={50}
                height={50}
              />
            </Link>
            <img src="images/street_view_trusted.png" alt="webvisit360" width={150} height={50} />
          </div>
          <div>
            <div className="flex flex-row space-x-12 lg:flex-grow">
              <div className="my-auto hidden flex-col space-x-12 lg:block lg:flex-grow">
                <Link href="https://www.facebook.com/Webvisit360/">
                  Facebook
                </Link>
                <Link href="https://www.instagram.com/webvisit360/">
                  Instagram
                </Link>
                <Link href="https://kuula.co/profile/WEBVISIT360/collections">
                  Kuula
                </Link>
              </div>

              <Button href="/contact">Kontakt</Button>
            </div>
          </div>
        </div>
        <div className="block border-t-2">
          <div className="flex w-full justify-between overflow-auto px-3 py-1 text-black lg:flex-row">
            <div className="flex flex-row items-center space-x-4">
              <div className="text-xs">
                COPYRIGHT @ Agencija Sinhron d.o.o. Vse pravice pridržane.
              </div>
            </div>
            <div>
              <div className="flex flex-row space-x-12 lg:flex-grow">
                <div className="my-auto hidden flex-col space-x-12 lg:block lg:flex-grow">
                  <Link href="" className="text-xs">
                    Pogoji uporabe
                  </Link>
                  <Link href="" className="text-xs">
                    Piškotki
                  </Link>
                  <Link href="" className="text-xs">
                    Politika varstva zasebnosti
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
