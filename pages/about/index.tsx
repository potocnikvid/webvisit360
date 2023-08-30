import Head from "next/head";
import Layout from "../../components/Layout";
import { Contact } from "../../components/Contact";
import About from "../../components/About";
import Team from "../../components/Team";

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>webvisit360</title>
        <meta name="description" />
        <link rel="icon" href="/favicon/favicon-32x32.png" />
      </Head>
      <Layout classN="pt-36" page="contact">
        <About/>
        <Team/>
      </Layout>
    </>
  );
}