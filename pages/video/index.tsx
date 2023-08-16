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

const Videography: NextPage = ({ videos }: { videos: VideoProps[] }) => {
  const router = useRouter();
  const { photoId } = router.query;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // This effect keeps track of the last viewed photo in the modal to keep the index page in sync when the user navigates back
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);
  return (
    <>
      <Head>
        <title>webvisit360</title>
        <meta name="description" />
        <link rel="icon" href="/favicon/favicon-32x32.png" />
      </Head>
      <Layout classN="pt-36">
        <About/>
        <Parallaxer initialImgOffset={700}/>

        <div className="relative z-20 bg-black">
          <div className="mx-auto max-w-[1960px] p-4">
            {photoId && (
              <Modal
                subpage={"video"}
                images={videos}
                onClose={() => {
                  setLastViewedPhoto(photoId);
                }}
              />
            )}
            <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 ">
              {videos.map(({ id, public_id, format, blurDataUrl }) => (
                <div key={id}>
                  <VideoComponent
                    className="transform rounded-md brightness-90 transition will-change-auto group-hover:brightness-110"
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

export default Videography;

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
