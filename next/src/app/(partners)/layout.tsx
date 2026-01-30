import { Providers } from "../providers";
import SupabaseSessionGuard from "@/components/SupabaseSessionGuard";

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SupabaseSessionGuard />
      {children}
    </Providers>
  );
}

