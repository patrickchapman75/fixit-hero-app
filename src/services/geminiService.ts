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
  const maxRetries = 3;
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
            toast.loading(`Server busy. Retrying in ${Math.ceil(delay / 1000)}s...`, { id: toastId });
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