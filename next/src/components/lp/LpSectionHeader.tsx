import { cn } from "@/lib/utils";

export type LpSectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  centered?: boolean;
};

export default function LpSectionHeader({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  centered = false,
}: LpSectionHeaderProps) {
  return (
    <div className={cn(centered && "text-center", className)}>
      <h2
        className={cn(
          "text-3xl md:text-5xl font-bold text-white leading-tight",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-4 text-gray-300",
            centered && "max-w-3xl mx-auto",
            subtitleClassName,
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
