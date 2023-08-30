import { useState, useEffect } from "react";
import Image from "next/image";
import parallaxBackground from "../public/images/Fanuc1.png";

export default function Parallaxer({ children, initialImgOffset }) {
  const [accelerator, setAccelerator] = useState(0.2);
  const [imgOffset, setImgOffset] = useState(0);
  const handleScroll = () => setImgOffset(window.scrollY - initialImgOffset);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const attrsFlow = {
    ...(accelerator !== 0 && {
      style: { transform: `translateY(${imgOffset * accelerator}px)` },
    }),
  };

  return (
    <div className="relative">
      <div className={"relative h-[800px]  w-full"} {...attrsFlow}>
        <div className="flex h-[800px] w-screen items-center justify-center">
          {children}

          <Image
            src={parallaxBackground}
            className="-z-10 h-full translate-y-16 object-cover object-center"
            fill
            alt="Parallax Background"
          />
        </div>
      </div>
    </div>
  );
}
