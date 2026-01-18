import type { Workflow } from "../types/workflow.js";

export class LogicArtAdapter {
  constructor(private config: { serverUrl: string }) {}
  
  async visualize(wf: Workflow): Promise<string> {
    const jsCode = workflowToJavaScript(wf);
    const encoded = encodeURIComponent(jsCode);
    return this.config.serverUrl + "/?code=" + encoded;
  }
}

export function workflowToJavaScript(wf: Workflow): string {
  const lines: string[] = [];
  lines.push(`// ${wf.name}`);
  lines.push(`// ${wf.description || ''}`);
  lines.push('');
  lines.push(`async function ${sanitizeName(wf.name)}(input) {`);
  
  const nodeMap = new Map(wf.nodes.map(n => [n.id, n]));
  const edgeMap = new Map<string, typeof wf.edges>();
  wf.edges.forEach(e => {
    if (!edgeMap.has(e.sourceNodeId)) edgeMap.set(e.sourceNodeId, []);
    edgeMap.get(e.sourceNodeId)!.push(e);
  });
  
  const visited = new Set<string>();
  
  function processNode(nodeId: string, indent: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    const outEdges = edgeMap.get(nodeId) || [];
    
    switch (node.type) {
      case 'start':
        lines.push(`${indent}// Start: ${node.label}`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent));
        break;
        
      case 'end':
        lines.push(`${indent}return result; // ${node.label}`);
        break;
        
      case 'tool':
        lines.push(`${indent}const ${sanitizeName(node.label)} = await ${node.config?.toolName || 'executeTool'}();`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent));
        break;
        
      case 'decision':
        lines.push(`${indent}if (${node.config?.condition || 'condition'}) {`);
        const yesEdge = outEdges.find(e => e.label?.toLowerCase() === 'yes' || e.condition?.operator === 'isNotEmpty');
        const noEdge = outEdges.find(e => e.label?.toLowerCase() === 'no' || e.condition?.operator === 'isEmpty');
        if (yesEdge) processNode(yesEdge.targetNodeId, indent + '  ');
        lines.push(`${indent}} else {`);
        if (noEdge) processNode(noEdge.targetNodeId, indent + '  ');
        lines.push(`${indent}}`);
        break;
        
      case 'parallel':
        lines.push(`${indent}const results = await Promise.all([`);
        outEdges.forEach((e, i) => {
          lines.push(`${indent}  task${i + 1}(),`);
        });
        lines.push(`${indent}]);`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent));
        break;
        
      case 'loop':
        lines.push(`${indent}for (const item of items) {`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent + '  '));
        lines.push(`${indent}}`);
        break;
        
      case 'human':
        lines.push(`${indent}const humanInput = await waitForHumanInput(); // ${node.label}`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent));
        break;
        
      case 'council':
        lines.push(`${indent}const consensus = await queryAICouncil(); // ${node.label}`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent));
        break;
        
      default:
        lines.push(`${indent}// ${node.label}`);
        outEdges.forEach(e => processNode(e.targetNodeId, indent));
    }
  }
  
  processNode(wf.startNodeId, '  ');
  lines.push('}');
  
  return lines.join('\n');
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/^[0-9]/, '_');
}

export function createLogicArtAdapter(cfg: { serverUrl: string }) { 
  return new LogicArtAdapter(cfg); 
}
