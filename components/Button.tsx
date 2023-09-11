import Link from "next/link";

export default function Button({ href, children, className = "" }) {
  return (
    <Link href={href}>
      <button
        className={
          "rounded-lg bg-[#f9b03e] px-8 py-2.5 text-white hover:bg-[#f9b03e]/70" +
          className
        }
      >
        {children}
      </button>
    </Link>
  );
}
