const QUACK_API_BASE = 'https://quack.us.com/api';
const QUACK_URL = 'https://quack.us.com';
export const MY_INBOX = 'replit/orchestrate';
export class QuackPoller {
    constructor(onUpdate) {
        this.inboxes = new Map();
        this.pollInterval = 5000;
        this.intervalId = null;
        this.onUpdate = null;
        this.monitoredInboxes = [];
        this.onUpdate = onUpdate || null;
    }
    async fetchAvailableInboxes() {
        try {
            const response = await fetch(`${QUACK_API_BASE}/inboxes`);
            const data = await response.json();
            if (data.inboxes && Array.isArray(data.inboxes)) {
                this.monitoredInboxes = data.inboxes.map((inbox) => typeof inbox === 'string' ? inbox : inbox.name);
            }
            return this.monitoredInboxes;
        }
        catch (error) {
            console.error('Error fetching inboxes list:', error);
            return ['claude', 'replit', 'cursor', 'gpt', 'gemini', 'grok', 'copilot', 'antigravity', 'agent/autonomous'];
        }
    }
    async checkInbox(inboxName) {
        try {
            const response = await fetch(`${QUACK_API_BASE}/inbox/${inboxName}`);
            const data = await response.json();
            const messages = data.messages || [];
            const state = {
                name: inboxName,
                messages,
                pendingCount: messages.filter((m) => ['pending', 'approved', 'in_progress'].includes(m.status)).length,
                lastChecked: new Date()
            };
            this.inboxes.set(inboxName, state);
            return state;
        }
        catch (error) {
            console.error(`Error checking inbox ${inboxName}:`, error);
            return {
                name: inboxName,
                messages: [],
                pendingCount: 0,
                lastChecked: new Date()
            };
        }
    }
    async checkAllInboxes() {
        if (this.monitoredInboxes.length === 0) {
            await this.fetchAvailableInboxes();
        }
        await Promise.all(this.monitoredInboxes.map(inbox => this.checkInbox(inbox)));
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
    getInboxes() {
        return this.inboxes;
    }
    async approveMessage(messageId) {
        try {
            const response = await fetch(`${QUACK_API_BASE}/approve/${messageId}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                await this.checkAllInboxes();
            }
            return data.success || false;
        }
        catch (error) {
            console.error('Error approving message:', error);
            return false;
        }
    }
    async rejectMessage(messageId) {
        try {
            const response = await fetch(`${QUACK_API_BASE}/reject/${messageId}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                await this.checkAllInboxes();
            }
            return data.success || false;
        }
        catch (error) {
            console.error('Error rejecting message:', error);
            return false;
        }
    }
    async updateStatus(messageId, status) {
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
            return data.success || false;
        }
        catch (error) {
            console.error('Error updating status:', error);
            return false;
        }
    }
    async sendMessage(to, task, context, options) {
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
            const data = await response.json();
            return data.success || false;
        }
        catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }
    async fetchAuditLogs(options) {
        try {
            const params = new URLSearchParams();
            if (options?.limit)
                params.set('limit', options.limit.toString());
            if (options?.offset)
                params.set('offset', options.offset.toString());
            if (options?.action)
                params.set('action', options.action);
            if (options?.actor)
                params.set('actor', options.actor);
            if (options?.targetType)
                params.set('targetType', options.targetType);
            if (options?.targetId)
                params.set('targetId', options.targetId);
            if (options?.since)
                params.set('since', options.since);
            if (options?.until)
                params.set('until', options.until);
            const url = `${QUACK_API_BASE}/audit${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching audit logs:', error);
            return { logs: [], total: 0 };
        }
    }
    async fetchAuditStats() {
        try {
            const response = await fetch(`${QUACK_API_BASE}/audit/stats`);
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching audit stats:', error);
            return { totalLogs: 0, byAction: {}, byActor: {}, recentActivity: 0 };
        }
    }
    async fetchAgents() {
        try {
            const response = await fetch(`${QUACK_API_BASE}/agents`);
            const data = await response.json();
            return data.agents || [];
        }
        catch (error) {
            console.error('Error fetching agents:', error);
            return [];
        }
    }
    async pingAgent(platform, name) {
        try {
            const response = await fetch(`${QUACK_API_BASE}/agents/${platform}/${name}/ping`, {
                method: 'POST'
            });
            const data = await response.json();
            return data.success || false;
        }
        catch (error) {
            console.error('Error pinging agent:', error);
            return false;
        }
    }
    async fetchThreads() {
        try {
            const response = await fetch(`${QUACK_API_BASE}/threads`);
            const data = await response.json();
            return data.threads || [];
        }
        catch (error) {
            console.error('Error fetching threads:', error);
            return [];
        }
    }
    async fetchThread(threadId) {
        try {
            const response = await fetch(`${QUACK_API_BASE}/thread/${threadId}`);
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching thread:', error);
            return null;
        }
    }
    async archiveThread(threadId) {
        try {
            const response = await fetch(`${QUACK_API_BASE}/archive/${threadId}`, {
                method: 'POST'
            });
            const data = await response.json();
            return data.success || false;
        }
        catch (error) {
            console.error('Error archiving thread:', error);
            return false;
        }
    }
    async fetchArchivedThreads() {
        try {
            const response = await fetch(`${QUACK_API_BASE}/archive`);
            const data = await response.json();
            return data.threads || [];
        }
        catch (error) {
            console.error('Error fetching archived threads:', error);
            return [];
        }
    }
}
export function createQuackPoller(onUpdate) {
    return new QuackPoller(onUpdate);
}
