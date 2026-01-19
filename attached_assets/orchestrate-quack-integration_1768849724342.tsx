/**
 * Orchestrate + Quack Integration
 * 
 * This file contains:
 * 1. QuackPoller - Service to poll Quack inboxes
 * 2. AgentTiles - React component for the control room UI
 * 3. MCP Tool definitions for Quack operations
 */

// =============================================================================
// PART 1: QUACK POLLER SERVICE
// =============================================================================

const QUACK_API_BASE = 'https://quack.us.com/api';

interface QuackMessage {
  id: string;
  to: string;
  from: string;
  task: string;
  context?: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed';
  files?: any[];
}

interface InboxState {
  name: string;
  messages: QuackMessage[];
  pendingCount: number;
  lastChecked: Date;
}

class QuackPoller {
  private inboxes: Map<string, InboxState> = new Map();
  private pollInterval: number = 5000; // 5 seconds
  private intervalId: NodeJS.Timeout | null = null;
  private onUpdate: ((inboxes: Map<string, InboxState>) => void) | null = null;

  // Inboxes to monitor - add more as needed
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
    // Initial check
    this.checkAllInboxes();
    
    // Start polling
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

  // Workflow actions
  async approveMessage(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${QUACK_API_BASE}/approve/${messageId}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await this.checkAllInboxes(); // Refresh
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
        await this.checkAllInboxes(); // Refresh
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

// =============================================================================
// PART 2: REACT COMPONENTS FOR CONTROL ROOM UI
// =============================================================================

// Note: This uses React with Tailwind CSS classes

import React, { useState, useEffect } from 'react';

// Status badge colors
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-blue-500',
  in_progress: 'bg-purple-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500'
};

// Individual Agent Tile Component
interface AgentTileProps {
  inbox: InboxState;
  onSelect: (inbox: InboxState) => void;
}

const AgentTile: React.FC<AgentTileProps> = ({ inbox, onSelect }) => {
  const latestMessage = inbox.messages[0];
  
  return (
    <div 
      className={`
        bg-gray-800 rounded-lg p-4 cursor-pointer transition-all
        hover:bg-gray-700 hover:scale-105
        ${inbox.pendingCount > 0 ? 'ring-2 ring-yellow-500' : ''}
      `}
      onClick={() => onSelect(inbox)}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">/{inbox.name}</h3>
        <span className={`
          px-2 py-1 rounded-full text-xs font-bold
          ${inbox.pendingCount > 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-gray-300'}
        `}>
          {inbox.pendingCount} pending
        </span>
      </div>
      
      {latestMessage ? (
        <div className="text-sm text-gray-400">
          <p className="text-cyan-400">From: {latestMessage.from}</p>
          <p className="truncate">{latestMessage.task}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(latestMessage.timestamp).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No messages yet</p>
      )}
    </div>
  );
};

// Message Detail Modal Component
interface MessageModalProps {
  message: QuackMessage;
  onClose: () => void;
  onApprove: (id: string) => void;
  onStartWork: (id: string) => void;
  onComplete: (id: string) => void;
  onFail: (id: string) => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ 
  message, onClose, onApprove, onStartWork, onComplete, onFail 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-400">Message Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Task</label>
            <p className="text-white">{message.task}</p>
          </div>
          
          <div>
            <label className="text-gray-400 text-sm">From → To</label>
            <p className="text-white">{message.from} → {message.to}</p>
          </div>
          
