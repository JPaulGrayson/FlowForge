import * as fs from "fs/promises";
import * as path from "path";
const WORKFLOW_DIR = "./workflows/saved";
export async function saveWorkflow(wf) {
    await fs.mkdir(WORKFLOW_DIR, { recursive: true });
    const filepath = path.join(WORKFLOW_DIR, wf.id + ".json");
    await fs.writeFile(filepath, JSON.stringify(wf, null, 2));
    return filepath;
}
export async function loadWorkflow(id) {
    try {
        const filepath = path.join(WORKFLOW_DIR, id + ".json");
        const data = await fs.readFile(filepath, "utf-8");
        return JSON.parse(data);
    }
    catch {
        return null;
    }
}
export async function listWorkflows() {
    try {
        await fs.mkdir(WORKFLOW_DIR, { recursive: true });
        const files = await fs.readdir(WORKFLOW_DIR);
        return files.filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
    }
    catch {
        return [];
    }
}
export async function deleteWorkflow(id) {
    try {
        await fs.unlink(path.join(WORKFLOW_DIR, id + ".json"));
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=persistence.js.map