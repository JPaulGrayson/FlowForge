import { v4 as uuidv4 } from "uuid";
import type { Workflow, WorkflowExecution, WorkflowNode, AgentNodeConfig } from "../types/workflow.js";

const QUACK_API = process.env.QUACK_API_URL || "https://quack.us.com";

// Global registry to track active executions for callback handling
const activeExecutors: Map<string, WorkflowExecutor> = new Map();

export function getExecutorByMessageId(messageId: string): WorkflowExecutor | undefined {
  for (const executor of activeExecutors.values()) {
    if (executor.hasPendingTask(messageId)) {
      return executor;
    }
  }
  return undefined;
}

export class WorkflowExecutor {
  private id: string;
  private tools: Map<string, Function> = new Map();
  private pendingAgentTasks: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout; cancelled: boolean }> = new Map();
  
  constructor(private _config: any = {}) {
    this.id = uuidv4();
    activeExecutors.set(this.id, this);
  }
  
  destroy() {
    activeExecutors.delete(this.id);
    for (const [_, task] of this.pendingAgentTasks) {
      clearTimeout(task.timeout);
      task.cancelled = true;
    }
    this.pendingAgentTasks.clear();
  }
  
  hasPendingTask(messageId: string): boolean {
    return this.pendingAgentTasks.has(messageId);
  }
  
  registerTool(name: string, fn: Function) { 
    this.tools.set(name, fn); 
  }
  
  async execute(wf: Workflow, inputs: any): Promise<WorkflowExecution> {
    const ex: WorkflowExecution = { 
      id: uuidv4(), 
      workflowId: wf.id, 
      status: "running", 
      inputs, 
      history: [], 
      variables: { ...inputs }, 
      nodeOutputs: {}, 
      startedAt: new Date().toISOString() 
    };
    
    const nodeMap = new Map(wf.nodes.map(n => [n.id, n]));
    const edgeMap = new Map<string, typeof wf.edges>();
    wf.edges.forEach(e => {
      if (!edgeMap.has(e.sourceNodeId)) edgeMap.set(e.sourceNodeId, []);
      edgeMap.get(e.sourceNodeId)!.push(e);
    });
    
    const visited = new Set<string>();
    
    const executeNode = async (nodeId: string): Promise<void> => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node) return;
      
      ex.currentNodeId = nodeId;
      const historyEntry: { 
        nodeId: string; 
        startedAt: string; 
        status: 'running' | 'completed' | 'failed' | 'skipped';
        completedAt?: string;
        output?: any;
        error?: string;
      } = { 
        nodeId, 
        startedAt: new Date().toISOString(), 
        status: 'running'
      };
      ex.history.push(historyEntry);
      
      try {
        let output: any = null;
        
        switch (node.type) {
          case 'start':
            output = ex.inputs;
            break;
            
          case 'end':
            ex.outputs = ex.variables;
            break;
            
          case 'tool':
            if (node.config?.toolName) {
              const fn = this.tools.get(node.config.toolName);
              if (fn) {
                output = await fn(this.resolveParameters(node.config.parameters, ex), ex);
              }
            }
            break;
            
          case 'agent':
            output = await this.executeAgentNode(node, ex);
            break;
            
          case 'decision':
            const condition = this.evaluateCondition(node.config?.condition, ex);
            const edges = edgeMap.get(nodeId) || [];
            const targetEdge = edges.find(e => 
              (condition && (e.label?.toLowerCase() === 'yes' || e.condition?.operator === 'isTrue')) ||
              (!condition && (e.label?.toLowerCase() === 'no' || e.condition?.operator === 'isFalse'))
            );
            if (targetEdge) {
              await executeNode(targetEdge.targetNodeId);
            }
            historyEntry.status = 'completed';
            historyEntry.completedAt = new Date().toISOString();
            return;
            
          case 'human':
            ex.status = 'paused';
            historyEntry.status = 'completed';
            historyEntry.completedAt = new Date().toISOString();
            historyEntry.output = { waitingFor: 'human_input', nodeId };
            return;
            
          case 'council':
            output = await this.executeCouncilNode(node, ex);
            break;
        }
        
        if (output !== null && output !== undefined) {
          ex.nodeOutputs[nodeId] = output;
          ex.variables[node.label] = output;
        }
        
        historyEntry.status = 'completed';
        historyEntry.completedAt = new Date().toISOString();
        historyEntry.output = output;
        
        const nextEdges = edgeMap.get(nodeId) || [];
        for (const edge of nextEdges) {
          await executeNode(edge.targetNodeId);
        }
        
      } catch (error: any) {
        historyEntry.status = 'failed';
        historyEntry.completedAt = new Date().toISOString();
        historyEntry.error = error.message;
        
        if (!wf.config.continueOnError) {
          ex.status = 'failed';
          ex.error = { message: error.message, nodeId };
          throw error;
        }
      }
    };
    
    try {
      await executeNode(wf.startNodeId);
      if (ex.status === 'running') {
        ex.status = 'completed';
      }
    } catch (error: any) {
      if (ex.status !== 'failed') {
        ex.status = 'failed';
        ex.error = { message: error.message };
      }
    }
    
    ex.completedAt = new Date().toISOString();
    
    // Clean up executor from registry after completion
    if (ex.status === 'completed' || ex.status === 'failed') {
      this.destroy();
    }
    
    return ex;
  }
  
  private async executeAgentNode(node: WorkflowNode, ex: WorkflowExecution): Promise<any> {
    const config = node.config as AgentNodeConfig;
    const prompt = this.resolveTemplate(config.prompt, ex);
    const timeout = config.timeout || 60000;
    
    console.log(`[WorkflowExecutor] Dispatching to agent: ${config.agentInbox}`);
    console.log(`[WorkflowExecutor] Prompt: ${prompt.substring(0, 100)}...`);
    
    const messageId = uuidv4();
    
    try {
      const response = await fetch(`${QUACK_API}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.agentInbox,
          from: 'orchestrate/workflow',
          task: prompt,
          metadata: {
            workflow_id: ex.workflowId,
            execution_id: ex.id,
            node_id: node.id,
            message_id: messageId,
            callback_url: `${process.env.REPLIT_DEV_DOMAIN || 'https://orchestrate.us.com'}/api/workflow-callback`
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send to agent: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`[WorkflowExecutor] Message sent to ${config.agentInbox}, id: ${result.id || messageId}`);
      
      const agentResponse = await this.waitForAgentResponse(result.id || messageId, timeout);
      
      return agentResponse;
      
    } catch (error: any) {
      console.error(`[WorkflowExecutor] Agent dispatch failed:`, error.message);
      throw error;
    }
  }
  
  private waitForAgentResponse(messageId: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = this.pendingAgentTasks.get(messageId);
        if (pending && !pending.cancelled) {
          pending.cancelled = true;
          this.pendingAgentTasks.delete(messageId);
          reject(new Error(`Agent response timeout after ${timeout}ms`));
        }
      }, timeout);
      
      this.pendingAgentTasks.set(messageId, { resolve, reject, timeout: timeoutId, cancelled: false });
      
      this.pollForResponse(messageId, timeout);
    });
  }
  
  private async pollForResponse(messageId: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000;
    
    while (Date.now() - startTime < timeout) {
      const pending = this.pendingAgentTasks.get(messageId);
      if (!pending || pending.cancelled) {
        return;
      }
      
      try {
        const response = await fetch(`${QUACK_API}/api/quack/status/${messageId}`);
        if (response.ok) {
          const message = await response.json();
          if (message.status === 'completed' && message.response) {
            if (!pending.cancelled) {
              clearTimeout(pending.timeout);
              pending.cancelled = true;
              pending.resolve(message.response);
              this.pendingAgentTasks.delete(messageId);
            }
            return;
          } else if (message.status === 'failed') {
            if (!pending.cancelled) {
              clearTimeout(pending.timeout);
              pending.cancelled = true;
              pending.reject(new Error(message.error || 'Agent task failed'));
              this.pendingAgentTasks.delete(messageId);
            }
            return;
          }
        }
      } catch (error) {
        console.error(`[WorkflowExecutor] Poll error:`, error);
      }
      
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }
  
  handleAgentCallback(messageId: string, response: any, status: 'completed' | 'failed') {
    const pending = this.pendingAgentTasks.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      if (status === 'completed') {
        pending.resolve(response);
      } else {
        pending.reject(new Error(response?.error || 'Agent task failed'));
      }
      this.pendingAgentTasks.delete(messageId);
    }
  }
  
  private async executeCouncilNode(node: WorkflowNode, ex: WorkflowExecution): Promise<any> {
    const prompt = this.resolveTemplate(node.config?.prompt || '', ex);
    const models = node.config?.models || ['claude'];
    
    try {
      const response = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'council_query',
          params: { prompt, models }
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[WorkflowExecutor] Council query failed:', error);
    }
    
    return null;
  }
  
  private resolveParameters(params: any, ex: WorkflowExecution): any {
    if (!params) return {};
    
    const resolved: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object' && value !== null) {
        const paramValue = value as any;
        if (paramValue.type === 'reference') {
          resolved[key] = this.getValueByPath(ex.variables, paramValue.path || paramValue.source);
        } else if (paramValue.type === 'template') {
          resolved[key] = this.resolveTemplate(paramValue.template, ex);
        } else if (paramValue.type === 'static') {
          resolved[key] = paramValue.value;
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
  
  private resolveTemplate(template: string, ex: WorkflowExecution): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.getValueByPath(ex.variables, path);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }
  
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private evaluateCondition(condition: string | undefined, ex: WorkflowExecution): boolean {
    if (!condition) return true;
    
    try {
      const resolvedCondition = this.resolveTemplate(condition, ex);
      return Boolean(eval(resolvedCondition));
    } catch {
      return false;
    }
  }
}

export function createExecutor(c: any = {}) { 
  return new WorkflowExecutor(c); 
}
