import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      plan: string;
      mfaEnrolled: boolean;
      mfaVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    plan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    plan?: string;
    mfaEnrolled?: boolean;
    mfaVerified?: boolean;
  }
}

declare module "next-auth/react" {
  interface Session {
    user: {
      id: string;
      role: string;
      plan: string;
      mfaEnrolled: boolean;
      mfaVerified: boolean;
    } & DefaultSession["user"];
  }
}
