import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TIPS = [
  {
    title: "Check Your HVAC Filter",
    content: "Replace or clean your HVAC filter every 1-3 months. A dirty filter reduces efficiency and can cause your system to work harder, leading to higher energy bills and potential breakdowns."
  },
  {
    title: "Test Smoke Detectors Monthly",
    content: "Press the test button on all smoke detectors once a month. Replace batteries at least once a year, or immediately if the low-battery chirp sounds."
  },
  {
    title: "Inspect Gutters Seasonally",
    content: "Clean gutters in spring and fall to prevent water damage. Check for loose or damaged sections and ensure downspouts direct water away from your foundation."
  },
  {
    title: "Check for Water Leaks",
    content: "Regularly inspect under sinks, around toilets, and near water heaters for signs of leaks. Early detection can prevent costly water damage and mold growth."
  },
  {
    title: "Maintain Your Water Heater",
    content: "Drain a few gallons from your water heater every 6 months to remove sediment buildup. This extends its lifespan and improves efficiency."
  },
  {
    title: "Seal Windows and Doors",
    content: "Check weatherstripping around windows and doors annually. Replace worn seals to improve energy efficiency and reduce heating/cooling costs."
  }
];

function getDailyTip() {
  // Use date to get a consistent tip for the day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return TIPS[dayOfYear % TIPS.length];
}

interface HomeProps {
  onViewChange: (view: string) => void;
}

export default function Home({ onViewChange }: HomeProps) {
  const { profile } = useAuth();
  const tip = useMemo(() => getDailyTip(), []);

  const firstName = profile?.firstName || 'Hero';
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-2xl p-8 shadow-xl">
        <h2 className="text-3xl font-black text-white mb-2">Welcome Back, {firstName}!</h2>
        <p className="text-orange-100 text-lg">Ready to tackle your next home repair challenge?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onViewChange('scanner')}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-orange-500 hover:bg-slate-700 transition-all text-left cursor-pointer group"
        >
          <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">🚨 Issue Help with Fixit Hero</h4>
          <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">Use Fixit Hero's image and/or text analysis to identify issues, parts and get instant fix instructions.</p>
        </button>
        <button
          onClick={() => onViewChange('checklist')}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-orange-500 hover:bg-slate-700 transition-all text-left cursor-pointer group"
        >
          <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">✅ Maintenance Checklist</h4>
          <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">Track your home maintenance tasks and never miss an important upkeep item.</p>
        </button>
      </div>
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">💡</span>
          <h3 className="text-2xl font-bold text-orange-400">Quick Tip of the Day</h3>
        </div>
        <h4 className="text-xl font-semibold text-white mb-3">{tip.title}</h4>
        <p className="text-slate-300 leading-relaxed">{tip.content}</p>
      </div>
    </div>
  );
}

