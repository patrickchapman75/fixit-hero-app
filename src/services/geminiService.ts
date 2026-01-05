import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Model Constants
 * Using the latest late-2025 High-Limit models
 */
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

/**
 * Utility for pausing execution during retries
 */
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Core Orchestrator
 * Handles model switching, exponential backoff, and user notifications
 */
async function tryWithFallback(prompt: string, imageData?: any) {
  const maxRetries = 2;
  const baseDelay = 1500;
  let toastId: string | number | null = null;

  const attemptRequest = async (modelName: string, retryCount = 0): Promise<string> => {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Structure content based on presence of image
      const content = imageData
        ? [prompt, { inlineData: { data: imageData, mimeType: "image/jpeg" } }]
        : [prompt];

      const result = await model.generateContent(content);
      
      if (toastId) toast.dismiss(toastId);
      return result.response.text();
      
    } catch (error: any) {
      const errorMsg = error?.message?.toLowerCase() || "";
      
      // Identify transient "Wall" errors (Quota, Rate Limit, or Server Overload)
      const isTransient = 
        error?.status === 429 || 
        error?.status === 503 || 
        errorMsg.includes('quota') || 
        errorMsg.includes('limit') || 
        errorMsg.includes('rate');

      if (isTransient) {
        if (retryCount < maxRetries) {
          // Exponential backoff calculation
          const delay = Math.pow(2, retryCount) * baseDelay + Math.random() * 1000;
          
          if (!toastId) {
            toastId = toast.loading("Fixit Hero brain is busy... retrying.");
          } else {
            toast.loading(`Fixit Hero brain. Retrying in ${Math.ceil(delay / 1000)}s...`, { id: toastId });
          }

          await wait(delay);
          return attemptRequest(modelName, retryCount + 1);
        }

        // If primary model failed all retries, switch to the Lite model
        if (modelName === PRIMARY_MODEL) {
          if (toastId) toast.loading("Switching to backup brain...", { id: toastId });
          return attemptRequest(FALLBACK_MODEL, 0);
        }
      }

      // Final failure cleanup
      if (toastId) toast.error("Hero Brain is offline. Please try later.", { id: toastId });
      throw error;
    }
  };

  return await attemptRequest(PRIMARY_MODEL);
}

/* -------------------------------------------------------------------------- */
/* EXPORTED FUNCTIONS                             */
/* -------------------------------------------------------------------------- */

export async function analyzeImage(base64Image: string) {
  try {
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const prompt = `You are the Fixit Hero App. You are a Master DIY Repair Consultant and Affiliate Concierge. 
      You know everything about home repair to teach and assist the middle to begginer level DIY homeowners. A user has taken a photo.  
      Be extermely specific and detailed in your response. Please identify this home repair part and what could be wrong with it.
      Based on this image, provide expert analysis and repair guidance:

      PART NAME
      UNIVERSAL PART NAME: [Provide a single, optimized search term that works best on hardware store search engines - use common industry terms, model numbers if applicable, and avoid brand-specific names]
      WHAT COULD BE WRONG WITH IT (considering the image): [List 2-3 most likely causes]
      DIFFICULTY (Easy/Medium/Hard)
      4 STEPS to fix or replace it
      SUGGESTED PARTS: [List each suggested parts as simple text items, one per line, starting with "- " followed immediately by the part name - do not use asterisks, bold formatting, or extra punctuation]
      SUGGESTED TOOLS: [List each suggested tools as simple text items, one per line, starting with "- " followed immediately by the tool name - do not use asterisks, bold formatting, or extra punctuation]
      PREVENTION TIPS: [2-3 tips to prevent this issue in the future]
      [Provide a 4-word search term for a tutorial]

      FORMATTING INSTRUCTIONS:
      - Use clean text without any asterisks (*) for bold or italic formatting
      - For numbered steps that span multiple lines, indent continuation lines with 4 spaces to align with the first word after the number
      - Format like this:
        1. This is the first line
            continuation indented properly
            more continuation text
      - Keep responses clear and readable without markdown formatting

      Be safety-conscious in your response. Format parts simply as "- Part Name" without any markdown formatting.`;

    return await tryWithFallback(prompt, base64Data);
  } catch (error: any) {
    return `Hero Brain Error: ${error.message}`;
  }
}

