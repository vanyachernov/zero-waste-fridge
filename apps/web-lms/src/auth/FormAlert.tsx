import { AlertCircle } from "lucide-react";

export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md bg-error-container px-3 py-2.5 text-xs font-medium text-on-error-container">
      <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
      {message}
    </div>
  );
}