          <div>
            <label className="text-gray-400 text-sm">Status</label>
            <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${statusColors[message.status]}`}>
              {message.status}
            </span>
          </div>
          
          <div>
            <label className="text-gray-400 text-sm">Time</label>
            <p className="text-white">{new Date(message.timestamp).toLocaleString()}</p>
          </div>
          
          {message.context && (
            <div>
              <label className="text-gray-400 text-sm">Context</label>
              <p className="text-white">{message.context}</p>
            </div>
          )}
        </div>
        
        {/* Workflow Action Buttons */}
        <div className="flex gap-3 mt-6 flex-wrap">
          {message.status === 'pending' && (
            <button 
              onClick={() => onApprove(message.id)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded"
            >
              ✓ Approve
            </button>
          )}
          
          {message.status === 'approved' && (
            <button 
              onClick={() => onStartWork(message.id)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              ▶ Start Work
            </button>
          )}
          
          {message.status === 'in_progress' && (
            <>
              <button 
                onClick={() => onComplete(message.id)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                ✓ Complete
              </button>
              <button 
                onClick={() => onFail(message.id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                ✗ Mark Failed
              </button>
            </>
          )}
          
          <button 
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Control Room Component
const ControlRoom: React.FC = () => {
  const [inboxes, setInboxes] = useState<Map<string, InboxState>>(new Map());
  const [selectedInbox, setSelectedInbox] = useState<InboxState | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<QuackMessage | null>(null);
  const [poller] = useState(() => new QuackPoller(setInboxes));

  useEffect(() => {
    poller.start();
    return () => poller.stop();
  }, [poller]);

  const handleApprove = async (id: string) => {
    await poller.approveMessage(id);
    setSelectedMessage(null);
  };

  const handleStartWork = async (id: string) => {
    await poller.updateStatus(id, 'in_progress');
    setSelectedMessage(null);
  };

  const handleComplete = async (id: string) => {
    await poller.updateStatus(id, 'completed');
    setSelectedMessage(null);
  };

  const handleFail = async (id: string) => {
    await poller.updateStatus(id, 'failed');
    setSelectedMessage(null);
  };

  // Calculate totals
  const totalMessages = Array.from(inboxes.values()).reduce(
    (sum, inbox) => sum + inbox.messages.length, 0
  );
  const totalPending = Array.from(inboxes.values()).reduce(
    (sum, inbox) => sum + inbox.pendingCount, 0
  );

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-3xl font-bold text-center text-cyan-400 mb-2">
        🦆 Quack Control Room
      </h1>
      <p className="text-center text-gray-400 mb-6">
        Monitor and approve agent messages
      </p>
      
      {/* Stats */}
      <div className="flex justify-center gap-8 mb-8">
        <div className="bg-gray-800 rounded-lg px-6 py-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">{inboxes.size}</div>
          <div className="text-gray-400 text-sm">Inboxes</div>
        </div>
        <div className="bg-gray-800 rounded-lg px-6 py-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">{totalMessages}</div>
          <div className="text-gray-400 text-sm">Messages</div>
        </div>
        <div className="bg-gray-800 rounded-lg px-6 py-3 text-center">
          <div className="text-2xl font-bold text-yellow-500">{totalPending}</div>
          <div className="text-gray-400 text-sm">Pending</div>
        </div>
      </div>
      
      {/* Agent Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {Array.from(inboxes.values()).map(inbox => (
          <AgentTile 
            key={inbox.name} 
            inbox={inbox} 
            onSelect={setSelectedInbox}
          />
        ))}
      </div>
      
      {/* Inbox Detail Sidebar */}
      {selectedInbox && (
        <div className="fixed right-0 top-0 h-full w-96 bg-gray-800 shadow-xl p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-cyan-400">/{selectedInbox.name}</h2>
            <button 
              onClick={() => setSelectedInbox(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {selectedInbox.messages.map(message => (
              <div 
                key={message.id}
                className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600"
                onClick={() => setSelectedMessage(message)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-cyan-400 text-sm">From: {message.from}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[message.status]}`}>
                    {message.status}
                  </span>
                </div>
                <p className="text-white text-sm truncate">{message.task}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {new Date(message.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Message Detail Modal */}
      {selectedMessage && (
        <MessageModal
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onApprove={handleApprove}
          onStartWork={handleStartWork}
          onComplete={handleComplete}
          onFail={handleFail}
        />
      )}
    </div>
  );
};

// =============================================================================
// PART 3: MCP TOOL DEFINITIONS
// =============================================================================

// Add these to Orchestrate's MCP server tools array:

const quackTools = [
  {
    name: "quack_check_inbox",
    description: "Check a Quack inbox for pending messages",
    inputSchema: {
      type: "object",
      properties: {
        inbox: {
          type: "string",
          description: "Inbox name to check (e.g., 'claude', 'replit', 'cursor')"
        }
      },
      required: ["inbox"]
    }
  },
  {
    name: "quack_approve",
    description: "Approve a pending message to allow the receiving agent to proceed",
    inputSchema: {
      type: "object",
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the message to approve"
        }
      },
      required: ["messageId"]
    }
  },
  {
    name: "quack_update_status",
    description: "Update the status of a message (in_progress, completed, failed)",
    inputSchema: {
      type: "object",
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the message to update"
        },
        status: {
          type: "string",
          enum: ["in_progress", "completed", "failed"],
          description: "The new status"
        }
      },
      required: ["messageId", "status"]
    }
  },
  {
    name: "quack_send",
    description: "Send a message to another agent via Quack",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Destination inbox (e.g., 'replit', 'cursor', 'claude')"
        },
        task: {
          type: "string",
          description: "The task or message to send"
        },
        context: {
          type: "string",
          description: "Optional context or background information"
        }
      },
      required: ["to", "task"]
    }
  }
];

// MCP Tool Handlers
async function handleQuackTool(name: string, args: any) {
  const poller = new QuackPoller();
  
  switch (name) {
    case 'quack_check_inbox':
      const inbox = await poller.checkInbox(args.inbox);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(inbox, null, 2)
        }]
      };
      
    case 'quack_approve':
      const approved = await poller.approveMessage(args.messageId);
      return {
        content: [{
          type: 'text',
          text: approved ? 'Message approved successfully' : 'Failed to approve message'
        }]
      };
      
    case 'quack_update_status':
      const updated = await poller.updateStatus(args.messageId, args.status);
      return {
        content: [{
          type: 'text',
          text: updated ? `Status updated to ${args.status}` : 'Failed to update status'
        }]
      };
      
    case 'quack_send':
      const sent = await poller.sendMessage(args.to, args.task, args.context);
      return {
        content: [{
          type: 'text',
          text: sent ? 'Message sent successfully' : 'Failed to send message'
        }]
      };
      
    default:
      throw new Error(`Unknown Quack tool: ${name}`);
  }
}

export { QuackPoller, ControlRoom, quackTools, handleQuackTool };
export type { QuackMessage, InboxState };
