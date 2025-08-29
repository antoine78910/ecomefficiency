import AppTopNav from "@/components/AppTopNav";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-app min-h-screen bg-black text-white flex">
      <main className="flex-1 flex flex-col min-h-screen">
        <AppTopNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}


