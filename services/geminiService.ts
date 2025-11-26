import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCaption = async (topic?: string): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = topic 
      ? `请为一张关于"${topic}"的图片生成一个简短、有创意、吸引人的中文标题或文案，不超过15个字，不要带引号。` 
      : `请生成一个通用的、充满正能量或文艺气息的中文图片配文，不超过12个字，不要带引号。`;
      
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "美好的一天 ✨"; // Fallback
  }
};
