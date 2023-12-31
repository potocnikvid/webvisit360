import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";

export default function OnViewOpenComponent({
  children,
  className,
  delay = 0.4,
  duration = 0.6,
  easing = [0.6, -0.05, 0.01, 0.99],
}) {
  const fadeIn = {
    visible: {
      opacity: 1,
      transition: { delay: delay, duration: duration, ease: easing },
    },
    hidden: { opacity: 0, transition: { duration: duration, ease: easing } },
  };

  const controls = useAnimation();
  const [ref, inView] = useInView();
  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      variants={fadeIn}
      className={className}
    >
      {children}
    </motion.div>
  );
}
