import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
