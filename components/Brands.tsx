import OnViewOpenComponent from "./OnViewOpen";

export default function Brands({ logos, className = "" }) {
  return (
    <div className={className}>
      <div className="container mx-auto w-full bg-white px-6 py-20">
        <div className="flex flex-wrap items-center justify-center md:hidden">
          {logos.map((logo, index) =>
            index < 40 ? (
              <a className="mx-4  py-5">
                <img
                  src={`/logos/${logo}`}
                  alt={`Logo ${index + 1}`}
                  className="h-10 w-full"
                />
              </a>
            ) : (
              <></>
            )
          )}
        </div>
        <div className="hidden flex-wrap items-center justify-center md:flex lg:hidden ">
          {logos.map((logo, index) =>
            index < 60 ? (
              <a className="mx-4 py-5">
                <img
                  src={`/logos/${logo}`}
                  alt={`Logo ${index + 1}`}
                  className="h-10 w-full"
                />
              </a>
            ) : (
              <></>
            )
          )}
        </div>

        <div className="hidden flex-wrap items-center justify-center lg:flex">
          {logos.map((logo, index) => (
            <a className="mx-4 py-5">
              <img
                src={`/logos/${logo}`}
                alt={`Logo ${index + 1}`}
                className="h-10 w-full 2xl:h-12"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
