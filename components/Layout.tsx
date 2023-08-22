import Nav from "./Nav";
import Footer from "./Footer";

export default function Layout({children, classN, page}) {
  const backgroundChange = page === "home" ? true : false;
  return (
    <>
      <Nav backgroundChange={backgroundChange}/>
      <main className={"h-full w-full scrollbar bg-black scrollbar-thumb-gray-900 scrollbar-track-gray-100 " + classN} >
        {children}
      </main>
      <Footer />
    </>
  );
}
