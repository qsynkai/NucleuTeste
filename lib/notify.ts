"use client";

import { toast } from "sonner";

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyError(message: string): void {
  toast.error(message);
}

export function notifyNetworkError(message = "Falha de rede. Tente novamente."): void {
  toast.error(message);
}
