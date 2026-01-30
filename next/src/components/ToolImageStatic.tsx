import Image from "next/image";

export default function ToolImageStatic({
  src,
  alt,
  className = "w-full h-full object-contain bg-black",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className="w-full h-full">
      <Image
        src={src}
        alt={alt}
        title={alt}
        className={className}
        width={160}
        height={160}
        sizes="160px"
        quality={70}
        loading="lazy"
      />
    </div>
  );
}

