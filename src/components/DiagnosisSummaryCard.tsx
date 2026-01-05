import { CheckCircle2, Wrench, ListChecks, Plus, Minus, Trash2 } from 'lucide-react';
import StoreButtons from './StoreButtons';

interface DiagnosisResult {
  title: string;
  summary: string;
  parts_needed: string[];
  tools_needed: string[];
  steps: string[];
}

interface DiagnosisSummaryCardProps {
  diagnosisResult: DiagnosisResult;
  partsQuantities: Record<string, number>;
  onUpdateQuantity: (item: string, quantity: number) => void;
  onRemovePart: (part: string) => void;
  onAddToShoppingList: () => void;
  partsAdded: string[];
}

export default function DiagnosisSummaryCard({
  diagnosisResult,
  partsQuantities,
  onUpdateQuantity,
  onRemovePart,
  onAddToShoppingList,
  partsAdded
}: DiagnosisSummaryCardProps) {
  return (
    <div className="bg-gradient-to-br from-orange-900/30 to-slate-800 rounded-2xl p-6 border-2 border-orange-500/50 shadow-2xl">
      {/* Header with Icon */}
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-orange-600 rounded-full p-2 flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-orange-400 mb-2">
            Diagnosis Complete
          </h3>
          <h4 className="text-xl font-semibold text-white">
            {diagnosisResult.title}
          </h4>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
        <p className="text-slate-300 leading-relaxed">
          {diagnosisResult.summary}
        </p>
      </div>

      {/* Parts Needed */}
      {diagnosisResult.parts_needed.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-blue-400" />
            <h5 className="text-lg font-bold text-blue-400">
              🔧 Parts ({diagnosisResult.parts_needed.length})
            </h5>
          </div>
          <div className="space-y-3">
            {diagnosisResult.parts_needed.map((part: string, index: number) => (
              <div key={`part-${index}`} className="relative p-4 bg-slate-900 rounded-xl border border-slate-700">
                <button
                  onClick={() => onRemovePart(part)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  title="Remove this part"
                >
                  <Trash2 size={14} />
                </button>
                <div className="flex items-center justify-between mb-2 pr-8">
                  <h4 className="text-white font-semibold">{part}</h4>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 mr-1">Qty: </span>
                    <button
                      onClick={() => {
                        const currentQuantity = partsQuantities[part] || 1;
                        onUpdateQuantity(part, Math.max(1, currentQuantity - 1));
                      }}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                      disabled={(partsQuantities[part] || 1) <= 1}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm text-slate-300 min-w-[20px] text-center">{partsQuantities[part] || 1}</span>
                    <button
                      onClick={() => {
                        const currentQuantity = partsQuantities[part] || 1;
                        onUpdateQuantity(part, currentQuantity + 1);
                      }}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <StoreButtons partName={part} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tools Needed */}
      {diagnosisResult.tools_needed.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-5 h-5 text-green-400" />
            <h5 className="text-lg font-bold text-green-400">
              🛠️ Tools ({diagnosisResult.tools_needed.length})
            </h5>
          </div>
          <div className="space-y-3">
            {diagnosisResult.tools_needed.map((tool: string, index: number) => (
              <div key={`tool-${index}`} className="relative p-4 bg-slate-900 rounded-xl border border-slate-700">
                <button
                  onClick={() => onRemovePart(tool)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  title="Remove this tool"
                >
                  <Trash2 size={14} />
                </button>
                <div className="flex items-center justify-between mb-2 pr-8">
                  <h4 className="text-white font-semibold">{tool}</h4>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 mr-1">Qty: </span>
                    <button
                      onClick={() => {
                        const currentQuantity = partsQuantities[tool] || 1;
                        onUpdateQuantity(tool, Math.max(1, currentQuantity - 1));
                      }}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                      disabled={(partsQuantities[tool] || 1) <= 1}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm text-slate-300 min-w-[20px] text-center">{partsQuantities[tool] || 1}</span>
                    <button
                      onClick={() => {
                        const currentQuantity = partsQuantities[tool] || 1;
                        onUpdateQuantity(tool, currentQuantity + 1);
                      }}
                      className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <StoreButtons partName={tool} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repair Steps */}
      {diagnosisResult.steps.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-orange-400" />
            <h5 className="text-lg font-bold text-orange-400">Repair Steps</h5>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <ol className="space-y-3">
              {diagnosisResult.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-white">
                  <span className="flex-shrink-0 bg-orange-600 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Add to Shopping List */}
      {diagnosisResult.parts_needed.length > 0 && partsAdded.length === 0 && (
        <div className="mb-6">
          <button
            onClick={onAddToShoppingList}
            className="w-full bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span>🛒</span>
            Add {diagnosisResult.parts_needed.length + diagnosisResult.tools_needed.length} {diagnosisResult.parts_needed.length + diagnosisResult.tools_needed.length === 1 ? 'Item' : 'Items'} to Shopping List
          </button>
        </div>
      )}

      {partsAdded.length > 0 && (
        <div className="mb-6 bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
          <span className="text-green-400 font-semibold">✓ Added to Shopping List!</span>
        </div>
      )}

      {/* Report Generated Message */}
      <div className="w-full bg-green-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2">
        <CheckCircle2 className="w-5 h-5" />
        Hero Report Generated & Saved!
      </div>
    </div>
  );
}

