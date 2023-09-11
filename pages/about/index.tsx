import Head from "next/head";
import Layout from "../../components/Layout";
import { Contact } from "../../components/Contact";
import About from "../../components/About";
import Slider from "../../components/Slider";
import FullSlider from "../../components/FullSlider";

import fs from 'fs';
import path from 'path';
import Brands from "../../components/Brands";


export const getStaticProps = async () => {
  const logosDirectory = path.join(process.cwd(), 'public/logos');
  const logos = fs.readdirSync(logosDirectory);

  return {
    props: {
      logos,
    },
  };
};

export default function AboutPage({ logos }) {
  const cards = [
    {
      img: "https://wik1.vercel.app/images/stock.jpg",
      name: "Phil Smith",
      text: "Phil is CEO of NINE4 and the company's founder. Before starting NINE4, he was a Senior Designer at Microsoft — where he helped to design product features used by millions of people. Outside work, Phil's calendar is mainly violin practice, listening to music, and meeting up with friends.",
    },
    {
      img: "https://wik1.vercel.app/images/stock.jpg",
      name: "Phil Smith",
      text: "Phil is CEO of NINE4 and the company's founder. Before starting NINE4, he was a Senior Designer at Microsoft — where he helped to design product features used by millions of people. Outside work, Phil's calendar is mainly violin practice, listening to music, and meeting up with friends.",
    },
    {
      img: "https://wik1.vercel.app/images/stock.jpg",
      name: "Phil Smith",
      text: "Phil is CEO of NINE4 and the company's founder. Before starting NINE4, he was a Senior Designer at Microsoft — where he helped to design product features used by millions of people. Outside work, Phil's calendar is mainly violin practice, listening to music, and meeting up with friends.",
    },
    {
      img: "https://wik1.vercel.app/images/stock.jpg",
      name: "Phil Smith",
      text: "Phil is CEO of NINE4 and the company's founder. Before starting NINE4, he was a Senior Designer at Microsoft — where he helped to design product features used by millions of people. Outside work, Phil's calendar is mainly violin practice, listening to music, and meeting up with friends.",
    },
    {
      img: "https://wik1.vercel.app/images/stock.jpg",
      name: "Phil Smith",
      text: "Phil is CEO of NINE4 and the company's founder. Before starting NINE4, he was a Senior Designer at Microsoft — where he helped to design product features used by millions of people. Outside work, Phil's calendar is mainly violin practice, listening to music, and meeting up with friends.",
    },
    {
      img: "https://wik1.vercel.app/images/stock.jpg",
      name: "Phil Smith",
      text: "Phil is CEO of NINE4 and the company's founder. Before starting NINE4, he was a Senior Designer at Microsoft — where he helped to design product features used by millions of people. Outside work, Phil's calendar is mainly violin practice, listening to music, and meeting up with friends.",
    }
  ]

  const cardsBig = [
    {
      img: "/images/slider1.jpg",
    },
    {
      img: "/images/slider2.jpg",
    }
  ]

  return (
    <>
      <Head>
        <title>webvisit360</title>
        <meta name="description" />
        <link rel="icon" href="/favicon/favicon-32x32.png" />
      </Head>
      <Layout navPadding="pt-36" page="contact">
        <About/>
        <Slider headline={"Meet the team"} cards={cards}/>
        <FullSlider cards={cardsBig}/>
        <Brands className={"pt-44"} logos={logos}/>
      </Layout>
    </>
  );
}