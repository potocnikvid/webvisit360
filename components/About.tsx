import OnViewOpenComponent from "./OnViewOpen";

export default function About() {
  return (
    <div className="bg-black">
      <div className="container relative mx-auto  mb-16 flex px-8 py-36">
        <OnViewOpenComponent className={""}>
          <p className=" z-20 text-2xl text-white lg:text-5xl">
            Mi smo Google certificirani strokovnjaki za izdelavo virtualnih ogledov in 360° fotografij. 
          </p>
          <img
            src="images/trusted-white.png"
            alt=""
            className="mx-auto mt-24"
          />
        </OnViewOpenComponent>
      </div>
    </div>
  );
}
