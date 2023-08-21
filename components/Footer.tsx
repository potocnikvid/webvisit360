/* eslint-disable @next/next/no-html-link-for-pages */
import React from "react";
import Link from "next/link";
import Image from "next/image";

import { motion } from "framer-motion";

export default function Footer() {
  const [navbarOpen, setNavbarOpen] = React.useState(false);

  return (
    <motion.nav
      key="footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-white
      "
    >
      <div className="mx-auto max-w-7xl w-full  overflow-auto  px-3 py-6 text-black lg:flex-row lg:items-center lg:justify-between flex flex-col">
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
          <button
            className="cursor-pointer px-3 leading-none outline-none focus:outline-none lg:hidden"
            type="button"
            aria-label="button"
            onClick={() => setNavbarOpen(!navbarOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#332b54"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className={"lg:flex" + (navbarOpen ? " flex" : " hidden")}>
          <div className="flex-col space-x-12 lg:flex-grow">
            <a href="/">Home</a>
            <a
              href="/"
              className="rounded-full bg-[#f9b03e] px-8 py-2.5 text-white decoration-2 underline-offset-2"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
