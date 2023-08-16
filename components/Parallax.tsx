import { useState, useEffect } from "react";
import Image from "next/image";
import StaticallyImportedImage from "../public/images/Fanuc1.png";

/*  add tp Parallaxer.main: className={styles['showRender']}
    and turn on React Dev Tool 'Highlight updates when components render.'
    to show rerender is on the wrapper, not the image
    */
export default function Parallaxer({initialImgOffset}) {
  return (
    <main>
      <ImgWrapper initialImgOffset={initialImgOffset}>
        <ImgItem />
      </ImgWrapper>
    </main>
  );
}

/*  You don't need this to be in it's own component. We left this like so in case you have a more complex need.
    We originally did this to make really clear, via the console.log, when each part was rendering while we experimented.
    */
const ImgItem = () => {
  console.log("The child (image) is rendered!");
  return (
    <Image
      src={StaticallyImportedImage}
      className="object-cover object-center h-full"
      fill
      alt="Peacock with tail fanned out."
    />
  );
};

/*  Isolating the re-rendering activity to hopefully speed things up a little.
 */
const ImgWrapper = ({ children, initialImgOffset}) => {
  const [accelerator, setAccelerator] = useState(0.42);
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
    <>
      <div className={"relative h-[900px] -mb-[300px] w-full"} {...attrsFlow}>
        {children}
      </div>
    </>
  );
};
