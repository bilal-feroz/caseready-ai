import { z } from "zod";

// Bilingual patient-message drafting. When no GEMINI_API_KEY is set the app runs in
// "template mode" and returns fixed bilingual drafts; every draft still requires human
// approval before any (simulated) send. This module is the single integration point the
// Settings page reports on ("Template mode" vs "AI model").

export interface AIDrafts {
  english: string;
  arabic: string;
}

const TEMPLATE_DRAFTS: AIDrafts = {
  english:
    "Hello, this is the pre-admission team regarding your upcoming procedure. Please confirm that you have received and understood your pre-operative instructions.",
  arabic:
    "مرحباً، هذا فريق ما قبل الإدخال بخصوص عمليتكم الجراحية القادمة. يرجى تأكيد استلامكم وفهمكم لتعليمات ما قبل العملية.",
};

export async function draftCommunication(
  patientName: string,
  procedureName: string,
  blockers: string[]
): Promise<AIDrafts> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return TEMPLATE_DRAFTS;
  }

  try {
    const prompt = `Draft a short patient notification message in both English and Arabic regarding their upcoming ${procedureName}. Outstanding items to mention: ${blockers.join(", ")}.
    Return the output in exact JSON format:
    { "english": "Message content in English", "arabic": "Message content in Arabic" }
    Do not wrap it in markdown code blocks.`;

    const responseText = await callGeminiAPI(apiKey, prompt);
    const parsed = JSON.parse(responseText.trim().replace(/^```json/, "").replace(/```$/, ""));
    return z.object({ english: z.string(), arabic: z.string() }).parse(parsed);
  } catch (err) {
    console.error("Draft generation failed, falling back to template:", err);
    return {
      english: `Hello ${patientName}, we are preparing for your ${procedureName}. Please note the following outstanding items: ${blockers.join(", ")}.`,
      arabic: `مرحباً ${patientName}، نحن نستعد لعمليتك ${procedureName}. يرجى ملاحظة البنود التالية: ${blockers.join(", ")}.`,
    };
  }
}

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
