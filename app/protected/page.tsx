import { InfoIcon } from "lucide-react";
import { Suspense } from "react";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";

// Force dynamic rendering since auth() accesses cookies
export const dynamic = "force-dynamic" as const;

async function UserDetails() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return JSON.stringify(session.user, null, 2);
}

export default async function ProtectedPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex-1 w-full flex flex-col gap-12 items-center justify-center">
        <div className="text-center">
          <h2 className="font-bold text-2xl mb-4">Not authenticated</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Please sign in to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <div className="flex items-center justify-between w-full">
          <h2 className="font-bold text-2xl mb-4">Your user details</h2>
          <SignOutButton />
        </div>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto w-full">
          <Suspense>
            <UserDetails />
          </Suspense>
        </pre>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div>
    </div>
  );
}
