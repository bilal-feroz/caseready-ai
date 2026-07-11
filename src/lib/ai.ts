import { z } from "zod";

export interface AIDrafts {
  english: string;
  arabic: string;
}

export async function summarizeBlockers(blockers: string[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return `[Template-Generated Summary] There are ${blockers.length} active blockers preventing readiness: ${blockers.join(", ")}. Immediate coordination required.`;
  }

  try {
    const prompt = `Summarize these surgical readiness blockers for a medical coordinator: ${blockers.join(", ")}. Keep it under 2 sentences, professional, and clear.`;
    const text = await callGeminiAPI(apiKey, prompt);
    return text || `AI summary fallback: ${blockers.join(", ")}`;
  } catch (err) {
    console.error("AI Error:", err);
    return `[Fallback Summary] Blockers: ${blockers.join(", ")}`;
  }
}

export async function draftCommunication(
  patientName: string,
  procedureName: string,
  blockers: string[]
): Promise<AIDrafts> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      english: `Hello, this is the pre-admission team regarding your upcoming procedure. Please confirm that you have received and understood your medication instructions.`,
      arabic: `مرحباً، هذا فريق ما قبل الإدخال بخصوص عمليتكم الجراحية القادمة. يرجى تأكيد استلامكم وفهمكم لتعليمات الأدوية.`
    };
  }

  try {
    const prompt = `Draft a patient notification message in both English and Arabic regarding their upcoming ${procedureName}. Blockers to mention: ${blockers.join(", ")}. 
    Return the output in exact JSON format:
    {
      "english": "Message content in English",
      "arabic": "Message content in Arabic"
    }
    Do not wrap it in markdown code blocks.`;

    const responseText = await callGeminiAPI(apiKey, prompt);
    const parsed = JSON.parse(responseText.trim().replace(/^```json/, "").replace(/```$/, ""));
    const schema = z.object({
      english: z.string(),
      arabic: z.string(),
    });
    return schema.parse(parsed);
  } catch (err) {
    console.error("AI Error:", err);
    return {
      english: `Hello ${patientName}, we are preparing for your ${procedureName}. Please note the following outstanding items: ${blockers.join(", ")}.`,
      arabic: `مرحباً ${patientName}، نحن نستعد لعمليتك ${procedureName}. يرجى ملاحظة البنود التالية: ${blockers.join(", ")}.`
    };
  }
}

export async function explainPrioritization(caseNumber: string, score: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return `[Template-Generated Priority] Case ${caseNumber} is at ${score}% readiness. It contains active financial and clinical clearance blockers, placing it at high cancellation risk.`;
  }

  try {
    const prompt = `Explain why case ${caseNumber} with readiness score ${score}% needs coordinator attention. Keep it short.`;
    const text = await callGeminiAPI(apiKey, prompt);
    return text || `AI prioritization fallback for ${caseNumber}`;
  } catch (err) {
    console.error("AI Error:", err);
    return `Case ${caseNumber} requires attention due to a low readiness score (${score}%).`;
  }
}

export async function explainCandidateRanking(candidateName: string, score: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return `[Template-Generated Match] Fits available slot perfectly, same room setup required, clinically cleared, and patient previously opted into standby notification.`;
  }

  try {
    const prompt = `Provide a 1-sentence recommendation reason for standby candidate ${candidateName} with match score ${score}%.`;
    const text = await callGeminiAPI(apiKey, prompt);
    return text || `Candidate ${candidateName} is recommended for slot rescue.`;
  } catch (err) {
    console.error("AI Error:", err);
    return `Fits slot requirements with overall match score of ${score}%.`;
  }
}

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || "";
}
