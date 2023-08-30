import OnViewOpenComponent from "./OnViewOpen";

export default function VideoComponent({
  style,
  className,
  src,
  width,
  height,
}) {
  return (
    <OnViewOpenComponent className={className}>
      <div className={className} style={style}>
        <video
          id="doc-player"
          controls
          muted
          className="cld-video-player cld-fluid"
          src={src}
          width={width}
          height={height}
        ></video>
      </div>
    </OnViewOpenComponent>
  );
}
