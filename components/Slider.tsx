/* eslint-disable react/no-unescaped-entities */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

function Arrow(props) {
  const disabled = props.disabled
    ? " arrow--disabled cursor-default"
    : "cursor-pointer";
  const transition = props.disabled
    ? "  opacity-50"
    : " transition ease-in duration-100 hover:scale-110";
  return (
    <div className={transition}>
      <svg
        onClick={props.onClick}
        className={`arrow ${
          props.left ? "arrow--left" : "arrow--right"
        } ${disabled}`}
        xmlns="http://www.w3.org/2000/svg"
        width={40}
        height={40}
        viewBox="0 0 24 24"
      >
        {props.left && (
          <path d="M16.67 0l2.83 2.829-9.339 9.175 9.339 9.167-2.83 2.829-12.17-11.996z" />
        )}
        {!props.left && (
          <path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z" />
        )}
      </svg>
    </div>
  );
}

export default function Slider({ headline, cards }) {
  let easing = [0.6, -0.05, 0.01, 0.99];
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const controls = useAnimation();
  const [ref, inView] = useInView();
  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
    breakpoints: {
      "(min-width: 400px)": {
        slides: { perView: 2, spacing: 5 },
      },
      "(min-width: 1000px)": {
        slides: { perView: 3, spacing: 10 },
      },
    },
    slides: { perView: 1 },
  });

  const fadeIn = {
    visible: {
      opacity: 1,
      transition: { delay: 0.4, duration: 0.6, ease: easing },
    },
    hidden: { opacity: 0, transition: { duration: 0.6, ease: easing } },
  };

  const list = {
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.3,
        delay: 0.4,
        duration: 0.6,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        when: "afterChildren",
        delay: 0.4,
        duration: 0.6,
      },
    },
  };

  const item = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  return (
    <div className="container mx-auto flex flex-col p-8">
      <div className="flex items-center justify-between">
        <div>
          <motion.h2
            ref={ref}
            animate={controls}
            initial="hidden"
            variants={fadeIn}
            className="text-3xl lg:text-5xl"
          >
            {headline}
          </motion.h2>
        </div>
        <motion.div
          ref={ref}
          animate={controls}
          initial="hidden"
          variants={fadeIn}
          className="flex h-7 space-x-5"
        >
          {loaded && instanceRef.current && (
            <>
              <Arrow
                left
                onClick={(e) =>
                  e.stopPropagation() || instanceRef.current?.prev()
                }
                disabled={currentSlide === 0}
              />

              <Arrow
                onClick={(e) =>
                  e.stopPropagation() || instanceRef.current?.next()
                }
                disabled={
                  currentSlide === instanceRef.current.track.details.maxIdx
                }
              />
            </>
          )}
        </motion.div>
      </div>
      <motion.div
        ref={ref}
        animate={controls}
        initial="hidden"
        variants={fadeIn}
      >
        <motion.div
          ref={ref}
          animate={controls}
          initial="hidden"
          variants={list}
        >
          <div ref={sliderRef} className="keen-slider mt-9">
            {cards.map((card, i) => (
              <motion.div variants={item} className="keen-slider__slide">
                <img src={card.img} />
                <h2 className="mt-4 text-lg">{card.headline}</h2>
                <p className="text-md mt-2">
                    {card.text}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
