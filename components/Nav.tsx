/* eslint-disable @next/next/no-html-link-for-pages */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
export default function Nav() {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const screenHeight = window.innerHeight;
      const threshold = screenHeight;

      if (scrollY >= threshold) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed top-0 z-40 w-full text-[#fefefe] transition duration-500 ease-in-out ${
        isActive ? "bg-black bg-opacity-70" : ""
      }`}
    >
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mx-auto flex max-w-3xl justify-between px-6 py-4 lg:hidden"
      >
        <Link href="/">
          <Image
            className="pointer-events-auto"
            src="/logo.png"
            alt="webvisit360"
            width={60}
            height={60}
          />
        </Link>
        <div className="p-6">{/* <Dropdown /> */}</div>
      </motion.nav>
      <div className="hidden px-4 lg:block">
        <motion.nav
          key="nav"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mx-auto flex max-w-7xl flex-col overflow-auto px-3 py-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-row items-center justify-between">
            <Link href="/" className="">
              <Image
                className="pointer-events-auto"
                src="/logo.png"
                alt="webvisit360"
                width={70}
                height={70}
              />
            </Link>

            {/* <button
                    className="cursor-pointer px-3 leading-none outline-none focus:outline-none lg:hidden pointer-events-auto"
                    type="button"
                    aria-label="button"
                    onClick={() => setNavbarOpen(!navbarOpen)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button> */}
          </div>
          <div className={"lg:flex" + (navbarOpen ? " flex" : " hidden")}>
            <div className="pointer-events-auto flex-col space-x-16 text-lg lg:flex-grow">
              <Link href="/">Domov</Link>
              <Link href="/streetview">Google Street View</Link>
              <Link href="/photo">Fotografija</Link>
              <Link href="/video">Video</Link>
              <Link href="/about">O nas</Link>
              <Link
                href="/contact"
                className="rounded-full bg-[#f9b03e] px-8 py-2.5 decoration-2 underline-offset-2"
              >
                Kontakt
              </Link>
            </div>
          </div>
        </motion.nav>
      </div>
    </div>
  );
}
