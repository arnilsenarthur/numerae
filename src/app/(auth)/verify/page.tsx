import { Suspense } from "react";
import { AuthFormFallback } from "@/components/auth/auth-form-fallback";
import { VerifyForm } from "@/components/auth/verify-form";

export default function VerifyPage() {
  return (
    <Suspense fallback={<AuthFormFallback />}>
      <VerifyForm />
    </Suspense>
  );
}
