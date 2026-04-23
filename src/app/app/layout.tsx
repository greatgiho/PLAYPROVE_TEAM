import { AppAuthGate } from "@/app/app/AppAuthGate";
import { AppShell } from "@/components/AppShell";

export default function ErpAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  );
}
