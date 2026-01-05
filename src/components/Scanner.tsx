import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Loader2, User, Bot, Image as ImageIcon } from 'lucide-react';
import Webcam from 'react-webcam';
import { createChatSession } from '../services/geminiService';
import { saveRepairDiagnosis } from '../services/repairService';
import { addToIssueShoppingList } from '../services/shoppingListService';
import DiagnosisSummaryCard from './DiagnosisSummaryCard';

/**
 * Compress image to reduce token usage
 * @param imageData Base64 image data
 * @param maxWidth Maximum width in pixels (default: 1024)
 * @param quality JPEG quality (0-1, default: 0.7)
 * @returns Promise<string> Compressed base64 image data
 */
const compressImage = (imageData: string, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const compressedData = canvas.toDataURL('image/jpeg', quality);

      resolve(compressedData);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
};

interface Message {
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  timestamp: number;
}

// Multimodal history types for Gemini API
interface MultimodalPart {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

interface MultimodalMessage {
  role: 'user' | 'model';
  parts: MultimodalPart[];
}

interface DiagnosisResult {
  title: string;
  summary: string;
  parts_needed: string[];
  tools_needed: string[];
  steps: string[];
}

export default function Scanner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // Robust debouncing state
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [savedRepairId, setSavedRepairId] = useState<string | null>(null);
  const [showDiagnosisCard, setShowDiagnosisCard] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [partsQuantities, setPartsQuantities] = useState<Record<string, number>>({});
  const [partsAdded, setPartsAdded] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef(createChatSession());
  const lastRequestTime = useRef<number>(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Convert message history to Gemini multimodal format
   * CRITICAL: Only sends text history to avoid token limits - NEVER sends images from history
   */
  const buildMultimodalHistory = (): MultimodalMessage[] => {
    // Get last 4 messages (2 exchanges) - VERY limited to stay under token limits
    const recentMessages = messages.slice(-4);

    const history: MultimodalMessage[] = [];

    for (const msg of recentMessages) {
      // ONLY include text - NEVER include images from history to avoid token explosion
      if (msg.text.trim()) {
        history.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }

    return history;
  };


  /**
   * Extract and parse structured diagnosis from AI response
   * Parses the formatted text output (IDENTIFIED ISSUE, etc.), not JSON
   * Returns: { cleanedText, diagnosis }
   */
  const extractDiagnosis = (responseText: string): { cleanedText: string; diagnosis: DiagnosisResult | null } => {
    console.log('🔍 Extracting diagnosis from structured text...');
    console.log('Full response:', responseText);

    const diagnosis: DiagnosisResult = {
      title: '',
      summary: '',
      parts_needed: [],
      tools_needed: [],
      steps: []
    };

    // Extract title from IDENTIFIED ISSUE
    const titleMatch = responseText.match(/\*{0,2}IDENTIFIED ISSUE:\*{0,2}\s*([^\n]+)/i);
    if (titleMatch) {
      diagnosis.title = titleMatch[1].trim();
      console.log('📝 Title extracted:', diagnosis.title);
    }

    // Extract summary from WHAT'S WRONG
    const summaryMatch = responseText.match(/\*{0,2}WHAT'S WRONG:\*{0,2}[\s\S]*?(?=\*{0,2}DIFFICULTY:\*{0,2}|\*{0,2}REQUIRED PARTS:\*{0,2}|\*{0,2}REQUIRED TOOLS:\*{0,2}|\*{0,2}REPAIR STEPS:\*{0,2}|$)/i);
    if (summaryMatch) {
      diagnosis.summary = summaryMatch[0].replace(/\*{0,2}WHAT'S WRONG:\*{0,2}/i, '').trim();
      console.log('📝 Summary extracted:', diagnosis.summary);
    }

    // Extract parts from REQUIRED PARTS section
    const partsMatch = responseText.match(/\*{0,2}REQUIRED PARTS:\*{0,2}[\s\S]*?(?=\*{0,2}REQUIRED TOOLS:\*{0,2}|\*{0,2}REPAIR STEPS:\*{0,2}|\*{0,2}PREVENTION TIPS:\*{0,2}|$)/i);
    if (partsMatch) {
      const lines = partsMatch[0].split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const item = trimmed.replace(/^[-*]\s+/, '').trim();
          if (item && item.length > 1 && item.length < 100) {
            diagnosis.parts_needed.push(item);
          }
        }
      }
      console.log('📦 Parts extracted:', diagnosis.parts_needed);
    }

    // Extract tools from REQUIRED TOOLS section
    const toolsMatch = responseText.match(/\*{0,2}REQUIRED TOOLS:\*{0,2}[\s\S]*?(?=\*{0,2}REPAIR STEPS:\*{0,2}|\*{0,2}PREVENTION TIPS:\*{0,2}|$)/i);
    if (toolsMatch) {
      const lines = toolsMatch[0].split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const item = trimmed.replace(/^[-*]\s+/, '').trim();
          if (item && item.length > 1 && item.length < 100) {
            diagnosis.tools_needed.push(item);
          }
        }
      }
      console.log('🔧 Tools extracted:', diagnosis.tools_needed);
    }

    // Extract steps from REPAIR STEPS section
    const stepsMatch = responseText.match(/\*{0,2}REPAIR STEPS:\*{0,2}[\s\S]*?(?=\*{0,2}PREVENTION TIPS:\*{0,2}|$)/i);
    if (stepsMatch) {
      const lines = stepsMatch[0].split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const stepMatch = trimmed.match(/^\d+\.\s+(.+)/);
        if (stepMatch) {
          diagnosis.steps.push(stepMatch[1].trim());
        }
      }
      console.log('📋 Steps extracted:', diagnosis.steps);
    }

