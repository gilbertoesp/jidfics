"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGithub() {
  await signIn("github", { redirectTo: "/protected" });
}

export async function signOutCurrent() {
  await signOut({ redirectTo: "/" });
}
