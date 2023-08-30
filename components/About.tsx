import OnViewOpenComponent from "./OnViewOpen";

export default function About() {

  return (
    <div className="bg-black">
    <div className="container relative px-8 mx-auto  my-8 pt-[8rem] pb-[8rem] flex lg:pb-[15rem] lg:pt-[15rem]">
      <OnViewOpenComponent className={""}>
      <p

        className=" text-white text-2xl lg:text-5xl z-20"
      >
        We are a multinational agency specialising in web design, web
        development and brand identity. We provide an exceptional experience for
        every website we make.
      </p>
      </OnViewOpenComponent>

    </div>
    </div>

  );
}
