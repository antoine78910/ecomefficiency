
import { useEffect, useRef, useState } from 'react';

const logos = [
  { src: '/tools-logos/elevenlabs.png', alt: 'ElevenLabs' },
  { src: '/tools-logos/pipiads.png', alt: 'Pipiads' },
  { src: '/tools-logos/atria.png', alt: 'Atria' },
  { src: '/tools-logos/gpt.png', alt: 'GPT' },
  { src: '/tools-logos/helium.png', alt: 'Helium' },
  { src: '/tools-logos/sendshort.png', alt: 'SendShort' },
];

const LogoCarousel = () => {
  const carouselRef1 = useRef<HTMLDivElement>(null);
  const carouselRef2 = useRef<HTMLDivElement>(null);
  const carouselRef3 = useRef<HTMLDivElement>(null);
  
  const [isPaused1, setIsPaused1] = useState(false);
  const [isPaused2, setIsPaused2] = useState(false);
  const [isPaused3, setIsPaused3] = useState(false);

  useEffect(() => {
    const speed = 0.5;
    let animationFrameId: number;
    
    const animate = () => {
      if (carouselRef1.current && !isPaused1) carouselRef1.current.scrollLeft += speed;
      if (carouselRef2.current && !isPaused2) carouselRef2.current.scrollLeft -= speed;
      if (carouselRef3.current && !isPaused3) carouselRef3.current.scrollLeft += speed;
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused1, isPaused2, isPaused3]);

  const renderLogos = () => (
    logos.map((item, index) => (
      <div key={index} className="relative group mx-3 transition-transform duration-300 hover:scale-105 cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5c3dfa]/0 to-[#7f62fe]/0 group-hover:from-[#5c3dfa]/40 group-hover:to-[#7f62fe]/40 rounded-lg blur-md transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>
        <div className="relative z-10 w-16 h-16 md:w-20 md:h-20 bg-[#111114] rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#5c3dfa]/20 to-transparent"></div>
          <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
            <img 
              src={item.src}
              alt={item.alt}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    ))
  );

  return (
    <section className="py-12 md:py-20 overflow-hidden">
      <div className="container px-6 md:px-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-gradient">
          Trusted by Top Brands
        </h2>
      </div>
      
      <div 
        ref={carouselRef1} 
        className="flex overflow-x-hidden py-6 w-full"
        onMouseEnter={() => setIsPaused1(true)}
        onMouseLeave={() => setIsPaused1(false)}
      >
        <div className="flex">
          {renderLogos()}
          {renderLogos()}
          {renderLogos()}
        </div>
      </div>
      
      <div 
        ref={carouselRef2} 
        className="flex overflow-x-hidden py-6 w-full"
        onMouseEnter={() => setIsPaused2(true)}
        onMouseLeave={() => setIsPaused2(false)}
      >
        <div className="flex">
          {renderLogos()}
          {renderLogos()}
          {renderLogos()}
        </div>
      </div>
      
      <div 
        ref={carouselRef3} 
        className="flex overflow-x-hidden py-6 w-full"
        onMouseEnter={() => setIsPaused3(true)}
        onMouseLeave={() => setIsPaused3(false)}
      >
        <div className="flex">
          {renderLogos()}
          {renderLogos()}
          {renderLogos()}
        </div>
      </div>
    </section>
  );
};

export default LogoCarousel;
