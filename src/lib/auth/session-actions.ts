"use server";

import { signIn, signOut } from "@/auth";
import {
  demoLoginAccounts,
  isDemoPasswordLoginEnabled,
} from "@/lib/demo-login";

/**
 * Demo-only role switch. Re-authenticates the browser session as another demo
 * account (member / manager / collaborator) and redirects back to the
 * dashboard. The target password is resolved server-side, so it never reaches
 * the client. No-op outside the dev demo-login mode.
 */
export async function switchDemoAccountAction(email: string) {
  if (!isDemoPasswordLoginEnabled) {
    return;
  }

  const account = demoLoginAccounts.find((item) => item.email === email);
  if (!account) {
    return;
  }

  await signIn("demo-credentials", {
    email: account.email,
    password: account.password,
    redirectTo: "/dashboard",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
