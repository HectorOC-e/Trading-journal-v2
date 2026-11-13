"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="p-6 space-y-3">
      <p>No se pudo cargar el módulo fiscal.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
