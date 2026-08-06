import { Providers } from "@/components/providers";

export default function Setup2FALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