export async function analyzeImageWithDescription(base64Image: string, description: string) {
  try {
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const prompt = `You are the Fixit Hero App. You are a Master DIY Repair Consultant and Affiliate Concierge.
	  You know everything about home repair to teach and assist the middle to begginer level DIY homeowners. A user has taken a photo and provided this additional description: "${description}"
																																 
    Based on this image and description, provide expert analysis and repair guidance:
    PART NAME and IDENTIFIED ISSUE: [Brief description of what you think the problem is]
        
    UNIVERSAL PART NAME: [Provide a single, optimized search term that works best on hardware store search engines - use common industry terms, model numbers if applicable, and avoid brand-specific names]
    WHAT COULD BE WRONG AND POSSIBLE CAUSES (considering both the image and description): [List 2-3 most likely causes]
    DIFFICULTY (Easy/Medium/Hard)
    4 STEPS to diagnose and fix the issue
    SUGGESTED PARTS: [List each suggested parts as simple text items, one per line, starting with "- " followed immediately by the part name - do not use asterisks, bold formatting, or extra punctuation]
    SUGGESTED TOOLS: [List each suggested tools as simple text items, one per line, starting with "- " followed immediately by the tool name - do not use asterisks, bold formatting, or extra punctuation]
    PREVENTION TIPS: [2-3 tips to prevent this issue in the future]
    [Provide a 4-word search term for a tutorial]

    FORMATTING INSTRUCTIONS:
    - Use clean text without any asterisks (*) for bold or italic formatting
    - For numbered steps that span multiple lines, indent continuation lines with 4 spaces to align with the first word after the number
    - Format like this:
      1. This is the first line
          continuation indented properly
          more continuation text
    - Keep responses clear and readable without markdown formatting

    Be safety-conscious in your response. Format parts simply as "- Part Name" without any markdown formatting.`;

    return await tryWithFallback(prompt, base64Data);
  } catch (error: any) {
    return `Hero Brain Error: ${error.message}`;
  }
}

export async function analyzeTextIssue(issueDescription: string) {
  try {
    const prompt = `You are the Fixit Hero App. You are a Master DIY Repair Consultant and Affiliate Concierge.
    You know everything about home repair to teach and assist the middle to begginer level DIY homeowners. A user has described this home repair issue: "${issueDescription}"
    Based on this description, provide expert analysis and repair guidance:
    IDENTIFIED ISSUE: [Brief description of what you think the problem is]
    WHAT COULD BE WRONG AND POSSIBLE CAUSES: [List 2-3 most likely causes]
    DIFFICULTY (Easy/Medium/Hard)
    4 STEPS to diagnose and fix the issue
    SUGGESTED PARTS: [List each suggested parts as simple text items, one per line, starting with "- " followed immediately by the part name - do not use asterisks, bold formatting, or extra punctuation]
    SUGGESTED TOOLS: [List each suggested tools as simple text items, one per line, starting with "- " followed immediately by the tool name - do not use asterisks, bold formatting, or extra punctuation]
    PREVENTION TIPS: [2-3 tips to prevent this issue in the future]
    [Provide a 4-word search term for a tutorial]

    FORMATTING INSTRUCTIONS:
    - Use clean text without any asterisks (*) for bold or italic formatting
    - For numbered steps that span multiple lines, indent continuation lines with 4 spaces to align with the first word after the number
    - Format like this:
      1. This is the first line
          continuation indented properly
          more continuation text
    - Keep responses clear and readable without markdown formatting

    Be safety-conscious in your response. Format parts simply as "- Part Name" without any markdown formatting.`;

    return await tryWithFallback(prompt);
  } catch (error: any) {
    return `Hero Brain Error: ${error.message}`;
  }
}

/* -------------------------------------------------------------------------- */
/* CHAT SESSION MANAGEMENT                                                    */
/* -------------------------------------------------------------------------- */

/**
 * System instruction for Fixit Hero AI
 */
