import Nav from "./Nav";
import Footer from "./Footer";

export default function Layout({ children, classN, page }) {
  const backgroundChange = page === "home" ? true : false;
  return (
    <div>
      <Nav backgroundChange={backgroundChange} />
      <main
        className={
          "flex min-h-screen h-full w-full flex-col bg-black scrollbar scrollbar-track-gray-100 scrollbar-thumb-gray-900 " +
          classN
        }
      >
        <div className="flex-grow">{children}</div>
        <Footer />
      </main>
      
    </div>
  );
}
