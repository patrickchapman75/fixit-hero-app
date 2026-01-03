import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { analyzeImage, analyzeImageWithDescription, analyzeTextIssue } from '../services/geminiService';
import { addToIssueShoppingList } from '../services/shoppingListService';
import StoreButtons from './StoreButtons';

export default function Scanner() {
  const webcamRef = useRef<Webcam>(null);
  const [results, setResults] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textIssue, setTextIssue] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [partsAdded, setPartsAdded] = useState<string[]>([]);
  const [allParts, setAllParts] = useState<string[]>([]);
  const [categorizedParts, setCategorizedParts] = useState<{parts: string[], tools: string[]}>({parts: [], tools: []});
  const [partsQuantities, setPartsQuantities] = useState<Record<string, number>>({});
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  // Function to switch between front and back camera
  const switchCamera = useCallback(() => {
    setFacingMode(current => current === "user" ? "environment" : "user");
  }, []);

  // Function to clean asterisks from AI responses while preserving them in emails and social media
  const cleanAsterisks = (text: string): string => {
    if (!text) return text;

    // Split text into parts, preserving content within email addresses and social media tags
    const parts = text.split(/(\S+@\S+|\@\w+)/);

    return parts.map(part => {
      // If this part is an email address or social media tag, leave it as-is
      if (part.includes('@') && (part.includes('.') || part.match(/^\@\w+$/))) {
        return part;
      }

      // Otherwise, remove asterisks used for markdown formatting
      return part.replace(/\*+/g, '');
    }).join('');
  };


  const extractParts = (response: string): {parts: string[], tools: string[]} => {
    const parts: string[] = [];
    const tools: string[] = [];
    const requiredPartsMatch = response.match(/(?:SUGGESTED|REQUIRED) PARTS:[\s\S]*?(?=PREVENTION TIPS:|$)/i);

    if (requiredPartsMatch) {
      const partsSection = requiredPartsMatch[0];
      const lines = partsSection.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines or lines that are just formatting
        if (!trimmed || trimmed.length < 2) continue;

        // Skip section headers and common artifacts
        if (trimmed.includes(':') ||
            trimmed.toUpperCase() === trimmed ||
            /PREVENTION|TIPS|CAUSES|DIFFICULTY|STEPS/i.test(trimmed) ||
            /^[*]+$/.test(trimmed)) {
          continue;
        }

        let item = '';

        // Match lines starting with "- " or bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          item = trimmed.replace(/^[-•*]\s+/, '').trim();
        } else if (!trimmed.includes('SUGGESTED PARTS') && !trimmed.includes('REQUIRED PARTS') && !trimmed.includes('PREVENTION TIPS:') && !trimmed.match(/^[A-Z ]+:$/)) {
          // Also capture lines that look like items (not headers)
          item = trimmed.replace(/^\d+\.\s*/, '').trim();
        }

        // Filter out invalid items and categorize
        if (item && item.length > 1 && item.length < 100) {
          const cleanItem = item.replace(/[^\w\s\-]/g, '').trim();

          // Skip common words that might be artifacts
          if (cleanItem.length > 1 && !/^(just|and|or|with|for|the|this|that|these|those)$/i.test(cleanItem)) {
            // Categorize as tool or part
            const lowerItem = item.toLowerCase();
            const isTool = /\b(screwdriver|hammer|pliers|wrench|drill|saw|tape|pliers|pliers|level|sander|sandpaper|tape measure|multimeter|voltage tester|wire stripper|pipe wrench|adjustable wrench|allen wrench|hex key)\b/i.test(lowerItem) ||
                          /\b(screwdrivers|hammers|pliers|wrenches|drills|saws|tapes|pliers|pliers|levels|sanders|sandpapers|tape measures|multimeters|voltage testers|wire strippers|pipe wrenches|adjustable wrenches|allen wrenches|hex keys)\b/i.test(lowerItem);

            if (isTool) {
              tools.push(item);
            } else {
              parts.push(item);
            }
          }
        }
      }
    }

    // Remove duplicates within each category
    const uniqueParts = [...new Set(parts)];
    const uniqueTools = [...new Set(tools)];


    return { parts: uniqueParts, tools: uniqueTools };
  };


  const removePart = (partToRemove: string) => {
    setAllParts(prevParts => prevParts.filter(part => part !== partToRemove));

    // Also update categorized parts
    setCategorizedParts(prev => ({
      parts: prev.parts.filter(part => part !== partToRemove),
      tools: prev.tools.filter(tool => tool !== partToRemove)
    }));
  };

  const addPartsToShoppingList = async () => {
    if (allParts.length === 0) return;

    // Generate unique UUID for issue ID
    const issueId = crypto.randomUUID();
    const issueTitle = textIssue.trim() || extractIssueTitle(results) || "Repair Analysis";

    // Create items with quantities
    const itemsWithQuantities = allParts.map(item => ({
      name: item,
      quantity: partsQuantities[item] || 1
    }));

    console.log('--- Add to Shopping List Debug ---');
    console.log('Issue ID:', issueId);
    console.log('Issue Title:', issueTitle);
    console.log('All Parts (from state):', allParts);
    console.log('Parts Quantities (from state):', partsQuantities);
    console.log('Items with Quantities (sent to service):', itemsWithQuantities);
    console.log('--- End Add to Shopping List Debug ---');

    try {
      await addToIssueShoppingList(issueId, issueTitle, itemsWithQuantities);
      setPartsAdded(allParts);
    } catch (error) {
      console.error('Error adding parts to shopping list:', error);
    }
  };

  const extractIssueTitle = (aiResponse: string | null): string => {
    if (!aiResponse) return "Repair Issue";

    // Try to extract a meaningful title from the AI response
    const lines = aiResponse.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('identified issue') ||
          line.toLowerCase().includes('part name') ||
          line.toLowerCase().includes('what could be wrong')) {
        // Clean up the line and make it a title
        const cleanTitle = line.replace(/^[A-Z\s]+:/i, '').trim();
        if (cleanTitle.length > 0 && cleanTitle.length < 50) {
          return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        }
      }
    }

    // Fallback: extract first meaningful line
    const firstLine = lines.find(line => line.trim().length > 10 && !line.includes('Hero Report'));
    return firstLine ? firstLine.substring(0, 40).trim() : "Repair Analysis";
  };

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowCamera(false);
      setShowTextInput(true);
    }
  }, [webcamRef]);

  const analyzeWithDescription = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setShowTextInput(false);

    let aiResponse;
    if (textIssue.trim()) {
      // Analyze image with text description
      aiResponse = await analyzeImageWithDescription(capturedImage, textIssue.trim());
    } else {
      // Analyze image only
      aiResponse = await analyzeImage(capturedImage);
    }

    setResults(aiResponse);

    // Extract all parts for affiliate links
    const categorized = extractParts(aiResponse);
    const allItems = [...categorized.parts, ...categorized.tools];
    setAllParts(allItems);
    setCategorizedParts(categorized);
    setPartsAdded([]); // Reset parts added state

    // Initialize quantities for all parts and tools to 1 if not already set
    const initialQuantities: Record<string, number> = {};
    [...categorized.parts, ...categorized.tools].forEach(item => {
      if (!(item in partsQuantities)) {
        initialQuantities[item] = 1;
      }
    });
    setPartsQuantities(prev => ({ ...prev, ...initialQuantities }));

    setLoading(false);
  };

  const analyzeTextOnly = async () => {
    if (!textIssue.trim()) return;

    setLoading(true);
    setShowTextInput(false);
    const aiResponse = await analyzeTextIssue(textIssue.trim());
    setResults(aiResponse);

    // Extract all parts for affiliate links
    const categorized = extractParts(aiResponse);
    const allItems = [...categorized.parts, ...categorized.tools];
    setAllParts(allItems);
    setCategorizedParts(categorized);
    setPartsAdded([]); // Reset parts added state

    // Initialize quantities for all parts and tools to 1 if not already set
    const initialQuantities: Record<string, number> = {};
    [...categorized.parts, ...categorized.tools].forEach(item => {
      if (!(item in partsQuantities)) {
        initialQuantities[item] = 1;
      }
    });
    setPartsQuantities(prev => ({ ...prev, ...initialQuantities }));

    setLoading(false);
  };

  const reset = () => {
    setResults(null);
    setShowCamera(false);
    setShowTextInput(false);
    setTextIssue('');
    setCapturedImage(null);
    setPartsAdded([]);
    setAllParts([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-orange-400 mb-2">Issue Help with Fixit Hero</h2>
        <p className="text-slate-400">Get instant repair guidance by taking a photo and/or describing your issue.</p>
      </div>

      {!showCamera && !showTextInput && !results && !loading && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCamera(true)}
            className="w-full bg-orange-600 hover:bg-orange-500 py-12 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-6xl block mb-4">📸</span>
            <span className="text-2xl font-bold uppercase tracking-widest">Start Issue</span>
            <p className="text-sm mt-2 opacity-90">Take a photo and optionally describe your issue.</p>
          </button>

          <div className="text-center">
            <span className="text-slate-400">or</span>
          </div>

          <button
            onClick={() => setShowTextInput(true)}
            className="w-full bg-slate-700 hover:bg-slate-600 py-12 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-6xl block mb-4">💬</span>
            <span className="text-2xl font-bold uppercase tracking-widest">Describe Issue Only</span>
            <p className="text-sm mt-2 opacity-90">No photo needed</p>
          </button>
        </div>
      )}

      {showCamera && (
        <div className="relative rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl bg-slate-900">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: facingMode // Use back camera by default, can be toggled
            }}
            className="w-full"
          />
          <div className="absolute bottom-4 left-0 right-0 flex gap-4 justify-center px-4">
            <button
              onClick={() => setShowCamera(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={switchCamera}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
              title={`Switch to ${facingMode === "user" ? "back" : "front"} camera`}
            >
              <span>📷</span>
              Switch
            </button>
            <button
              onClick={capture}
              className="bg-white text-black px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-50 transition-colors"
            >
              SNAP PHOTO
            </button>
          </div>
        </div>
      )}

      {showTextInput && capturedImage && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-orange-400">Add Description (Optional)</h3>
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setShowTextInput(false);
                  setShowCamera(true);
                }}
                className="text-slate-400 hover:text-white text-sm underline"
              >
                Retake Photo
              </button>
            </div>

            <div className="mb-4">
              <img
                src={capturedImage}
                alt="Captured repair issue"
                className="w-full max-h-64 object-cover rounded-lg border border-slate-600"
              />
            </div>

            <textarea
              value={textIssue}
              onChange={(e) => setTextIssue(e.target.value)}
              placeholder="Add any additional details about what's wrong or what you're experiencing. For example: 'It makes a rattling noise', 'Water leaks when turned off', 'Only happens at night', etc."
              rows={4}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={analyzeWithDescription}
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
              >
                {loading ? 'Analyzing...' : 'Ask the Hero'}
              </button>
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setShowTextInput(false);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTextInput && !capturedImage && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-orange-400 mb-4">Describe Your Issue</h3>
          <textarea
            value={textIssue}
            onChange={(e) => setTextIssue(e.target.value)}
            placeholder="Describe what's wrong with your home repair issue. Be as detailed as possible - e.g., 'My bathroom faucet is leaking from the base', 'The light switch in the kitchen sparks when I turn it on', etc."
            rows={6}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={analyzeTextOnly}
              disabled={!textIssue.trim() || loading}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              {loading ? 'Analyzing...' : 'Ask the Hero'}
            </button>
            <button
              onClick={() => setShowTextInput(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 bg-slate-800 rounded-2xl border border-slate-700">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl animate-pulse text-orange-400 font-bold">HERO IS ANALYZING...</p>
        </div>
      )}

      {results && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300">
          <h2 className="text-2xl font-bold text-orange-400 mb-4 border-b border-slate-700 pb-2">Hero Report</h2>
          <div className="text-slate-200 leading-relaxed mb-6 text-sm" style={{ whiteSpace: 'pre-wrap', tabSize: 4 }}>
            {(() => {
              // Split on the last line that doesn't contain a colon (likely the YouTube search term)
              const lines = results.split('\n');
              let splitIndex = lines.length;

              // Find the last line that doesn't contain ':' and has 1-4 words (likely the search term)
              for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (!line.includes(':') && line.split(' ').length >= 1 && line.split(' ').length <= 4) {
                  splitIndex = i;
                  break;
                }
              }

              const textToShow = lines.slice(0, splitIndex).join('\n').trim();
              return cleanAsterisks(textToShow);
            })()}
          </div>

          {(() => {
            // Check if there's a YouTube search term at the end
            const lines = results.split('\n');
            const lastLine = lines[lines.length - 1]?.trim();
            // Last line is likely the search term if it has no colon and 1-4 words
            const hasSearchTerm = lastLine && !lastLine.includes(':') && lastLine.split(' ').length >= 1 && lastLine.split(' ').length <= 4;

            return hasSearchTerm && (
              <div className="mb-6">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    cleanAsterisks(lastLine)
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-tighter transition-transform active:scale-95"
                >
                  ▶ Watch Example Video Tutorial
                </a>
              </div>
            );
          })()}
          
          {allParts.length > 0 && (
            <div className="mb-6">
                <h3 className="text-lg font-bold text-orange-400 mb-3">Recommended Parts & Tools</h3>
                <div className="space-y-6">
                  {/* Parts Section */}
                  {categorizedParts.parts.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        🔧 Parts ({categorizedParts.parts.length})
                      </h4>
                      <div className="space-y-3">
                        {categorizedParts.parts.map((part: string, index: number) => (
                        <div key={`part-${index}`} className="relative p-4 bg-slate-900 rounded-xl border border-slate-700">
                          <button
                            onClick={() => removePart(part)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                            title="Remove this part from shopping list"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="flex items-center justify-between mb-2 pr-8">
                            <h4 className="text-white font-semibold">{part}</h4>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 mr-1">Quantity: </span>
                              <button
                                onClick={() => {
                                  const currentQuantity = partsQuantities[part] || 1;
                                  setPartsQuantities(prev => ({ ...prev, [part]: Math.max(1, currentQuantity - 1) }));
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
                                  setPartsQuantities(prev => ({ ...prev, [part]: currentQuantity + 1 }));
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

                  {/* Tools Section */}
                  {categorizedParts.tools.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-green-400 mb-2 flex items-center gap-2">
                        🛠️ Tools ({categorizedParts.tools.length})
                      </h4>
                      <div className="space-y-3">
                        {categorizedParts.tools.map((tool: string, index: number) => (
                        <div key={`tool-${index}`} className="relative p-4 bg-slate-900 rounded-xl border border-slate-700">
                          <button
                            onClick={() => removePart(tool)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                            title="Remove this tool from shopping list"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="flex items-center justify-between mb-2 pr-8">
                            <h4 className="text-white font-semibold">{tool}</h4>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 mr-1">Quantity: </span>
                              <button
                                onClick={() => {
                                  const currentQuantity = partsQuantities[tool] || 1;
                                  setPartsQuantities(prev => ({ ...prev, [tool]: Math.max(1, currentQuantity - 1) }));
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
                                  setPartsQuantities(prev => ({ ...prev, [tool]: currentQuantity + 1 }));
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
              </div>
            </div>
          )}

          <div className="space-y-4 mt-6"> {/* Added a div to wrap the following elements */}
            {allParts.length > 0 && partsAdded.length === 0 && (
              <div className="mb-6">
                <button
                  onClick={addPartsToShoppingList}
                  className="w-full bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span>🛒</span>
                  Add {allParts.length} {allParts.length === 1 ? 'Item' : 'Items'} to Shopping List
                </button>
              </div>
            )}

            {partsAdded.length > 0 && (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 mb-4">
                <p className="text-green-400 font-semibold mb-2">✓ Added {partsAdded.length} {partsAdded.length === 1 ? 'item' : 'items'} to Shopping List</p>
                <ul className="text-green-300 text-sm space-y-1">
                  {partsAdded.map((part, idx) => (
                    <li key={idx}>• {part}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              onClick={reset}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-slate-300 transition-colors"
            >
              New Issue
            </button>
          </div> {/* End new wrapper div */}
        </div>
      )}
    </div>
  );
}

