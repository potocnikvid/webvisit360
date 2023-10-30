import React, { useEffect } from "react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="relative mb-16 lg:mb-32 flex h-screen w-screen items-center justify-center overflow-hidden">
      <div className="pointer-events-none z-30 w-full p-5 sm:w-4/5 lg:w-2/3">
        <div className="mx-auto mb-[6rem] mt-24 justify-center space-y-3 pt-4 text-center md:px-6 lg:mb-[14.5rem] lg:mt-[11rem] lg:space-y-6">
          <motion.h1
            key="headline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="select-none text-4xl text-white xl:text-6xl"
          >
            Omogočite interaktivni <br className="hidden  lg:flex" />
            spletni obisk v 3D tehniki
          </motion.h1>
          <motion.p
            key="subheadline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="text-md  basiersquare-medium select-none text-white xl:text-xl"
          >
            Interaktivni pogled s klikom miške
          </motion.p>
          <motion.a
            href="#references"
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.4, delay: 1 }}
            className="pointer-events-auto absolute inset-x-0 bottom-24 mx-auto block w-24 select-none px-6 py-3 md:bottom-0"
          >
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="mx-auto h-16 w-16 animate-bounce text-white md:h-20 md:w-20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </motion.a>
        </div>
      </div>
      <iframe
        className="ku-embed absolute h-screen w-screen"
        src="https://www.google.com/maps/embed?pb=!4v1669493840616!6m8!1m7!1sCAoSLEFGMVFpcFBjLU1pTU9IQi1BM3J5RHkxQUQxVnBYbmtMRTEyd3ZLLV9QNUN3!2m2!1d46.07527017919635!2d14.48439221530951!3f55.82!4f1.8299999999999983!5f0.7820865974627469"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>
  );
}
