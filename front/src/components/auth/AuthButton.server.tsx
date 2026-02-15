import { SessionProvider } from "next-auth/react";
import { auth, BASE_PATH } from "@/auth";

import AuthButtonClient from "@/components/auth/AuthButton.client";

export default async function AuthButton() {
  const session = await auth();
  if (session?.user) {
    session.user = {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    };
  }

  return (
    <SessionProvider basePath={BASE_PATH} session={session}>
      <AuthButtonClient />
    </SessionProvider>
  );
}
