/* eslint-disable @next/next/no-html-link-for-pages */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { MenuButton } from "./MenuButton";
export default function Nav({
  backgroundChange,
}: {
  backgroundChange: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bgIsActive, setBgIsActive] = backgroundChange
    ? useState(false)
    : useState(true);

  backgroundChange
    ? useEffect(() => {
        const handleScroll = () => {
          const scrollY = window.scrollY;
          const screenHeight = window.innerHeight;
          const threshold = screenHeight;

          if (scrollY >= threshold) {
            setBgIsActive(true);
          } else {
            setBgIsActive(false);
          }
        };
        window.addEventListener("scroll", handleScroll);
        return () => {
          window.removeEventListener("scroll", handleScroll);
        };
      }, [])
    : 0;

  return (
    <nav
      className={"pointer-events-none fixed top-0 z-40 w-full text-[#fefefe] transition duration-500 ease-in-out" + 
      (bgIsActive ? " bg-black/50 backdrop-blur-xl border-black border-b-1" : "") + 
      (dropdownOpen ? " pointer-events-auto" : " pointer-events-none")}
    >
      <div className="block lg:hidden">
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0 }}
          className={
            "fixed inset-0 z-40 w-full" 
          }
        >
          <div className={"fixed top-0 w-screen h-[88px] transition duration-500 ease-in-out" + (bgIsActive ? " bg-black/50 backdrop-blur-xl border-black border-b-1" : "")}>
          </div>
          <Link href="/" className="pointer-events-auto">
            <Image
              className={" absolute left-12 top-4"}
              src="/logo.png"
              alt="webvisit360"
              width={50}
              height={50}
            />
          </Link>
          {dropdownOpen && (
          <motion.div
            initial={{  opacity: 0 }}
            animate={{  opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
          >
              <div>
                <div className="absolute inset-0 right-0 w-full bg-black text-white"></div>
                <ul className="absolute grid w-full px-10 py-16">
                  <li className="border-b border-neutral-700 py-5">
                    <Link className="flex w-full" href="/streetview">
                      Google Street View
                    </Link>
                  </li>
                  <li className="border-b border-neutral-700 py-5">
                    <Link className="flex w-full" href="/photo">
                      Fotografija
                    </Link>
                  </li>
                  <li className="border-b border-neutral-700 py-5">
                    <Link className="flex w-full" href="/video">
                      Video
                    </Link>
                  </li>
                  <li className="border-b border-neutral-700 py-5">
                    <Link className="flex w-full" href="/about">
                      O nas
                    </Link>
                  </li>
                  <li className="border-b border-neutral-700 py-5">
                    <Link className="flex w-full" href="/contact">
                      Kontakt
                    </Link>
                  </li>
                </ul>
              </div>
          </motion.div>)}
          <MenuButton
            isOpen={dropdownOpen}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="pointer-events-auto absolute right-8 top-8 cursor-pointer leading-none outline-none focus:outline-none"
          />
        </motion.nav>
      </div>

      <div className="mx-6 hidden lg:block">
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
          </div>
          <div className={"lg:flex" + (dropdownOpen ? " flex" : " hidden")}>
            <div className="pointer-events-auto flex-col space-x-16 text-lg lg:flex-grow">
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
    </nav>
  );
}
