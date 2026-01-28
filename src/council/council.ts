import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
const google = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;
const grok = process.env.XAI_API_KEY ? new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" }) : null;
export interface CouncilModel { id: string; name: string; role?: string; }
export interface CouncilRequest { prompt: string; models: CouncilModel[]; pattern: string; }
export interface CouncilResponse { modelId: string; response: string; }
export interface CouncilResult { responses: CouncilResponse[]; synthesis?: string; winner?: string; }
async function ask(id: string, p: string): Promise<string> {
  try {
    if (id === "claude" && anthropic) { const m = await anthropic.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: p }] }); return m.content[0].type === "text" ? m.content[0].text : ""; }
    if (id === "gpt4" && openai) { const m = await openai.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: p }], max_tokens: 500 }); return m.choices[0]?.message?.content || ""; }
    if (id === "gemini" && google) { const g = google.getGenerativeModel({ model: "gemini-3-flash-preview" }); return (await g.generateContent(p)).response.text(); }
    if (id === "grok" && grok) { const m = await grok.chat.completions.create({ model: "grok-3-latest", messages: [{ role: "user", content: p }], max_tokens: 500 }); return m.choices[0]?.message?.content || ""; }
  } catch (e: any) { return "Error: " + e.message; }
  return "N/A";
}
export class Council {
  async query(req: CouncilRequest): Promise<CouncilResult> {
    const responses = await Promise.all(req.models.map(async m => ({ modelId: m.id, response: await ask(m.id, req.prompt) })));
    if (req.pattern === "debate") {
      const debatePrompt = "Here are responses to: " + req.prompt + "\n\n" + responses.map(r => r.modelId + ": " + r.response).join("\n\n") + "\n\nSynthesize the best answer from these perspectives.";
      const synthesis = await ask("claude", debatePrompt);
      return { responses, synthesis };
    }
    if (req.pattern === "specialist") {
      const _tasks = req.models.map((m, i) => ({ ...m, response: responses[i].response }));
      return { responses, synthesis: "Specialist responses collected for roles: " + req.models.map(m => m.role || m.name).join(", ") };
    }
    return { responses, winner: responses[0]?.modelId };
  }
}
export const council = new Council();
