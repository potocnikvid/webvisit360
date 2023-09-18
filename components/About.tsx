import OnViewOpenComponent from "./OnViewOpen";

export default function About() {
  return (
    <div className="bg-black">
      <div className="container relative mx-auto  mb-16 flex px-8 py-36">
        <OnViewOpenComponent className={""}>
          <p className=" z-20 text-2xl text-white lg:text-5xl">
            We are a multinational agency specialising in web design, web
            development and brand identity. We provide an exceptional experience
            for every website we make.
          </p>
          <img
            src="images/street_view_trusted.png"
            alt=""
            className="mx-auto mt-24"
            width={300}
          />
        </OnViewOpenComponent>
      </div>
    </div>
  );
}
