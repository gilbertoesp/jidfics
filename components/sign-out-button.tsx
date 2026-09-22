"use client";

import { LogOut } from "lucide-react";
import { signOutCurrent } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutCurrent} className="w-full">
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
