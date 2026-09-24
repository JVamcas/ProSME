"use client";

import {
  Toaster as SonnerToaster,
  toast,
  type ToasterProps,
} from "sonner";

export { toast };

export function Toast({
  closeButton = true,
  position = "top-right",
  richColors = true,
  ...props
}: ToasterProps) {
  return (
    <SonnerToaster
      closeButton={closeButton}
      position={position}
      richColors={richColors}
      {...props}
    />
  );
}
