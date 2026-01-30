import { Providers } from "../providers";
import SupabaseSessionGuard from "@/components/SupabaseSessionGuard";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SupabaseSessionGuard />
      {children}
    </Providers>
  );
}

