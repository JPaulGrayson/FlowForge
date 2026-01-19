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
export declare class QuackPoller {
    private inboxes;
    private pollInterval;
    private intervalId;
    private onUpdate;
    private monitoredInboxes;
    constructor(onUpdate?: (inboxes: Map<string, InboxState>) => void);
    fetchAvailableInboxes(): Promise<string[]>;
    checkInbox(inboxName: string): Promise<InboxState>;
    checkAllInboxes(): Promise<Map<string, InboxState>>;
    start(): void;
    stop(): void;
    getInboxes(): Map<string, InboxState>;
    approveMessage(messageId: string): Promise<boolean>;
    updateStatus(messageId: string, status: string): Promise<boolean>;
    sendMessage(to: string, task: string, context?: string): Promise<boolean>;
}
export declare function createQuackPoller(onUpdate?: (inboxes: Map<string, InboxState>) => void): QuackPoller;
//# sourceMappingURL=poller.d.ts.map