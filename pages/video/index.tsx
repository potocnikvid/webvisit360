import About from "../../components/About";
import Layout from "../../components/Layout";
import ImageComponent from "../../components/Image";

import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import Modal from "../../components/Modal";
import cloudinary from "../../utils/cloudinary";
import { getBase64ImageThumbnailUrl } from "../../utils/generateBlurPlaceholder";
import type { ImageProps, VideoProps } from "../../utils/types";
import { useLastViewedPhoto } from "../../utils/useLastViewedPhoto";
import VideoComponent from "../../components/Video";
import Parallaxer from "../../components/Parallax";
import OnViewOpenComponent from "../../components/OnViewOpen";

const VideoPage: NextPage = ({ videos }: { videos: VideoProps[] }) => {
  return (
    <>
      <Head>
        <title>webvisit360</title>
        <meta name="description" />
        <link rel="icon" href="/favicon/favicon-32x32.png" />
      </Head>
      <Layout navPadding="pt-36" page="video">
        <About />
        <Parallaxer initialImgOffset={700}>
          <div className="flex w-screen flex-col items-center justify-center space-y-16">
            <OnViewOpenComponent className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(60%)]">
              <div className="text-8xl text-[#f9b03e]/70">1</div>
              <div>
                <div className="mb-1 flex items-center justify-between space-x-2">
                  <div className="text-3xl text-slate-900">
                    Sastanak i procjena
                  </div>
                </div>
                <div className="hidden text-xl text-slate-500 md:block">
                  Za početak predlažemo neobavezujući sastanak putem platforme
                  Zoom, ili u prostorijama koje želite fotografirati. Odgovorimo
                  vam na sva pitanja, objasnimo sve detalje i procjenimo koliko
                  će to koštati
                </div>
              </div>
            </OnViewOpenComponent>
            <OnViewOpenComponent className="flex w-[calc(100%-4rem)] space-x-8 rounded border border-slate-200 bg-white p-4 shadow lg:w-[calc(60%)]">
              <div className="text-8xl text-[#f9b03e]/70">1</div>
              <div>
                <div className="mb-1 flex items-center justify-between space-x-2">
                  <div className="text-3xl text-slate-900">
                    Sastanak i procjena
                  </div>
                </div>
                <div className="hidden text-xl text-slate-500 md:block">
                  Za početak predlažemo neobavezujući sastanak putem platforme
                  Zoom, ili u prostorijama koje želite fotografirati. Odgovorimo
                  vam na sva pitanja, objasnimo sve detalje i procjenimo koliko
                  će to koštati (cijena ovisi o veličini prostora). Dogovorimo
                  termin fotografiranja i potpišemo ugovor o autorskim pravima.
                </div>
              </div>
            </OnViewOpenComponent>
          </div>
        </Parallaxer>
        <About />

        <div className="relative bg-black p-16">
          <div className="container mx-auto">
            <div className="columns-1 space-y-16 md:mx-4 md:columns-2 md:space-y-8">
              {videos.map(({ id, public_id, format, blurDataUrl }) => (
                <div key={id} className="mx-auto">
                  <VideoComponent
                    className="mx-auto transform rounded-md brightness-90 transition will-change-auto group-hover:brightness-110"
                    style={{ transform: "translate3d(0, 0, 0)" }}
                    src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/${public_id}.${format}`}
                    width={720}
                    height={480}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default VideoPage;

export async function getStaticProps() {
  const results = await cloudinary.v2.search
    .expression(`folder:${process.env.CLOUDINARY_FOLDER_VIDEO}/*`)
    .sort_by("public_id", "desc")
    .max_results(400)
    .execute();
  let reducedResults: VideoProps[] = [];
  let i = 0;
  for (let result of results.resources) {
    reducedResults.push({
      id: i,
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
    });
    i++;
  }

  const blurImagePromises = results.resources.map((video: VideoProps) => {
    return getBase64ImageThumbnailUrl(video);
  });
  const imagesWithBlurDataUrls = await Promise.all(blurImagePromises);

  for (let i = 0; i < reducedResults.length; i++) {
    reducedResults[i].blurDataUrl = imagesWithBlurDataUrls[i];
  }

  return {
    props: {
      videos: reducedResults,
    },
  };
}
