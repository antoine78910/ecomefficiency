
const thumbnails = [
  {
    id: 1,
    title: "SECRET Tattoos Footballers Don't Talk About",
    views: "800,000+ views",
    imageUrl: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=2533&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "The $200 Billion MEGA Dam That Shattered All Records",
    views: "1,000,000+ views",
    imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?q=80&w=2574&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Surviving 365 Days in the Wilderness",
    views: "400,000+ views",
    imageUrl: "https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?q=80&w=2534&auto=format&fit=crop"
  },
  {
    id: 4,
    title: "Becoming A Millionaire - One Day",
    views: "500,000+ views",
    imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2670&auto=format&fit=crop"
  },
  {
    id: 5,
    title: "The Crash That Changed Formula 1 Forever",
    views: "800,000+ views",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2670&auto=format&fit=crop"
  },
  {
    id: 6,
    title: "The Most HORRIBLE TRAPS Used By The Roman Empire",
    views: "200,000+ views",
    imageUrl: "https://images.unsplash.com/photo-1599825129775-41d5a8e79b0b?q=80&w=2670&auto=format&fit=crop"
  }
];

const ThumbnailsShowcase = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
      {thumbnails.map((thumbnail) => (
        <div key={thumbnail.id} className="group relative overflow-hidden rounded-lg">
          <img 
            src={thumbnail.imageUrl} 
            alt={thumbnail.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
            <h3 className="text-white font-bold text-sm md:text-base">{thumbnail.title}</h3>
            <p className="text-gray-300 text-xs">{thumbnail.views}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThumbnailsShowcase;
