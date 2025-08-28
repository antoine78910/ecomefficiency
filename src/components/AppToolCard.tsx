
import React from 'react';
import { Card } from "@/components/ui/card";

interface AppToolCardProps {
  name: string;
  description: string;
  image: string;
  category: string;
  colors: {
    baseColor: string;
    glowColor: string;
    gradientFrom: string;
    gradientTo: string;
  };
}

const AppToolCard = ({ name, description, image, category, colors }: AppToolCardProps) => {
  return (
    <div className="relative group">
      {/* Glow effect behind the card */}
      <div 
        className="absolute -inset-0.5 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-300 blur-md"
        style={{ 
          background: `linear-gradient(to bottom right, ${colors.baseColor}, transparent)`,
          zIndex: 0 
        }}
      />
      
      <Card 
        className="relative flex flex-col items-center p-6 h-full text-center cursor-pointer transition-all duration-300 overflow-hidden z-10 border border-white/10 hover:border-white/20"
        style={{
          background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Tool icon/image */}
        <div 
          className="w-20 h-20 mb-4 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(145deg, ${colors.gradientFrom}, ${colors.baseColor}30)`,
            boxShadow: `0 8px 16px -4px ${colors.glowColor}`
          }}
        >
          <img src={image} alt={name} className="w-12 h-12" />
        </div>
        
        {/* Tool name */}
        <h3 
          className="text-lg font-bold mb-1 group-hover:scale-105 transition-transform"
          style={{ color: colors.baseColor }}
        >
          {name}
        </h3>
        
        {/* Tool description */}
        <p className="text-sm text-[#cfd3d8]/70">
          {description}
        </p>
        
        {/* Category badge */}
        <span 
          className="absolute top-4 right-4 text-xs px-2 py-1 rounded-full capitalize"
          style={{ 
            backgroundColor: `${colors.baseColor}20`,
            color: colors.baseColor 
          }}
        >
          {category}
        </span>
      </Card>
    </div>
  );
};

export default AppToolCard;
