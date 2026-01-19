const QUACK_API_BASE = 'https://quack.us.com/api';

export interface QuackMessage {
  id: string;
  to: string;
  from: string;
  task: string;
  context?: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed';
  files?: any[];
}

export interface InboxState {
  name: string;
  messages: QuackMessage[];
  pendingCount: number;
  lastChecked: Date;
}

export class QuackPoller {
  private inboxes: Map<string, InboxState> = new Map();
  private pollInterval: number = 5000;
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate: ((inboxes: Map<string, InboxState>) => void) | null = null;

  private monitoredInboxes = [
    'claude', 'replit', 'cursor', 'gpt', 'gemini', 'grok', 'copilot', 'antigravity'
  ];

  constructor(onUpdate?: (inboxes: Map<string, InboxState>) => void) {
    this.onUpdate = onUpdate || null;
  }

  async checkInbox(inboxName: string): Promise<InboxState> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/inbox/${inboxName}`);
      const data = await response.json();
      
      const state: InboxState = {
        name: inboxName,
        messages: data.messages || [],
        pendingCount: (data.messages || []).filter(
          (m: QuackMessage) => ['pending', 'approved', 'in_progress'].includes(m.status)
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
      const data = await response.json();
      if (data.success) {
        await this.checkAllInboxes();
      }
      return data.success;
    } catch (error) {
      console.error('Error approving message:', error);
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
      const data = await response.json();
      if (data.success) {
        await this.checkAllInboxes();
      }
      return data.success;
    } catch (error) {
      console.error('Error updating status:', error);
      return false;
    }
  }

  async sendMessage(to: string, task: string, context?: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to, 
          from: 'orchestrate', 
          task,
          context 
        })
      });
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
}

export function createQuackPoller(onUpdate?: (inboxes: Map<string, InboxState>) => void): QuackPoller {
  return new QuackPoller(onUpdate);
}
