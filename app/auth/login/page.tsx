import { LoginForm } from "@/components/login-form";
import { SignInButton } from "@/components/sign-in-button";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
        <div className="mt-6">
          <Separator>Or continue with</Separator>
          <div className="mt-4">
            <SignInButton />
          </div>
        </div>
      </div>
    </div>
  );
}
