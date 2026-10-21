import Image from "next/image";

/** 40x52 cover thumbnail for the data tables; a sand block when the product has no photo. */
export function ProductThumb({ src, name }: { src: string | null; name: string }) {
  if (src === null) return <div aria-hidden="true" className="h-[52px] w-10 shrink-0 bg-sand" />;
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={52}
      sizes="40px"
      className="h-[52px] w-10 shrink-0 object-cover"
    />
  );
}
