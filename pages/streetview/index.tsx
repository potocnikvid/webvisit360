import About from "../../components/About";
import References from "../../components/References";
import Head from "next/head";
import Layout from "../../components/Layout";

export default function StreetviewPage() {
  return (
    <>
      <Head>
        <title>webvisit360</title>
        <meta name="description" />
        <link rel="icon" href="/favicon/favicon-32x32.png" />
      </Head>
      <Layout navPadding="pt-36" page="streetview">
        <References />
        <About />
      </Layout>
    </>
  );
}
