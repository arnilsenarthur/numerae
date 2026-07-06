import { Loader } from "@/components/ui/loader";

export function AuthFormFallback() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Loader label="Carregando..." />
    </div>
  );
}
