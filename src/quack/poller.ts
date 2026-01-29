const QUACK_API_BASE = 'https://quack.us.com/api';
const QUACK_URL = 'https://quack.us.com';
export const MY_INBOX = 'replit/orchestrate';

export interface QuackMessage {
  id: string;
  to: string;
  from: string;
  task: string;
  context?: string;
  timestamp: string;
  expiresAt?: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  files?: any[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  project?: string;
  routing?: 'direct' | 'cowork';
  threadId?: string;
  replyTo?: string;
}

export interface InboxState {
  name: string;
  messages: QuackMessage[];
  pendingCount: number;
  lastChecked: Date;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string;
  details?: any;
  ipAddress?: string;
}

export interface AuditResponse {
  logs: AuditLog[];
  total: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byActor: Record<string, number>;
  recentActivity: number;
}

export interface QuackAgent {
  platform: string;
  name: string;
  displayName?: string;
  description?: string;
  capabilities?: string[];
  webhookUrl?: string;
  status?: 'online' | 'offline' | 'unknown';
  lastSeen?: string;
  owner?: string;
}

export interface QuackThread {
  threadId: string;
  messages: QuackMessage[];
  participants: string[];
  createdAt: string;
  lastActivity: string;
}

export class QuackPoller {
  private inboxes: Map<string, InboxState> = new Map();
  private pollInterval: number = 5000;
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate: ((inboxes: Map<string, InboxState>) => void) | null = null;

  private monitoredInboxes: string[] = [];

  constructor(onUpdate?: (inboxes: Map<string, InboxState>) => void) {
    this.onUpdate = onUpdate || null;
  }

  async fetchAvailableInboxes(): Promise<string[]> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/inboxes`);
      const data = await response.json() as { inboxes?: Array<string | { name: string }> };
      if (data.inboxes && Array.isArray(data.inboxes)) {
        this.monitoredInboxes = data.inboxes.map((inbox) => 
          typeof inbox === 'string' ? inbox : inbox.name
        );
      }
      return this.monitoredInboxes;
    } catch (error) {
      console.error('Error fetching inboxes list:', error);
      return ['claude', 'replit', 'cursor', 'gpt', 'gemini', 'grok', 'copilot', 'antigravity', 'agent/autonomous'];
    }
  }

  async checkInbox(inboxName: string): Promise<InboxState> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/inbox/${inboxName}`);
      const data = await response.json() as { messages?: QuackMessage[] };
      
      const messages = data.messages || [];
      const state: InboxState = {
        name: inboxName,
        messages,
        pendingCount: messages.filter(
          (m) => ['pending', 'approved', 'in_progress'].includes(m.status)
        ).length,
        lastChecked: new Date()
      };
      
      this.inboxes.set(inboxName, state);
      return state;
    } catch (error) {
      console.error(`Error checking inbox ${inboxName}:`, error);
      return {
        name: inboxName,
        messages: [],
        pendingCount: 0,
        lastChecked: new Date()
      };
    }
  }

  async checkAllInboxes(): Promise<Map<string, InboxState>> {
    if (this.monitoredInboxes.length === 0) {
      await this.fetchAvailableInboxes();
    }
    
    await Promise.all(
      this.monitoredInboxes.map(inbox => this.checkInbox(inbox))
    );
    
    if (this.onUpdate) {
      this.onUpdate(this.inboxes);
    }
    
    return this.inboxes;
  }

  start() {
    this.checkAllInboxes();
    this.intervalId = setInterval(() => {
      this.checkAllInboxes();
    }, this.pollInterval);
    console.log('QuackPoller started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('QuackPoller stopped');
  }

  getInboxes(): Map<string, InboxState> {
    return this.inboxes;
  }

  async approveMessage(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/approve/${messageId}`, {
        method: 'POST'
      });
      const data = await response.json() as { success?: boolean };
      if (data.success) {
        await this.checkAllInboxes();
      }
      return data.success || false;
    } catch (error) {
      console.error('Error approving message:', error);
      return false;
    }
  }

  async rejectMessage(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/reject/${messageId}`, {
        method: 'POST'
      });
      const data = await response.json() as { success?: boolean };
      if (data.success) {
        await this.checkAllInboxes();
      }
      return data.success || false;
    } catch (error) {
      console.error('Error rejecting message:', error);
      return false;
    }
  }

  async updateStatus(messageId: string, status: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/status/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json() as { success?: boolean };
      if (data.success) {
        await this.checkAllInboxes();
      }
      return data.success || false;
    } catch (error) {
      console.error('Error updating status:', error);
      return false;
    }
  }

  async sendMessage(to: string, task: string, context?: string, options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    project?: string;
    replyTo?: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to, 
          from: MY_INBOX, 
          task,
          context,
          ...options
        })
      });
      const data = await response.json() as { success?: boolean };
      return data.success || false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  async fetchAuditLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    actor?: string;
    targetType?: string;
    targetId?: string;
    since?: string;
    until?: string;
  }): Promise<AuditResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.offset) params.set('offset', options.offset.toString());
      if (options?.action) params.set('action', options.action);
      if (options?.actor) params.set('actor', options.actor);
      if (options?.targetType) params.set('targetType', options.targetType);
      if (options?.targetId) params.set('targetId', options.targetId);
      if (options?.since) params.set('since', options.since);
      if (options?.until) params.set('until', options.until);
      
      const url = `${QUACK_API_BASE}/audit${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json() as AuditResponse;
      return data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return { logs: [], total: 0 };
    }
  }

  async fetchAuditStats(): Promise<AuditStats> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/audit/stats`);
      const data = await response.json() as AuditStats;
      return data;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return { totalLogs: 0, byAction: {}, byActor: {}, recentActivity: 0 };
    }
  }

  async fetchAgents(): Promise<QuackAgent[]> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/agents`);
      const data = await response.json() as { agents?: QuackAgent[] };
      return data.agents || [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  }

  async pingAgent(platform: string, name: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/agents/${platform}/${name}/ping`, {
        method: 'POST'
      });
      const data = await response.json() as { success?: boolean };
      return data.success || false;
    } catch (error) {
      console.error('Error pinging agent:', error);
      return false;
    }
  }

  async fetchThreads(): Promise<QuackThread[]> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/threads`);
      const data = await response.json() as { threads?: QuackThread[] };
      return data.threads || [];
    } catch (error) {
      console.error('Error fetching threads:', error);
      return [];
    }
  }

  async fetchThread(threadId: string): Promise<QuackThread | null> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/thread/${threadId}`);
      const data = await response.json() as QuackThread;
      return data;
    } catch (error) {
      console.error('Error fetching thread:', error);
      return null;
    }
  }

  async archiveThread(threadId: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/archive/${threadId}`, {
        method: 'POST'
      });
      const data = await response.json() as { success?: boolean };
      return data.success || false;
    } catch (error) {
      console.error('Error archiving thread:', error);
      return false;
    }
  }

  async fetchArchivedThreads(): Promise<QuackThread[]> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/archive`);
      const data = await response.json() as { threads?: QuackThread[] };
      return data.threads || [];
    } catch (error) {
      console.error('Error fetching archived threads:', error);
      return [];
    }
  }
}

export function createQuackPoller(onUpdate?: (inboxes: Map<string, InboxState>) => void): QuackPoller {
  return new QuackPoller(onUpdate);
}
