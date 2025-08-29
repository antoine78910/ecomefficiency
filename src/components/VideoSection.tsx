
import { useEffect, useRef, useState } from 'react';

const VideoSection = () => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  // Pulse animation for the video border
  useEffect(() => {
    const interval = setInterval(() => {
      const border = document.querySelector('.video-border');
      if (border) {
        border.classList.add('pulse-bright');
        setTimeout(() => {
          border.classList.remove('pulse-bright');
        }, 1000);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 flex flex-col items-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gradient">
        Unlock 45+ Tools in One Click
      </h2>
      <p className="text-xl text-[#cfd3d8] mb-12 max-w-2xl text-center">
        Instant access to your full stack — without switching tabs or accounts
      </p>
      
      <div className="relative max-w-4xl w-full mx-auto">
        {/* Rotating light effect */}
        <div className="absolute -inset-4 rounded-lg">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-purple-500/50 to-transparent blur-sm animate-spin" style={{animationDuration: '3s'}}></div>
        </div>
        
        {/* Glowing border effect */}
        <div className="video-border absolute -inset-1 bg-gradient-to-r from-[#5c3dfa] to-[#7f62fe] rounded-lg blur-sm opacity-70 transition-all duration-300"></div>
        
        {/* Video player with controls */}
        <div className="relative z-10 rounded-lg overflow-hidden bg-black aspect-video">
          <div className="absolute inset-0 flex items-center justify-center">
            {!playing && (
              <button 
                onClick={handlePlayPause}
                className="w-20 h-20 rounded-full bg-[#5c3dfa]/80 flex items-center justify-center hover:bg-[#5c3dfa] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,3 20,12 6,21" />
                </svg>
              </button>
            )}
          </div>
          <video 
            ref={videoRef}
            onClick={handlePlayPause}
            className="w-full h-full object-cover"
            poster="https://placehold.co/800x450/202031/cfd3d8?text=Tools+Demo"
            controls={playing}
          >
            <source src="https://example.com/video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
