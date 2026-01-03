import { generateAffiliateLinks } from '../services/affiliateService';

interface StoreButtonsProps {
  partName: string;
  className?: string;
}

export default function StoreButtons({ partName, className = '' }: StoreButtonsProps) {
  const links = generateAffiliateLinks(partName);

  return (
    <div className={`${className}`}>
      <span className="text-xs font-medium text-slate-400 block mb-2">Find:</span>
      <div className="flex items-center gap-1 flex-wrap">
        <a
          href={links.homeDepot}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-[9.8px] py-[5.25px] rounded text-sm bg-[#F96302] hover:bg-[#E85500] text-white font-medium transition-all transform hover:scale-105 active:scale-95 shadow-sm"
          title="Find at Home Depot"
        >
          <span>🏠</span>
          <span>Home Depot</span>
        </a>

        <a
          href={links.lowes}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-[9.8px] py-[5.25px] rounded text-sm bg-[#004990] hover:bg-[#003D7A] text-white font-medium transition-all transform hover:scale-105 active:scale-95 shadow-sm"
          title="Find at Lowe's"
        >
          <span>🔵</span>
          <span>Lowe's</span>
        </a>

        <a
          href={links.amazon}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-[9.8px] py-[5.25px] rounded text-sm bg-[#FF9900] hover:bg-[#FF8800] text-white font-medium transition-all transform hover:scale-105 active:scale-95 shadow-sm"
          title="Find on Amazon"
        >
          <span>📦</span>
          <span>Amazon</span>
        </a>

        <a
          href={links.walmart}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-[9.8px] py-[5.25px] rounded text-sm bg-[#0071CE] hover:bg-[#005FA3] text-white font-medium transition-all transform hover:scale-105 active:scale-95 shadow-sm"
          title="Find at Walmart"
        >
          <span>🛒</span>
          <span>Walmart</span>
        </a>
      </div>
    </div>
  );
}

