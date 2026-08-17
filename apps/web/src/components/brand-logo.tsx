import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  /** show wordmark text beside the mark */
  withWordmark?: boolean;
  /** mark size in px */
  size?: "sm" | "md";
  priority?: boolean;
};

export function BrandLogo({
  href = "/",
  className,
  withWordmark = true,
  size = "md",
  priority = false,
}: BrandLogoProps) {
  const markClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textClass =
    size === "sm"
      ? "font-display text-lg font-bold tracking-tight text-ink"
      : "font-display text-xl font-bold tracking-tight text-ink";

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/mark-light.png"
        alt=""
        width={32}
        height={32}
        className={cn(markClass, "object-contain dark:hidden")}
        priority={priority}
      />
      <Image
        src="/brand/mark-dark.png"
        alt=""
        width={32}
        height={32}
        className={cn(markClass, "hidden object-contain dark:block")}
        priority={priority}
      />
      {withWordmark && <span className={textClass}>HostingIt</span>}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="HostingIt home">
      {content}
    </Link>
  );
}