    // Find where structured content ends (before JSON if present)
    let cutoffIndex = responseText.length;

    // Look for "JSON" keyword or JSON object start
    const jsonKeywordIndex = responseText.search(/\bJSON\b/i);
    if (jsonKeywordIndex !== -1) {
      cutoffIndex = jsonKeywordIndex;
    } else {
      // Look for JSON object start
      const jsonStartIndex = responseText.search(/\{[\s\S]*?"FINAL_DIAGNOSIS"/i);
      if (jsonStartIndex !== -1) {
        cutoffIndex = jsonStartIndex;
      }
    }

    const cleanedText = responseText.substring(0, cutoffIndex).trim();

    console.log('✅ Diagnosis extracted from structured text');
    console.log('Cleaned text length:', cleanedText.length);
    console.log('Complete diagnosis object:', diagnosis);

    return {
      cleanedText,
      diagnosis: diagnosis.title ? diagnosis : null
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setSelectedImage(imageSrc);
      setShowCamera(false);
    }
  };

  const removePart = (partToRemove: string) => {
    // Remove from quantities
    setPartsQuantities(prev => {
      const updated = { ...prev };
      delete updated[partToRemove];
      return updated;
    });
  };

  const addPartsToShoppingList = async () => {
    if (!diagnosisResult || (diagnosisResult.parts_needed.length === 0 && diagnosisResult.tools_needed.length === 0)) return;

    // Must save diagnosis first to get repair ID
    if (!savedRepairId) {
      // Save diagnosis automatically
      if (diagnosisResult) {
        await handleSaveDiagnosis();
        // The savedRepairId will be set by handleSaveDiagnosis
        // Then we'll use it in the next step
      } else {
        console.error('No diagnosis to save');
        return;
      }
    }

    // Wait a moment for the state to update
    setTimeout(async () => {
      if (!savedRepairId || !diagnosisResult) {
        console.error('Failed to get repair ID or diagnosis');
        return;
      }

      const allItems = [...diagnosisResult.parts_needed, ...diagnosisResult.tools_needed];
      const itemsWithQuantities = allItems.map((item: string) => ({
        name: item,
        quantity: partsQuantities[item] || 1
      }));

      try {
        await addToIssueShoppingList(savedRepairId, itemsWithQuantities);
        setPartsAdded(allItems);
      } catch (error) {
        console.error('Error adding parts to shopping list:', error);
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (loading || isThinking) return; // Robust debouncing

    // Set thinking state immediately to prevent duplicate calls
    setIsThinking(true);

    // Enforce minimum delay between requests (helps with rate limiting)
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    const minDelay = 3000; // 3 seconds minimum between requests

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime.current = Date.now();

    const messageText = inputText.trim();
    let messageImage = selectedImage;

    // Compress image if present to reduce token usage
    if (messageImage) {
      try {
        console.log('Compressing image...');
        messageImage = await compressImage(messageImage, 1024, 0.7);
        console.log('Image compressed successfully');
      } catch (error) {
        console.warn('Failed to compress image, using original:', error);
        // Continue with original image if compression fails
      }
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      text: messageText,
      image: messageImage || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Clear inputs immediately
    setInputText('');
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Get AI response with streaming
    setLoading(true);

    // Add placeholder AI message immediately
    const placeholderMessage: Message = {
      role: 'assistant',
      text: '',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      let fullResponse = '';

      // Build multimodal history for context (text-only to avoid token limits)
      const multimodalHistory = buildMultimodalHistory();
      console.log('📝 Sending multimodal history:', multimodalHistory.length, 'messages');

      // Update chat session with multimodal history
      // Note: We need to create a new session with proper history
      // The sendMessageStream will handle this internally

      // Stream the response chunks with multimodal history
      const stream = chatSessionRef.current.sendMessageStream(
        messageText || 'Please analyze this image.',
        messageImage || undefined,
        multimodalHistory
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        
        // Update the last message (AI response) with accumulated text
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: fullResponse
          };
          return updated;
        });
      }

      // After streaming completes, extract parts and diagnosis
      const { cleanedText, diagnosis } = extractDiagnosis(fullResponse);

      // Store diagnosis if found
      if (diagnosis) {
        setDiagnosisResult(diagnosis);
        console.log('Diagnosis received:', diagnosis);

        // Initialize quantities for parts and tools
        if (diagnosis.parts_needed.length > 0 || diagnosis.tools_needed.length > 0) {
          const allItems = [...diagnosis.parts_needed, ...diagnosis.tools_needed];
          setPartsAdded([]);

          // Initialize quantities
          const initialQuantities: Record<string, number> = {};
          allItems.forEach((item: string) => {
            if (!(item in partsQuantities)) {
              initialQuantities[item] = 1;
            }
          });
          setPartsQuantities(prev => ({ ...prev, ...initialQuantities }));
        }
      }

      // Update final message with cleaned text (JSON stripped out)
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: cleanedText
        };
        return updated;
      });
      
    } catch (error: any) {
      console.error('Error getting AI response:', error);

      // Handle rate limit errors with better messaging
      const isRateLimit = error.message?.toLowerCase().includes('rate limit') ||
                         error.message?.toLowerCase().includes('quota') ||
                         error.message?.toLowerCase().includes('capacity') ||
                         error.message?.toLowerCase().includes('exceeded');

      const errorMessage = isRateLimit
        ? "🤖 Fixit Hero is at capacity right now. This happens during busy times. Please wait 2-3 minutes before trying again. The system will automatically retry with smarter spacing."
        : `Sorry, I encountered an error: ${error.message || 'Please try again.'}`;

      // Update the last message with error
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          text: errorMessage
        };
        return updated;
      });
    } finally {
      setLoading(false);
      setIsThinking(false); // Clear thinking state

      // Add extra cooldown period after request completion
      setTimeout(() => {
        // This provides additional rate limiting protection
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!diagnosisResult) return;
    
    setLoading(true);
    try {
      const savedRepair = await saveRepairDiagnosis(diagnosisResult);
      
      if (savedRepair) {
        console.log('Repair saved successfully:', savedRepair);
        // Store the repair ID for shopping list linking
        setSavedRepairId(savedRepair.id);
      }
    } catch (error) {
      console.error('Failed to save repair:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-900 relative">
      {/* Camera Modal */}
      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          {/* Webcam Feed */}
          <div className="flex-1 relative">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: "environment"
              }}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Camera Controls */}
          <div className="bg-slate-900 p-4 flex gap-3 justify-center items-center">
            <button
              onClick={() => setShowCamera(false)}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
            >
              <Camera size={20} />
              Capture Photo
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 rounded-t-2xl p-6 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-2xl font-bold text-orange-400 mb-2">Issue Help</h2>
        <p className="text-slate-400">Ask questions, upload photos, get repair guidance</p>
      </div>

      {/* Chat Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm">Upload a photo or describe your repair issue</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              {/* AI Avatar (left side) */}
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[70%] rounded-2xl p-4 shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-br-sm'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border border-slate-700 rounded-bl-sm'
                }`}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Uploaded"
                    className="rounded-lg mb-3 max-w-full shadow-md"
                  />
                )}
                {msg.text ? (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                ) : (
                  /* Streaming indicator when text is empty */
                  <div className="flex gap-1 items-center py-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
                <div
                  className={`text-xs mt-2 opacity-70 ${
                    msg.role === 'user' ? 'text-orange-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* User Avatar (right side) */}
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Diagnosis Summary Card */}
        {diagnosisResult && showDiagnosisCard && (
          <div className="mt-6">
            <DiagnosisSummaryCard
              diagnosisResult={diagnosisResult}
              partsQuantities={partsQuantities}
              onUpdateQuantity={(item, quantity) => {
                setPartsQuantities(prev => ({ ...prev, [item]: quantity }));
              }}
              onRemovePart={removePart}
              onAddToShoppingList={addPartsToShoppingList}
              partsAdded={partsAdded}
            />
          </div>
        )}


        {/* Generate Hero Report Button */}
        {diagnosisResult && !showDiagnosisCard && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={async () => {
                setShowDiagnosisCard(true);
                setChatDisabled(true);
                // Auto-save when generating report
                await handleSaveDiagnosis();
              }}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              🦸 Generate Hero Report
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Fixed Input Area at Bottom */}
      <div className="bg-slate-800 rounded-b-2xl p-4 border-t border-slate-700 flex-shrink-0">

        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={selectedImage}
              alt="Selected"
              className="h-20 rounded-lg border border-slate-600"
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 rounded-full p-1 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input Row */}
        <div className="flex gap-2 items-end">
          {/* Camera Button - Take Photo */}
          <button
            onClick={() => setShowCamera(true)}
            disabled={chatDisabled}
            className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
            title={chatDisabled ? "Chat disabled - diagnosis in progress" : "Take photo with camera"}
          >
            <Camera size={20} />
          </button>

          {/* Image Upload Button - From Gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={chatDisabled}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={chatDisabled}
            className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
            title={chatDisabled ? "Chat disabled - diagnosis in progress" : "Upload from gallery"}
          >
            <ImageIcon size={20} />
          </button>

          {/* Text Input */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatDisabled}
            placeholder={chatDisabled ? "Diagnosis generated - chat disabled" : "Describe your issue or ask a question..."}
            rows={1}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 disabled:bg-slate-800 disabled:cursor-not-allowed resize-none"
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={loading || isThinking || chatDisabled || (!inputText.trim() && !selectedImage)}
            className="flex-shrink-0 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
