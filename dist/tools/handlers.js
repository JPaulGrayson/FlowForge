import Anthropic from "@anthropic-ai/sdk";
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
import * as fs from "fs/promises";
import * as path from "path";
export const toolHandlers = {
    async web_search(p) {
        const url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(p.query) + "&format=json";
        const res = await fetch(url);
        const data = await res.json();
        return { query: p.query, results: data.RelatedTopics?.slice(0, 5) || [] };
    },
    async write_file(p) {
        const dir = "./workflows/outputs";
        await fs.mkdir(dir, { recursive: true });
        const filepath = path.join(dir, p.filename);
        await fs.writeFile(filepath, p.content);
        return { success: true, path: filepath };
    },
    async read_file(p) {
        const content = await fs.readFile(p.filepath, "utf-8");
        return { content };
    },
    async summarize(p) {
        if (!anthropic)
            return { summary: p.text.slice(0, 200) + "..." };
        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514", max_tokens: 500,
            messages: [{ role: "user", content: "Summarize:\n\n" + p.text }]
        });
        return { summary: msg.content[0].type === "text" ? msg.content[0].text : "" };
    }
};
//# sourceMappingURL=handlers.js.map