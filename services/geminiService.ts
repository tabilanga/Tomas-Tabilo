
import { GoogleGenAI, Type } from "@google/genai";
import { Patient } from "../types";

export const geminiService = {
  getInsights: async (patients: Patient[]) => {
    if (patients.length === 0) return "Agregue pacientes para obtener análisis de su red.";
    
    const summary = patients.map(p => 
      `Paciente de ${p.commune}, referido por ${p.referrerName} (${p.relationship})`
    ).join('\n');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analiza los datos de referidos y resume en 3 frases las tendencias principales (comunas activas, relaciones fuertes): \n\n${summary}`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "No se pudieron generar insights.";
    }
  },

  analyzeMedicalPDF: async (base64Data: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          },
          {
            text: `Actúa como un asistente médico experto. Extrae la siguiente información del documento PDF adjunto y devuélvela estrictamente en formato JSON en español:
            1. name (Nombre completo)
            2. birthDate (Fecha de nacimiento en formato YYYY-MM-DD)
            3. sex (Opciones: "masculino", "femenino" o "no-especificado")
            4. diagnosis (Diagnóstico principal)
            5. medications (Medicamentos y sus dosis)
            6. contraceptive (Si es mujer y se menciona, qué anticonceptivo toma)
            7. lastTreatment (Último tratamiento indicado)
            
            Si un campo no se encuentra, deja el valor como null.`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              birthDate: { type: Type.STRING },
              sex: { type: Type.STRING },
              diagnosis: { type: Type.STRING },
              medications: { type: Type.STRING },
              contraceptive: { type: Type.STRING },
              lastTreatment: { type: Type.STRING },
            }
          }
        }
      });
      
      const jsonStr = response.text.trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("PDF Analysis Error:", error);
      return null;
    }
  },

  searchLocation: async (query: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Busca la ubicación exacta de la comuna o lugar llamado: "${query}".`,
        config: { tools: [{ googleMaps: {} }] },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const mapLinks = chunks?.filter(c => c.maps).map(c => ({
        title: c.maps?.title || "Ver ubicación",
        uri: c.maps?.uri
      })).filter(c => c.uri) || [];

      return { suggestions: mapLinks as {title: string, uri: string}[] };
    } catch (error) {
      console.error("Maps Grounding Error:", error);
      return null;
    }
  },

  getCoordinates: async (placeName: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide the latitude and longitude for the following place: "${placeName}".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
            },
            required: ["lat", "lng"],
          },
        },
      });
      return JSON.parse(response.text.trim());
    } catch (e) {
      return null;
    }
  }
};
