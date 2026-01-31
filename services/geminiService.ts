import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, CardWithBalance } from '../types';
import { formatCLP } from '../constants';

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not defined in import.meta.env");
  }
  return new GoogleGenAI({ apiKey });
};

export const getFinancialAdvice = async (
  totalBalance: number,
  cards: CardWithBalance[],
  transactions: Transaction[]
): Promise<string> => {
  try {
    const ai = getAiClient();

    const recentTransactions = transactions.slice(0, 20);
    const cardSummary = cards.map(c => `${c.name} (${c.type}): ${formatCLP(c.currentBalance)}`).join(', ');
    const txSummary = recentTransactions.map(t =>
      `- ${t.date.split('T')[0]}: ${t.description} (${t.type}) ${formatCLP(t.amount)} en ${cards.find(c => c.id === t.cardId)?.name || 'Tarjeta desconocida'}`
    ).join('\n');

    const prompt = `
      Actúa como un asesor financiero experto.
      
      Datos actuales:
      - Saldo Total: ${formatCLP(totalBalance)}
      - Tarjetas: ${cardSummary}
      - Últimos movimientos:
      ${txSummary}

      Por favor, dame un resumen muy breve (máximo 3 párrafos) sobre mi estado financiero actual.
      Identifica patrones de gasto y dame 1 consejo accionable para ahorrar.
      Responde en formato Markdown simple.
      Usa emojis para hacerlo amigable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar un análisis en este momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Lo siento, hubo un error al conectar con el asistente financiero.";
  }
};

export const extractReceiptInfo = async (base64Image: string): Promise<{ amount: number, description: string, category: string } | null> => {
  try {
    const ai = getAiClient();

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: "Analiza esta boleta o recibo y extrae la siguiente información en formato JSON: monto total (entero), una descripción breve del comercio o compra, y una categoría sugerida (food, transport, entertainment, bills, shopping, health, others). Responde SOLAMENTE el JSON."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["amount", "description", "category"]
        }
      }
    });

    const rawText = response.text || '{}';
    // Use a regex to isolate the JSON object in case the model returns extra formatting
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : rawText;

    const result = JSON.parse(cleanedJson);
    return {
      amount: Math.round(result.amount || 0),
      description: result.description || "Compra escaneada",
      category: result.category || "others"
    };
  } catch (error) {
    console.error("Error extracting receipt info:", error);
    return null;
  }
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const textPart = {
      text: "Analiza detalladamente esta imagen. Describe qué ves, identifica objetos, textos relevantes y cualquier contexto útil. Responde en español de forma clara y organizada."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text || "No se pudo generar una descripción para la imagen.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Ocurrió un error al analizar la imagen.";
  }
};