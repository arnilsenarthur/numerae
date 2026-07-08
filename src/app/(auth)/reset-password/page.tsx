import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
