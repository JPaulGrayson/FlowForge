export interface Workflow { id: string; name: string; description: string; version: string; sourcePrompt?: string; config: WorkflowConfig; inputs: WorkflowInput[]; outputs: WorkflowOutput[]; nodes: WorkflowNode[]; edges: WorkflowEdge[]; startNodeId: string; metadata: WorkflowMetadata; }
export interface WorkflowConfig { timeout?: number; maxParallelism?: number; continueOnError?: boolean; }
export interface WorkflowMetadata { author?: string; createdAt: string; updatedAt: string; tags?: string[]; visibility: 'private' | 'team' | 'public'; }
export interface WorkflowInput { name: string; label: string; type: string; required: boolean; defaultValue?: any; }
export interface WorkflowOutput { name: string; label: string; type: string; sourceNodeId: string; }
export type NodeType = 'start' | 'end' | 'tool' | 'decision' | 'loop' | 'parallel' | 'join' | 'human' | 'council' | 'agent';

export interface AgentNodeConfig {
  agentInbox: string;
  prompt: string;
  timeout?: number;
  directMessage?: boolean;
}
export interface WorkflowNode { id: string; type: NodeType; label: string; description?: string; config: any; position?: { x: number; y: number }; }
export interface WorkflowEdge { id: string; sourceNodeId: string; targetNodeId: string; label?: string; condition?: BranchCondition; }
export interface BranchCondition { operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty' | 'isTrue' | 'isFalse'; value?: any; }
export interface WorkflowExecution { id: string; workflowId: string; status: ExecutionStatus; inputs: Record<string, any>; currentNodeId?: string; history: ExecutionHistoryEntry[]; variables: Record<string, any>; nodeOutputs: Record<string, any>; outputs?: Record<string, any>; error?: ExecutionError; startedAt: string; completedAt?: string; }
export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export interface ExecutionHistoryEntry { nodeId: string; startedAt: string; completedAt?: string; status: 'running' | 'completed' | 'failed' | 'skipped'; output?: any; error?: string; }
export interface ExecutionError { message: string; nodeId?: string; code?: string; }
export type ParameterValue = StaticValue | ParameterReference | TemplateValue;
export interface StaticValue { type: 'static'; value: any; }
export interface ParameterReference { type: 'reference'; source: string; path?: string; }
export interface TemplateValue { type: 'template'; template: string; }
