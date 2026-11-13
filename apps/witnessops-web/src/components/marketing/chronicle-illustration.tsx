import Image from "next/image";
import type { ChronicleIllustration as Illustration } from "@/lib/chronicle-illustrations";

export function ChronicleIllustration({ image }: { image: Illustration }) {
  return (
    <figure className="my-10" data-chronicle-illustration={image.src}>
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(max-width: 808px) calc(100vw - 48px), 760px"
        className="h-auto w-full border border-surface-border"
      />
      <figcaption className="wo-small mt-3 text-text-muted">{image.caption}</figcaption>
    </figure>
  );
}
