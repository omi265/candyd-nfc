import Image, { type ImageProps } from "next/image";

export default function MediaImage(props: ImageProps) {
  const source = typeof props.src === "string" ? props.src : "";
  const requiresDirectBrowserRequest = source.startsWith("/api/media/") || source.startsWith("blob:");

  return (
    <Image
      {...props}
      alt={props.alt}
      unoptimized={props.unoptimized ?? requiresDirectBrowserRequest}
    />
  );
}
