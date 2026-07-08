import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
