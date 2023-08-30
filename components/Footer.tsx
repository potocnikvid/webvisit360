/* eslint-disable @next/next/no-html-link-for-pages */
import React from "react";
import Link from "next/link";
import Image from "next/image";

import { motion } from "framer-motion";

export default function Footer() {
  return (
    <motion.nav
      key="footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-white
      "
    >
      <div className=" container mx-auto flex w-full overflow-auto px-3 py-6 text-black lg:flex-row justify-between">
        <div className="flex flex-row items-center justify-between">
          <div className="absolute">
            <Link href="/">
              <Image
                className="pointer-events-auto"
                src="/logo.png"
                alt="webvisit360"
                width={50}
                height={50}
              />
            </Link>
          </div>
        </div>
        <div>
          <div className="flex flex-row space-x-12 lg:flex-grow">
            <div className="hidden lg:block flex-col my-auto space-x-12 lg:flex-grow">
              <Link href="https://www.facebook.com/Webvisit360/">Facebook</Link>
              <Link href="https://www.instagram.com/webvisit360/">
                Instagram
              </Link>
              <Link href="https://kuula.co/profile/WEBVISIT360/collections">
                Kuula
              </Link>
            </div>

            <Link
              href="/contact"
              className="rounded-lg bg-[#f9b03e] px-8 py-2.5 text-white decoration-2 underline-offset-2"
            >
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
