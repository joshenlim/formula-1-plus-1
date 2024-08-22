"use client";

import { useFormStatus } from "react-dom";
import { type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = ComponentProps<"button"> & {
  pendingText?: string;
};

export function SubmitButton({ children, pendingText, ...props }: Props) {
  const { pending, action } = useFormStatus();

  const isPending = pending && action === props.formAction;

  return (
    <button
      {...props}
      type="submit"
      className={cn(
        props.className,
        "flex items-center justify-center gap-x-4"
      )}
      aria-disabled={pending}
      disabled={isPending}
    >
      {isPending && <Loader2 size={16} className="animate-spin" />}
      {isPending ? pendingText : children}
    </button>
  );
}
