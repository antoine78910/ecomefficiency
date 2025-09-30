
import React, { useEffect } from "react";

// Définition des catégories d'outils
const categories = [
  {
    name: "TEXT MODELS",
    color: "#5c3dfa",
    tools: [
      { name: "GPT & o4", price: "€20/month", icon: "/placeholder.svg" },
      { name: "Claude", price: "€20/month", icon: "/placeholder.svg" },
      { name: "Gemini", price: "€20/month", icon: "/placeholder.svg" },
      { name: "Mistral", price: "€15/month", icon: "/placeholder.svg" }
    ]
  },
  {
    name: "IMAGE MODELS",
    color: "#22c55e",
    tools: [
      { name: "Midjourney", price: "€10/month", icon: "/lovable-uploads/cd024e86-bb8c-447e-b283-f42db6425c97.png" },
      { name: "FLUX", price: "€10/month", icon: "/placeholder.svg" },
      { name: "Stable Diff.", price: "€10/month", icon: "/placeholder.svg" }
    ]
  },
  {
    name: "SPY TOOLS",
    color: "#8b5cf6",
    tools: [
      { name: "Dropispy", price: "€89/month", icon: "/lovable-uploads/3bfce176-a80e-4474-842f-67ea647ff078.png" },
      { name: "Helium 10", price: "€99/month", icon: "/lovable-uploads/c110a786-a32a-4f6c-8be2-26adfed37349.png" },
      { name: "Pipiads", price: "€69/month", icon: "/lovable-uploads/1d8b2371-fbba-4b34-9c47-e0187d139ccd.png" }
    ]
  },
  {
    name: "SEO TOOLS",
    color: "#3b82f6",
    tools: [
      { name: "Semrush", price: "€119/month", icon: "/lovable-uploads/89f92418-a253-4da9-9d21-f3762ca882d3.png" },
      { name: "Ubersuggest", price: "€69/month", icon: "/lovable-uploads/cbb253bf-cb3f-442c-b1df-fe41174b8017.png" },
      { name: "WooRank", price: "€59/month", icon: "/lovable-uploads/01907817-93f0-4991-9d69-d5c033f091bc.png" }
    ]
  },
  {
    name: "DESIGN TOOLS",
    color: "#ec4899",
    tools: [
      { name: "Flair.ai", price: "€59/month", icon: "/lovable-uploads/4e54e47d-2951-4972-a3be-c451cb2cf0d8.png" },
      { name: "Envato", price: "€79/month", icon: "/lovable-uploads/eec1f039-e6d8-4d31-8f23-9ed8356886bd.png" }
    ]
  }
];

const DynamicConnections = () => {
  // Animation pour l'effet de pulsation
  useEffect(() => {
    const animatePulses = () => {
      const pulses = document.querySelectorAll('.pulse-line');
      pulses.forEach((pulse, index) => {
        setTimeout(() => {
          pulse.classList.add('animate-pulse-line');
          setTimeout(() => {
            pulse.classList.remove('animate-pulse-line');
          }, 1500);
        }, index * 300);
      });
      
      // Répéter l'animation
      setTimeout(animatePulses, 4000);
    };
    
    animatePulses();
  }, []);
  
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 relative">
      <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gradient">
        Un outil qui combine tous vos abonnements
      </h2>
      
      <div className="max-w-5xl mx-auto relative">
        {/* Nœud central - Ecom Efficiency */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            {/* Effet lumineux */}
            <div className="absolute inset-0 bg-[#7f62fe] rounded-2xl blur-xl opacity-30 animate-pulse"></div>
            
            {/* Élément principal */}
            <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 bg-[#1a1a2e] rounded-2xl border border-[#5c3dfa]/30 flex items-center justify-center">
              <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                <img 
                  src="/lovable-uploads/deb301df-35ce-40ea-b4d5-e066b07a6bd8.png" 
                  alt="Ecom Efficiency Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-2 bg-gradient-to-r from-[#5c3dfa] to-[#7f62fe] text-white text-xs px-3 py-1 rounded-full transform translate-y-1/2">
                €10/month
              </div>
            </div>
          </div>
        </div>
        
        {/* Catégories d'outils et connexions */}
        {categories.map((category, catIndex) => {
          // Calculer les positions des catégories autour du cercle
          // Distribuer uniformément autour du cercle
          const totalCategories = categories.length;
          const angle = ((2 * Math.PI) / totalCategories) * catIndex - Math.PI / 2; // Commencer à midi
          const radius = 280; // Distance depuis le centre
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div 
              key={category.name}
              className="absolute z-10"
              style={{ 
                left: `calc(50% + ${x}px)`, 
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                width: '220px',
              }}
            >
              {/* Ligne de connexion avec effet de pulsation */}
              <div 
                className="pulse-line absolute h-0.5 bg-gradient-to-r from-[#5c3dfa] to-transparent opacity-60"
                style={{ 
                  width: `${radius}px`,
                  transform: `rotate(${(angle + Math.PI) * 180 / Math.PI}deg)`,
                  transformOrigin: 'left center',
                }}
              ></div>
              
              {/* Catégorie */}
              <div className="relative">
                {/* Effet lumineux */}
                <div 
                  className="absolute inset-0 rounded-xl blur-lg opacity-20"
                  style={{ backgroundColor: category.color }}
                ></div>
                
                {/* Titre de la catégorie */}
                <div 
                  className="relative z-10 bg-[#1a1a2e]/60 backdrop-blur-sm rounded-xl border p-2 mb-2 text-center"
                  style={{ borderColor: `${category.color}40` }}
                >
                  <h3 className="text-sm font-medium" style={{ color: category.color }}>
                    {category.name}
                  </h3>
                </div>
                
                {/* Outils de la catégorie */}
                <div className="space-y-2">
                  {category.tools.map((tool, i) => (
                    <div 
                      key={tool.name}
                      className="relative z-10 flex items-center gap-2 bg-[#1a1a2e]/60 backdrop-blur-sm rounded-lg border p-2"
                      style={{ borderColor: `${category.color}20` }}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(145deg, ${category.color}20, ${category.color}10)`,
                          boxShadow: `0 4px 8px -2px ${category.color}30`
                        }}
                      >
                        <img src={tool.icon} alt={tool.name} className="w-8 h-8 object-contain" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-xs font-medium">{tool.name}</p>
                        <p className="text-xs opacity-70">{tool.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-center mt-72 md:mt-96">
        <p className="text-lg text-gradient font-bold">
          Accès à +47 outils premium pour le prix d'un seul
        </p>
      </div>
    </section>
  );
};

export default DynamicConnections;
