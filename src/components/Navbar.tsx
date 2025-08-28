
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";
import Image from "next/image";

const Navbar = () => {
  const isAppPage = false;
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <nav className="py-4 px-6 md:px-12 flex items-center justify-between z-10 relative backdrop-blur-xl bg-[#202031]/50 border border-[#5c3dfa]/40 rounded-xl mx-4 mt-4 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="w-auto h-20 md:h-24 relative">
          <img 
            src="/lovable-uploads/deb301df-35ce-40ea-b4d5-e066b07a6bd8.png" 
            alt="Ecom Efficiency Logo" 
            className="h-full object-contain"
          />
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-8">
        <button 
          onClick={() => scrollToSection('features')} 
          className="text-[#cfd3d8] hover:text-white transition-colors cursor-pointer"
        >
          Features
        </button>
        <button 
          onClick={() => scrollToSection('pricing')} 
          className="text-[#cfd3d8] hover:text-white transition-colors cursor-pointer"
        >
          Pricing Plans
        </button>
        <NavLink href="#">Discord</NavLink>
      </div>
      
      <div className="flex items-center gap-4">
        {!isAppPage && (
          <>
            <Button variant="outline" className="hidden md:flex border-[#5c3dfa]/30 text-[#cfd3d8] hover:bg-[#7f62fe]/20">Log In</Button>
            <Link href="/app" className="hidden md:block">
              <Button variant="outline" className="border-[#5c3dfa]/30 text-[#cfd3d8] hover:bg-[#7f62fe]/20">Dashboard</Button>
            </Link>
            <Button className="bg-[#5c3dfa] hover:bg-[#5c3dfa]/90 text-primary-foreground rounded-full">Get Access Now</Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none">
              <Image src="/favicon.png" alt="Account" width={32} height={32} className="rounded-full border border-[#8B5CF6]/40" />
              <span className="hidden md:inline text-[#cfd3d8]">Account</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#202031]/95 backdrop-blur-xl border-[#5c3dfa]/40 text-white">
            <div className="px-3 py-2 text-sm font-medium border-b border-[#5c3dfa]/20">
              Bienvenue Antoine!
            </div>
            <DropdownMenuItem className="hover:bg-[#5c3dfa]/20 focus:bg-[#5c3dfa]/20 cursor-pointer">
              <Link href="/app" className="flex items-center gap-2 w-full">
                Mon Productify
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#5c3dfa]/20 focus:bg-[#5c3dfa]/20 cursor-pointer">
              <Link href="/app/tools" className="flex items-center gap-2 w-full">
                Générer du contenu
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#5c3dfa]/20 focus:bg-[#5c3dfa]/20 cursor-pointer">
              <Link href="/account" className="flex items-center gap-2 w-full">
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#5c3dfa]/20 focus:bg-[#5c3dfa]/20 cursor-pointer">
              <Link href="#" className="flex items-center gap-2 w-full text-red-400">
                <LogOut size={16} />
                Se déconnecter
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
  return (
    <a href={href} className="text-[#cfd3d8] hover:text-white transition-colors">
      {children}
    </a>
  );
};

export default Navbar;
