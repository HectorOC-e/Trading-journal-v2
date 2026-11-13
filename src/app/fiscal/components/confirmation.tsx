"use client";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function useFiscalConfirmation() {
  const [message, setMessage] = useState("");
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const confirm = (text: string) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setMessage(text);
    });
  const finish = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setMessage("");
  };
  const dialog = (
    <Dialog
      open={!!message}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <DialogContent>
        <DialogTitle>Confirmar operación fiscal</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
        <DialogFooter>
          <Button onClick={() => finish(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => finish(true)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return { confirm, dialog };
}
