const QUACK_API_BASE = 'https://quack.us.com/api';
export class QuackPoller {
    inboxes = new Map();
    pollInterval = 5000;
    intervalId = null;
    onUpdate = null;
    monitoredInboxes = [];
    constructor(onUpdate) {
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
            return ['claude', 'replit', 'cursor', 'gpt', 'gemini', 'grok', 'copilot', 'antigravity'];
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
    async sendMessage(to, task, context) {
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
            return data.success || false;
        }
        catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }
}
export function createQuackPoller(onUpdate) {
    return new QuackPoller(onUpdate);
}
//# sourceMappingURL=poller.js.map