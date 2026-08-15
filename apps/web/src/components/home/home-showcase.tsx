"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function HomeShowcase({
  children,
  className,
  flip = false,
}: {
  children: React.ReactNode;
  className?: string;
  flip?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={cn(
        "home-showcase",
        flip && "is-flip",
        visible && "is-in",
        className
      )}
    >
      {children}
    </section>
  );
}