const SYSTEM_INSTRUCTION = `You are the Fixit Hero App - a Master DIY Repair Consultant. You help beginner to intermediate homeowners diagnose and fix repair issues.

## CONVERSATION FLOW:

### Phase 1: Initial Diagnosis (Ask questions)
When a user uploads a photo or describes a problem:
1. Provide a brief observation of what you see
2. Ask 1-2 clarifying questions to narrow down the issue
3. DO NOT give the full solution yet

### Phase 2: Confirmation (User answers your questions)
After the user provides more details:
1. Summarize what you think the issue is
2. Ask: "Does this sound like the right problem? Should I provide the full repair guide?"
3. Wait for confirmation

### Phase 3: Full Repair Guide (After user confirms)
Once the user says YES (e.g., "yes", "that's correct", "sounds right", "let's fix it"), provide the COMPLETE repair guide in this EXACT format:

---

**IDENTIFIED ISSUE:** [Clear title of the problem]

**WHAT'S WRONG:** [Brief explanation of the issue and why it's happening]

**DIFFICULTY:** Easy/Medium/Hard

**REQUIRED PARTS:**
- Part Name 1
- Part Name 2
- Part Name 3

**REQUIRED TOOLS:**
- Tool Name 1
- Tool Name 2
- Tool Name 3

**REPAIR STEPS:**
1. [Detailed first step with clear instructions]
2. [Detailed second step]
3. [Detailed third step]
4. [Detailed fourth step]

**PREVENTION TIPS:**
- [Tip 1 to prevent this in the future]
- [Tip 2 to prevent this in the future]

---

CRITICAL RULES:
- Use simple part names (not brand-specific)
- Be specific in steps (include measurements, settings, etc.)
- Always format parts and tools as bulleted lists with "- " prefix
- Use clean text without asterisks or markdown bold/italic
- The structured text format (IDENTIFIED ISSUE, REQUIRED PARTS, etc.) is used for parsing - no JSON needed`;

/**
 * Create a new chat session with Fixit Hero AI
 * Uses Gemini's built-in chat session management
 */
export function createChatSession() {
  const model = genAI.getGenerativeModel({ 
    model: PRIMARY_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION
  });

  const chat = model.startChat({
    history: [],
  });

  return {
    /**
     * Send a message to the chat session with streaming and retry logic
     * @param text - The text message from the user
     * @param imageBase64 - Optional base64 image data (with or without data:image prefix)
     * @returns AsyncGenerator that yields text chunks as they arrive
     */
    async *sendMessageStream(text: string, imageBase64?: string): AsyncGenerator<string, void, unknown> {
      const maxRetries = 2; // Reduced retries since both models share limits
      const baseDelay = 3000; // Increased base delay (3 seconds)
      let toastId: string | number | null = null;

      // Prepare content
      let content: any;
      if (imageBase64) {
        const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
        content = [
          text,
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          }
        ];
      } else {
        content = text;
      }

      // Try with primary model first, then fallback
      const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];

      for (const modelName of modelsToTry) {
        let retryCount = 0;

        while (retryCount <= maxRetries) {
          try {
            // Create a new chat session with the selected model
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: SYSTEM_INSTRUCTION
            });

            // Get existing history (if any) to maintain context
            let history: any[] = [];
            try {
              const existingHistory = await chat.getHistory();
              history = Array.isArray(existingHistory) ? existingHistory : [];
            } catch (e) {
              console.warn('Could not get chat history:', e);
            }

            const tempChat = model.startChat({
              history: history
            });

            const result = await tempChat.sendMessageStream(content);

            // Success - dismiss any toast and stream
            if (toastId) toast.dismiss(toastId);

            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              yield chunkText;
            }

            return; // Success - exit completely

          } catch (error: any) {
            const errorMsg = error?.message?.toLowerCase() || "";
            const isRateLimit = error?.status === 429 ||
              errorMsg.includes('quota') ||
              errorMsg.includes('limit') ||
              errorMsg.includes('rate') ||
              errorMsg.includes('per minute');

            if (isRateLimit && retryCount < maxRetries) {
              // Longer exponential backoff for rate limits
              const delay = Math.pow(2, retryCount) * baseDelay + Math.random() * 2000;

              if (!toastId) {
                toastId = toast.loading("Fixit Hero brain is busy... please wait.");
              } else {
                toast.loading(`Rate limit reached. Waiting ${Math.ceil(delay / 1000)}s before retry...`, { id: toastId });
              }

              await wait(delay);
              retryCount++;
              continue; // Retry with same model
            }

            // If it's the primary model and we've exhausted retries, try fallback
            if (modelName === PRIMARY_MODEL && isRateLimit) {
              if (toastId) toast.loading("Trying backup brain...", { id: toastId });
              break; // Break to try next model
            }

            // Final failure for rate limits
            if (isRateLimit) {
              if (toastId) toast.error("Fixit Hero brain is at capacity. Please wait 1-2 minutes before trying again.", { id: toastId });
              throw new Error("Rate limit exceeded. Please wait 1-2 minutes before trying again.");
            }

            // Other errors
            if (toastId) toast.error("Hero Brain encountered an error. Please try again.", { id: toastId });
            throw new Error(error.message || "An error occurred");
          }
        }
      }

      // If we get here, all models failed
      throw new Error("Fixit Hero brain is currently unavailable. Please try again in a few minutes.");
    },

    /**
     * Get the chat history
     */
    getHistory() {
      return chat.getHistory();
    }
  };
}

