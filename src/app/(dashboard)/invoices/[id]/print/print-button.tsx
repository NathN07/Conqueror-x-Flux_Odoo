"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
    >
      <Printer className="h-4 w-4" />
      Print Invoice
    </Button>
  );
}
