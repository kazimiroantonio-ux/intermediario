import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), twoFactorClient(), phoneNumberClient()],
});