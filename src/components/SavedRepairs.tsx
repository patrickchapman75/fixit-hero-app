import { useState, useEffect } from 'react';
import { getSavedRepairs, deleteRepair, SavedRepair } from '../services/repairService';
import { History, Trash2, Wrench, ListChecks } from 'lucide-react';

export default function SavedRepairs() {
  const [repairs, setRepairs] = useState<SavedRepair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepairs();

    // Listen for repair saved/deleted events
    const handleRepairUpdate = () => loadRepairs();
    window.addEventListener('repairSaved', handleRepairUpdate);
    window.addEventListener('repairDeleted', handleRepairUpdate);

    return () => {
      window.removeEventListener('repairSaved', handleRepairUpdate);
      window.removeEventListener('repairDeleted', handleRepairUpdate);
    };
  }, []);

  const loadRepairs = async () => {
    setLoading(true);
    const data = await getSavedRepairs();
    setRepairs(data);
    setLoading(false);
  };

  const handleDelete = async (repairId: string) => {
    if (confirm('Are you sure you want to delete this repair?')) {
      const success = await deleteRepair(repairId);
      if (success) {
        setRepairs(prev => prev.filter(r => r.id !== repairId));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading repairs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <History className="w-8 h-8 text-orange-400" />
          <h2 className="text-2xl font-bold text-orange-400">Hero Reports</h2>
        </div>
        <p className="text-slate-400">Your repair history and diagnoses</p>
      </div>

      {/* Repairs List */}
      {repairs.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
          <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No hero reports yet</p>
          <p className="text-slate-500 text-sm mt-2">
            Start a diagnosis in Issue Help and save it to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {repairs.map((repair) => (
            <div
              key={repair.id}
              className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-orange-500 transition-colors"
            >
              {/* Header with Title and Delete */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {repair.title}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {new Date(repair.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(repair.id)}
                  className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-900 transition-colors"
                  title="Delete repair"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {/* Summary */}
              <div className="bg-slate-900 rounded-lg p-4 mb-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  {repair.summary}
                </p>
              </div>

              {/* Parts, Tools, and Steps */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Parts Needed */}
                {repair.parts_needed.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-blue-400" />
                      <h4 className="font-semibold text-blue-400 text-sm">
                        Parts Needed ({repair.parts_needed.length})
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {repair.parts_needed.map((part, idx) => (
                        <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>{part}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tools Needed */}
                {repair.tools_needed && repair.tools_needed.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4 text-green-400" />
                      <h4 className="font-semibold text-green-400 text-sm">
                        Tools Needed ({repair.tools_needed.length})
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {repair.tools_needed.map((tool, idx) => (
                        <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>{tool}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Repair Steps */}
              {repair.steps.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4 text-orange-400" />
                    <h4 className="font-semibold text-orange-400 text-sm">
                      Repair Steps ({repair.steps.length})
                    </h4>
                  </div>
                  <ol className="space-y-2">
                    {repair.steps.map((step, idx) => (
                      <li key={idx} className="text-slate-300 text-sm flex gap-2">
                        <span className="text-orange-400 font-semibold">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