/* -------------------------------------------------------------------------- */
/* CONVERSATIONAL AI FUNCTIONS (Legacy - for backwards compatibility)        */
/* -------------------------------------------------------------------------- */

/**
 * Build a context-aware prompt from conversation history
 * Limits to last 12 messages (6 exchanges) to stay within token limits
 */
function buildConversationContext(
  history: Array<{ role: string; content: string }>,
  systemContext = "You are the Fixit Hero App - a Master DIY Repair Consultant."
): string {
  const recentHistory = history.slice(-12); // Keep last 6 exchanges
  const messages = recentHistory.map((msg) => {
    const speaker = msg.role === 'user' ? 'USER' : 'FIXIT HERO';
    return `${speaker}: ${msg.content}`;
  });
  
  return [systemContext, ...messages].join('\n\n');
}

/**
 * Ask a clarifying question to refine the repair diagnosis
 */
export async function askClarifyingQuestion(
  history: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    const contextPrompt = buildConversationContext(history);
    
    const prompt = `${contextPrompt}

FIXIT HERO: Based on the initial analysis above, ask ONE specific follow-up question that will help narrow down the exact problem or verify the diagnosis. 

Your question should:
- Be clear and easy to answer
- Help eliminate alternative causes
- Ask about symptoms, timing, or specific details the user can observe
- Be conversational and helpful

Ask only the question - do not provide analysis or additional commentary.`;

    return await tryWithFallback(prompt);
  } catch (error: any) {
    return `I'd like to help refine this diagnosis. Can you tell me more about when this issue occurs?`;
  }
}

/**
 * Refine the analysis based on conversation history and user responses
 */
export async function refineAnalysis(
  history: Array<{ role: string; content: string }>,
  base64Image?: string
): Promise<string> {
  try {
    const contextPrompt = buildConversationContext(history);
    
    const prompt = `${contextPrompt}

FIXIT HERO: Now provide a REFINED and MORE ACCURATE repair analysis based on all the information gathered in our conversation. Use this format:

REFINED DIAGNOSIS: [More specific diagnosis based on the conversation]
CONFIRMED ISSUE: [What's definitively wrong]
ROOT CAUSE: [The most likely cause based on all details]
DIFFICULTY (Easy/Medium/Hard)
DETAILED REPAIR STEPS:
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]

REQUIRED PARTS: [List each part as simple text items, one per line, starting with "- " followed by the part name]
SUGGESTED TOOLS: [List each tool as simple text items, one per line, starting with "- " followed by the tool name]
PREVENTION TIPS: [2-3 specific tips based on the identified cause]

FORMATTING INSTRUCTIONS:
- Use clean text without asterisks (*) for formatting
- For numbered steps spanning multiple lines, indent continuation lines with 4 spaces
- Keep responses clear and readable
- Be more specific than the initial analysis`;

    const imageData = base64Image 
      ? (base64Image.includes(",") ? base64Image.split(",")[1] : base64Image)
      : undefined;

    return await tryWithFallback(prompt, imageData);
  } catch (error: any) {
    return `Hero Brain Error: ${error.message}`;
  }
}