import Image from "next/image";
import OnViewOpenComponent from "./OnViewOpen";

export default function ImageComponent({
  src,
  width,
  height,
  className,
  alt,
  style,
  placeholder,
  blurDataURL,
  sizes,
}) {
  return (
    <OnViewOpenComponent className={""}>
      <Image
        sizes={sizes}
        blurDataURL={blurDataURL}
        placeholder={placeholder}
        style={style}
        className={className}
        src={src}
        alt={alt}
        width={width}
        height={height}
      />
    </OnViewOpenComponent>
  );
}
