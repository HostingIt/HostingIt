import { Providers } from "@/components/providers";

export default function Login2FALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
