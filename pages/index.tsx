import Head from "next/head";
import Landing from "../components/Landing";
import References from "../components/References";
import About from "../components/About";
import Layout from "../components/Layout";
import Timeline from "../components/Timeline";
import Zakaj from "../components/Zakaj";

export default function Home() {
  return (
    <>
      <Head>
        <title>webvisit360</title>
      </Head>
      <Layout navPadding="" page="home">
        <Landing />
        <Zakaj />
        <References />
        <About />
        <Timeline />
      </Layout>
    </>
  );
}
