"use client";

import { Github } from "lucide-react";
import { signInWithGithub } from "@/lib/auth/actions";

export function SignInButton() {
  return (
    <form action={signInWithGithub} className="w-full">
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors"
      >
        <Github className="h-5 w-5" aria-hidden="true" />
        Continue with GitHub
      </button>
    </form>
  );
}
