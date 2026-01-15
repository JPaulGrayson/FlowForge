import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
const google = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
export interface CouncilModel { id: string; name: string; }
export interface CouncilRequest { prompt: string; models: CouncilModel[]; pattern: string; }
export interface CouncilResponse { modelId: string; response: string; }
export interface CouncilResult { responses: CouncilResponse[]; }
async function ask(id: string, p: string): Promise<string> {
  try {
    if (id === "claude" && anthropic) { const m = await anthropic.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: p }] }); return m.content[0].type === "text" ? m.content[0].text : ""; }
    if (id === "gpt4" && openai) { const m = await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: p }], max_tokens: 500 }); return m.choices[0]?.message?.content || ""; }
    if (id === "gemini" && google) { const g = google.getGenerativeModel({ model: "gemini-3-flash-preview" }); return (await g.generateContent(p)).response.text(); }
  } catch (e: any) { return "Error: " + e.message; }
  return "N/A";
}
export class Council { async query(r: CouncilRequest): Promise<CouncilResult> { return { responses: await Promise.all(r.models.map(async m => ({ modelId: m.id, response: await ask(m.id, r.prompt) }))) }; } }
export const council = new Council();
