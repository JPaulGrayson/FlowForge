document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadTools();
  loadWorkflows();
  loadControlRoom();
});

function initTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(t => t.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

async function loadTools() {
  const container = document.getElementById('tools-list');
  
  try {
    const response = await fetch('/api/mcp/tools');
    const data = await response.json();
    
    if (data.tools && data.tools.length > 0) {
      container.innerHTML = data.tools.map(tool => `
        <div class="tool-card">
          <h3>${tool.name}</h3>
          <p>${tool.description}</p>
          ${tool.inputSchema && tool.inputSchema.required ? 
            `<div class="tool-params">
              ${tool.inputSchema.required.map(p => `<span class="tag">${p}</span>`).join('')}
            </div>` : ''
          }
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="empty-state">No tools available</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="empty-state">Error loading tools: ${error.message}</p>`;
  }
}

async function loadWorkflows() {
  const container = document.getElementById('workflows-list');
  
  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'list_workflows', params: {} })
    });
    const data = await response.json();
    
    if (data.result && data.result.length > 0) {
      container.innerHTML = data.result.map(workflow => `
        <div class="workflow-card">
          <h3>${workflow.name || workflow.id}</h3>
          <p>${workflow.description || 'No description'}</p>
          ${workflow.metadata && workflow.metadata.tags ? 
            workflow.metadata.tags.map(t => `<span class="tag">${t}</span>`).join('') : ''
          }
          <div class="workflow-actions">
            <button class="btn-secondary" onclick="visualizeWorkflow('${workflow.id}')">
              Visualize
            </button>
            <button class="btn-secondary" onclick="loadWorkflow('${workflow.id}')">
              Load
            </button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No workflows saved yet</h3>
          <p>Use Claude Desktop or Cowork to generate and save workflows.</p>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No workflows saved yet</h3>
        <p>Use Claude Desktop or Cowork to generate and save workflows.</p>
      </div>
    `;
  }
}

window.refreshWorkflows = async function() {
  const container = document.getElementById('workflows-list');
  container.innerHTML = '<p class="loading">Loading workflows...</p>';
  await loadWorkflows();
};

window.visualizeWorkflow = async function(id) {
  try {
    const loadResponse = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'load_workflow', params: { id } })
    });
    const loadData = await loadResponse.json();
    
    if (loadData.result) {
      const vizResponse = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'visualize_workflow', params: { workflow: loadData.result } })
      });
      const vizData = await vizResponse.json();
      
      if (vizData.result && vizData.result.url) {
        window.open(vizData.result.url, '_blank');
      }
    }
  } catch (error) {
    alert('Error visualizing workflow: ' + error.message);
  }
};

window.loadWorkflow = async function(id) {
  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'load_workflow', params: { id } })
    });
    const data = await response.json();
    
    if (data.result) {
      showWorkflowDetail(data.result);
    }
  } catch (error) {
    alert('Error loading workflow: ' + error.message);
  }
}

function showWorkflowDetail(workflow) {
  const existing = document.getElementById('workflow-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'workflow-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
  
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  
  modal.innerHTML = `
    <div style="background:#1a1a2e;border-radius:16px;padding:30px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;color:#e0e0e0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="color:#00d9ff;margin:0;">${workflow.name || workflow.id}</h2>
        <button onclick="document.getElementById('workflow-modal').remove()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;">&times;</button>
      </div>
      <p style="color:#aaa;margin-bottom:20px;">${workflow.description || 'No description'}</p>
      
      <h3 style="color:#a855f7;margin-bottom:12px;">Nodes (${nodes.length})</h3>
      <div style="margin-bottom:20px;">
        ${nodes.map(n => `<span style="display:inline-block;background:rgba(168,85,247,0.2);color:#a855f7;padding:4px 10px;border-radius:12px;font-size:12px;margin:4px;">${n.label} (${n.type})</span>`).join('')}
      </div>
      
      <h3 style="color:#a855f7;margin-bottom:12px;">Edges (${edges.length})</h3>
      <div style="margin-bottom:20px;">
        ${edges.map(e => `<span style="display:inline-block;background:rgba(0,217,255,0.2);color:#00d9ff;padding:4px 10px;border-radius:12px;font-size:12px;margin:4px;">${e.sourceNodeId} → ${e.targetNodeId}</span>`).join('')}
      </div>
      
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button onclick="visualizeWorkflow('${workflow.id}')" class="btn-primary" style="background:linear-gradient(135deg,#00d9ff,#a855f7);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;">Visualize in LogicArt</button>
        <button onclick="copyWorkflowJson('${encodeURIComponent(JSON.stringify(workflow))}')" class="btn-secondary" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;">Copy JSON</button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
}

window.copyWorkflowJson = function(encoded) {
  const json = decodeURIComponent(encoded);
  navigator.clipboard.writeText(JSON.stringify(JSON.parse(json), null, 2));
  alert('Workflow JSON copied to clipboard!');
};

window.openHelpModal = function() {
  const existing = document.getElementById('help-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.className = 'help-modal';
  
  modal.innerHTML = `
    <div class="help-modal-content">
      <div class="help-modal-header">
        <h2>Help & Documentation</h2>
        <button class="help-close-btn" onclick="closeHelpModal()">&times;</button>
      </div>
      
      <div class="help-nav">
        <button class="help-nav-btn active" data-section="overview">Overview</button>
        <button class="help-nav-btn" data-section="setup">Setup</button>
        <button class="help-nav-btn" data-section="tools">Tools</button>
        <button class="help-nav-btn" data-section="api">API</button>
        <button class="help-nav-btn" data-section="schema">Schema</button>
        <button class="help-nav-btn" data-section="examples">Examples</button>
      </div>
      
      <div class="help-content">
        <div class="help-panel active" id="help-overview">
          <h3>What is Orchestrate?</h3>
          <p>Orchestrate is a visual workflow orchestration platform powered by AI. Design workflows in natural language, execute them with Claude tools, and visualize them with LogicArt.</p>
          
          <h3>Key Features</h3>
          <ul>
            <li><strong>Workflow Generation</strong> - Create workflows from natural language descriptions</li>
            <li><strong>LogicArt Visualization</strong> - Get interactive flowchart URLs instantly</li>
            <li><strong>AI Council</strong> - Query Claude, GPT-4, and Gemini simultaneously</li>
            <li><strong>Persistence</strong> - Save and load workflows for reuse</li>
            <li><strong>Web Search & Summarization</strong> - Built-in research tools</li>
          </ul>
          
          <h3>Example Commands</h3>
          <p>Try saying these to Claude:</p>
          <ul>
            <li>"Generate a workflow for processing customer feedback"</li>
            <li>"Visualize this workflow in LogicArt"</li>
            <li>"Ask the AI council about API design best practices"</li>
            <li>"Save this workflow for later"</li>
          </ul>
        </div>
        
        <div class="help-panel" id="help-setup">
          <h3>Claude Desktop Setup</h3>
          <ol>
            <li>Open Claude Desktop settings</li>
            <li>Navigate to MCP Servers configuration</li>
            <li>Add this configuration:</li>
          </ol>
          <pre><code>{
  "mcpServers": {
    "orchestrate": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://orchestrate.us.com/api/mcp/sse"]
    }
  }
}</code></pre>
          <ol start="4">
            <li>Restart Claude Desktop</li>
          </ol>
          
          <h3>Cowork Setup</h3>
          <p>Add to your <code>.mcp.json</code> file:</p>
          <pre><code>{
  "mcpServers": {
    "orchestrate": {
      "type": "sse",
      "url": "https://orchestrate.us.com/api/mcp/sse"
    }
  }
}</code></pre>
        </div>
        
        <div class="help-panel" id="help-tools">
          <h3>Available Tools</h3>
          
          <div class="tool-item">
            <h4>generate_workflow</h4>
            <p>Create workflows from natural language descriptions.</p>
            <pre><code>{ "prompt": "Create a workflow that searches for news" }</code></pre>
          </div>
          
          <div class="tool-item">
            <h4>visualize_workflow</h4>
            <p>Get a LogicArt visualization URL for a workflow.</p>
            <pre><code>{ "workflow": { ... } }</code></pre>
          </div>
          
          <div class="tool-item">
            <h4>council_query</h4>
            <p>Query multiple AI models for consensus.</p>
            <pre><code>{ "query": "Best API design practices", "models": ["claude", "gpt4", "gemini"] }</code></pre>
          </div>
          
          <div class="tool-item">
            <h4>save_workflow / load_workflow / list_workflows</h4>
            <p>Manage saved workflows.</p>
          </div>
          
          <div class="tool-item">
            <h4>web_search / summarize</h4>
            <p>Search the web and summarize content.</p>
          </div>
        </div>
        
        <div class="help-panel" id="help-api">
          <h3>MCP Endpoints</h3>
          <table class="help-table">
            <tr><th>Endpoint</th><th>Method</th><th>Description</th></tr>
            <tr><td><code>/api/mcp/sse</code></td><td>GET</td><td>SSE connection</td></tr>
            <tr><td><code>/api/mcp/sse</code></td><td>POST</td><td>JSON-RPC requests</td></tr>
            <tr><td><code>/api/mcp/tools</code></td><td>GET</td><td>List tools</td></tr>
            <tr><td><code>/api/mcp/call</code></td><td>POST</td><td>Execute tool</td></tr>
          </table>
          
          <h3>Direct API Usage</h3>
          <p>Execute tools directly via POST:</p>
          <pre><code>curl -X POST https://orchestrate.us.com/api/mcp/call \\
  -H "Content-Type: application/json" \\
  -d '{"tool": "list_workflows", "params": {}}'</code></pre>
        </div>
        
        <div class="help-panel" id="help-schema">
          <h3>Workflow Schema</h3>
          <pre><code>interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: 'start' | 'end' | 'tool' | 
          'decision' | 'loop' | 'parallel' | 
          'join' | 'human' | 'council';
    label: string;
    config: object;
  }>;
  edges: Array<{
    sourceNodeId: string;
    targetNodeId: string;
    condition?: object;
  }>;
  startNodeId: string;
  metadata: {
    tags?: string[];
    visibility: 'private' | 'team' | 'public';
  };
}</code></pre>
          
          <h3>Node Types</h3>
          <table class="help-table">
            <tr><td><code>start</code></td><td>Entry point</td></tr>
            <tr><td><code>end</code></td><td>Exit point</td></tr>
            <tr><td><code>tool</code></td><td>Execute a tool</td></tr>
            <tr><td><code>decision</code></td><td>Conditional branching</td></tr>
            <tr><td><code>parallel</code></td><td>Split into branches</td></tr>
            <tr><td><code>join</code></td><td>Merge branches</td></tr>
            <tr><td><code>human</code></td><td>Wait for input</td></tr>
            <tr><td><code>council</code></td><td>AI consensus</td></tr>
          </table>
        </div>
        
        <div class="help-panel" id="help-examples">
          <h3>Example Workflows</h3>
          <table class="help-table">
            <tr><th>Workflow</th><th>Description</th></tr>
            <tr><td>Data Processing Pipeline</td><td>Search, process, and summarize with branching</td></tr>
            <tr><td>Approval Workflow</td><td>Human-in-the-loop document review</td></tr>
            <tr><td>Parallel Research</td><td>Search multiple topics simultaneously</td></tr>
            <tr><td>Code Review</td><td>AI Council for comprehensive review</td></tr>
            <tr><td>Council Research</td><td>Multi-model research synthesis</td></tr>
          </table>
          
          <h3>Use Cases</h3>
          <ul>
            <li><strong>Developers:</strong> Code review, documentation, CI/CD templates</li>
            <li><strong>Researchers:</strong> Multi-source synthesis, parallel gathering</li>
            <li><strong>Teams:</strong> Approval workflows, knowledge automation</li>
            <li><strong>Content Creators:</strong> Research, summarization, SEO</li>
          </ul>
          
          <div class="help-links" style="margin-top: 20px;">
            <a href="/docs.html" target="_blank" class="help-link">Full Documentation</a>
            <a href="https://logic.art" target="_blank" class="help-link">LogicArt Editor</a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.querySelectorAll('.help-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.help-nav-btn').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.help-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      modal.querySelector('#help-' + btn.dataset.section).classList.add('active');
    });
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeHelpModal();
  });
  
  document.body.appendChild(modal);
}

window.closeHelpModal = function() {
  const modal = document.getElementById('help-modal');
  if (modal) modal.remove();
};

window.loadExample = async function(name) {
  try {
    const response = await fetch(`/api/examples/${name}`);
    if (!response.ok) throw new Error('Example not found');
    const workflow = await response.json();
    showExampleDetail(workflow);
  } catch (error) {
    alert('Error loading example: ' + error.message);
  }
};

function showExampleDetail(workflow) {
  const existing = document.getElementById('example-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'example-modal';
  modal.className = 'help-modal';
  
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];
  const tags = (workflow.metadata && workflow.metadata.tags) || [];
  
  modal.innerHTML = `
    <div class="help-modal-content">
      <div class="help-modal-header">
        <h2>${workflow.name || workflow.id}</h2>
        <button class="help-close-btn" onclick="document.getElementById('example-modal').remove()">&times;</button>
      </div>
      
      <p style="color:#ccc;margin-bottom:20px;">${workflow.description || 'No description'}</p>
      
      ${tags.length > 0 ? `
        <div style="margin-bottom:20px;">
          ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="help-section">
        <h3>Nodes (${nodes.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${nodes.map(n => `
            <div class="tool-item" style="flex:0 0 auto;padding:10px 14px;">
              <span style="color:#00d9ff;font-weight:600;">${n.label}</span>
              <span style="color:#888;font-size:12px;margin-left:8px;">${n.type}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="help-section">
        <h3>Flow</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${edges.map(e => `
            <span style="background:rgba(0,217,255,0.1);color:#00d9ff;padding:6px 12px;border-radius:6px;font-size:13px;">
              ${e.sourceNodeId} → ${e.targetNodeId}${e.label ? ` (${e.label})` : ''}
            </span>
          `).join('')}
        </div>
      </div>
      
      <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">
        <button onclick="visualizeInLogiProcess('${encodeURIComponent(JSON.stringify(workflow))}')" class="btn-primary">
          Visualize in LogiProcess
        </button>
        <button onclick="visualizeInLogicArt('${encodeURIComponent(JSON.stringify(workflow))}')" class="btn-secondary" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;">
          Visualize in LogicArt
        </button>
        <button onclick="copyExampleJson('${encodeURIComponent(JSON.stringify(workflow))}')" class="btn-secondary" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;">
          Copy JSON
        </button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
}

window.copyExampleJson = function(encoded) {
  const json = decodeURIComponent(encoded);
  navigator.clipboard.writeText(JSON.stringify(JSON.parse(json), null, 2));
  alert('Workflow JSON copied to clipboard!');
};

window.visualizeInLogicArt = async function(encoded) {
  const workflow = JSON.parse(decodeURIComponent(encoded));
  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'visualize_workflow', params: { workflow } })
    });
    const data = await response.json();
    if (data.result && data.result.url) {
      window.open(data.result.url, '_blank');
    } else {
      alert('Could not generate visualization URL');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

window.visualizeInLogiProcess = async function(encoded) {
  const workflow = JSON.parse(decodeURIComponent(encoded));
  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'visualize_workflow', params: { workflow, target: 'logiprocess' } })
    });
    const data = await response.json();
    if (data.result && data.result.url) {
      window.open(data.result.url, '_blank');
    } else {
      alert('Could not generate visualization URL');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

// ===== QUACK CONTROL ROOM =====

let controlRoomData = { inboxes: [] };
let selectedInbox = null;
let selectedMessage = null;

window.loadControlRoom = async function() {
  const container = document.getElementById('agent-tiles');
  try {
    const response = await fetch('/api/quack/inboxes');
    const data = await response.json();
    controlRoomData = data;
    
    const inboxes = data.inboxes || [];
    
    // Update stats
    const totalMessages = inboxes.reduce((sum, i) => sum + (i.messages?.length || 0), 0);
    const totalPending = inboxes.reduce((sum, i) => sum + i.pendingCount, 0);
    
    document.getElementById('stat-inboxes').textContent = inboxes.length;
    document.getElementById('stat-messages').textContent = totalMessages;
    document.getElementById('stat-pending').textContent = totalPending;
    
    if (inboxes.length > 0) {
      container.innerHTML = inboxes.map(inbox => {
        const latestMsg = inbox.messages?.[0];
        return `
          <div class="agent-tile ${inbox.pendingCount > 0 ? 'has-pending' : ''}" 
               onclick="selectInbox('${inbox.name}')">
            <div class="agent-tile-header">
              <span class="agent-tile-name">/${inbox.name}</span>
              <span class="agent-tile-badge ${inbox.pendingCount > 0 ? 'pending' : 'clear'}">
                ${inbox.pendingCount} pending
              </span>
            </div>
            ${latestMsg ? `
              <div class="agent-tile-message">
                <span class="from">From: ${latestMsg.from}</span>
                <span class="task">${latestMsg.task}</span>
                <div class="time">${new Date(latestMsg.timestamp).toLocaleString()}</div>
              </div>
            ` : '<p class="agent-tile-message">No messages yet</p>'}
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p class="empty-state">No agent inboxes available</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="empty-state">Error loading inboxes: ${error.message}</p>`;
  }
};

window.refreshControlRoom = async function() {
  const container = document.getElementById('agent-tiles');
  container.innerHTML = '<p class="loading">Refreshing...</p>';
  await loadControlRoom();
};

window.selectInbox = function(name) {
  const inbox = controlRoomData.inboxes?.find(i => i.name === name);
  if (!inbox) return;
  
  selectedInbox = inbox;
  showInboxSidebar(inbox);
};

function showInboxSidebar(inbox) {
  const existing = document.getElementById('inbox-sidebar');
  if (existing) existing.remove();
  
  const sidebar = document.createElement('div');
  sidebar.id = 'inbox-sidebar';
  sidebar.className = 'message-sidebar';
  
  sidebar.innerHTML = `
    <div class="message-sidebar-header">
      <span class="message-sidebar-title">/${inbox.name}</span>
      <button class="message-sidebar-close" onclick="closeInboxSidebar()">&times;</button>
    </div>
    <div class="message-list">
      ${inbox.messages?.length > 0 ? inbox.messages.map(msg => `
        <div class="message-item" onclick="showMessageDetail('${msg.id}')">
          <div class="message-item-header">
            <span class="from" style="color:#00d9ff;">From: ${msg.from}</span>
            <span class="message-status ${msg.status}">${msg.status}</span>
          </div>
          <p style="color:#ccc;font-size:13px;margin:6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${msg.task}</p>
          <p style="color:#666;font-size:11px;">${new Date(msg.timestamp).toLocaleString()}</p>
        </div>
      `).join('') : '<p style="color:#888;text-align:center;padding:20px;">No messages</p>'}
    </div>
  `;
  
  document.body.appendChild(sidebar);
}

window.closeInboxSidebar = function() {
  const sidebar = document.getElementById('inbox-sidebar');
  if (sidebar) sidebar.remove();
  selectedInbox = null;
};

window.showMessageDetail = function(messageId) {
  const message = selectedInbox?.messages?.find(m => m.id === messageId);
  if (!message) return;
  
  selectedMessage = message;
  
  const existing = document.getElementById('message-detail-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'message-detail-modal';
  modal.className = 'message-detail-modal';
  
  modal.innerHTML = `
    <div class="message-detail-content">
      <div class="help-modal-header">
        <h2 style="color:#00d9ff;">Message Details</h2>
        <button class="help-close-btn" onclick="closeMessageDetail()">&times;</button>
      </div>
      
      <div class="message-detail-field">
        <div class="message-detail-label">Task</div>
        <div class="message-detail-value">${message.task}</div>
      </div>
      
      <div class="message-detail-field">
        <div class="message-detail-label">From → To</div>
        <div class="message-detail-value">${message.from} → ${message.to}</div>
      </div>
      
      <div class="message-detail-field">
        <div class="message-detail-label">Status</div>
        <span class="message-status ${message.status}" style="margin-left:0;">${message.status}</span>
      </div>
      
      <div class="message-detail-field">
        <div class="message-detail-label">Time</div>
        <div class="message-detail-value">${new Date(message.timestamp).toLocaleString()}</div>
      </div>
      
      ${message.context ? `
        <div class="message-detail-field">
          <div class="message-detail-label">Context</div>
          <div class="message-detail-value">${message.context}</div>
        </div>
      ` : ''}
      
      <div class="message-actions">
        ${message.status === 'pending' ? `
          <button class="btn-primary btn-approve" onclick="approveMessage('${message.id}')">Approve</button>
        ` : ''}
        ${message.status === 'approved' ? `
          <button class="btn-primary btn-start" onclick="startWork('${message.id}')">Start Work</button>
        ` : ''}
        ${message.status === 'in_progress' ? `
          <button class="btn-primary btn-complete" onclick="completeMessage('${message.id}')">Complete</button>
          <button class="btn-primary btn-fail" onclick="failMessage('${message.id}')">Mark Failed</button>
        ` : ''}
        <button class="btn-secondary" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;" onclick="closeMessageDetail()">Close</button>
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMessageDetail();
  });
  
  document.body.appendChild(modal);
};

window.closeMessageDetail = function() {
  const modal = document.getElementById('message-detail-modal');
  if (modal) modal.remove();
  selectedMessage = null;
};

window.approveMessage = async function(id) {
  try {
    await fetch(`/api/quack/approve/${id}`, { method: 'POST' });
    closeMessageDetail();
    closeInboxSidebar();
    await loadControlRoom();
  } catch (error) {
    alert('Error approving message: ' + error.message);
  }
};

window.startWork = async function(id) {
  try {
    await fetch(`/api/quack/status/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' })
    });
    closeMessageDetail();
    closeInboxSidebar();
    await loadControlRoom();
  } catch (error) {
    alert('Error starting work: ' + error.message);
  }
};

window.completeMessage = async function(id) {
  try {
    await fetch(`/api/quack/status/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    closeMessageDetail();
    closeInboxSidebar();
    await loadControlRoom();
  } catch (error) {
    alert('Error completing message: ' + error.message);
  }
};

window.failMessage = async function(id) {
  try {
    await fetch(`/api/quack/status/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed' })
    });
    closeMessageDetail();
    closeInboxSidebar();
    await loadControlRoom();
  } catch (error) {
    alert('Error failing message: ' + error.message);
  }
};

// ===== LOGICPROCESS NODE EDITOR =====

let workflowNodes = [];
let workflowEdges = [];
let selectedNode = null;
let nodeIdCounter = 1;
let currentWorkflow = null;

const NODE_TYPES = {
  'trigger': { icon: '▶', name: 'Trigger', color: '#22c55e' },
  'ai-agent': { icon: '🤖', name: 'AI Agent', color: '#00d9ff' },
  'transform': { icon: '⚙', name: 'Transform', color: '#a855f7' },
  'condition': { icon: '◇', name: 'Condition', color: '#eab308' },
  'human-review': { icon: '👤', name: 'Human Review', color: '#3b82f6' },
  'output': { icon: '📤', name: 'Output', color: '#ef4444' }
};

function initNodeEditor() {
  const canvas = document.getElementById('node-canvas');
  const paletteNodes = document.querySelectorAll('.palette-node');
  
  paletteNodes.forEach(node => {
    node.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('nodeType', node.dataset.type);
    });
  });
  
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType');
    if (nodeType) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - 90;
      const y = e.clientY - rect.top - 30;
      addNodeToCanvas(nodeType, x, y);
    }
  });
  
  canvas.addEventListener('click', (e) => {
    if (e.target === canvas || e.target.classList.contains('canvas-placeholder')) {
      deselectNode();
    }
  });
}

function addNodeToCanvas(type, x, y) {
  const canvas = document.getElementById('node-canvas');
  const placeholder = canvas.querySelector('.canvas-placeholder');
  if (placeholder) placeholder.style.display = 'none';
  
  const nodeId = 'node-' + nodeIdCounter++;
  const nodeInfo = NODE_TYPES[type];
  
  const node = {
    id: nodeId,
    type: type,
    position: { x, y },
    inputs: {
      data: { source: 'previous', label: 'Data input' },
      instructions: { source: 'fixed', value: '' }
    },
    agent: type === 'ai-agent' ? 'claude' : undefined,
    output: 'result'
  };
  
  workflowNodes.push(node);
  
  const nodeEl = document.createElement('div');
  nodeEl.className = 'workflow-node';
  nodeEl.id = nodeId;
  nodeEl.style.left = x + 'px';
  nodeEl.style.top = y + 'px';
  nodeEl.style.borderColor = nodeInfo.color;
  nodeEl.innerHTML = `
    <div class="node-connector input"></div>
    <div class="node-header">
      <span class="node-icon">${nodeInfo.icon}</span>
      <span>${nodeInfo.name}</span>
    </div>
    <div class="node-body">${getNodeDescription(node)}</div>
    <div class="node-connector output"></div>
  `;
  
  nodeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    selectNode(nodeId);
  });
  
  makeNodeDraggable(nodeEl);
  canvas.appendChild(nodeEl);
  selectNode(nodeId);
}

function getNodeDescription(node) {
  if (node.type === 'ai-agent') {
    return `Agent: ${node.agent || 'Claude'}`;
  } else if (node.type === 'trigger') {
    return 'Start workflow';
  } else if (node.type === 'output') {
    return 'Save results';
  }
  return 'Configure...';
}

function makeNodeDraggable(nodeEl) {
  let isDragging = false;
  let startX, startY, origX, origY;
  
  nodeEl.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('node-connector')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = nodeEl.offsetLeft;
    origY = nodeEl.offsetTop;
    nodeEl.style.zIndex = 1000;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    nodeEl.style.left = (origX + dx) + 'px';
    nodeEl.style.top = (origY + dy) + 'px';
    
    const node = workflowNodes.find(n => n.id === nodeEl.id);
    if (node) {
      node.position.x = origX + dx;
      node.position.y = origY + dy;
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    nodeEl.style.zIndex = '';
  });
}

function selectNode(nodeId) {
  document.querySelectorAll('.workflow-node').forEach(n => n.classList.remove('selected'));
  const nodeEl = document.getElementById(nodeId);
  if (nodeEl) nodeEl.classList.add('selected');
  
  selectedNode = workflowNodes.find(n => n.id === nodeId);
  showNodeConfig(selectedNode);
}

function deselectNode() {
  document.querySelectorAll('.workflow-node').forEach(n => n.classList.remove('selected'));
  selectedNode = null;
  document.getElementById('node-config-panel').style.display = 'none';
}

function showNodeConfig(node) {
  const panel = document.getElementById('node-config-panel');
  const content = document.getElementById('node-config-content');
  panel.style.display = 'block';
  
  let html = `<div class="config-field">
    <label>Node Type</label>
    <input type="text" value="${NODE_TYPES[node.type].name}" readonly>
  </div>`;
  
  if (node.type === 'ai-agent') {
    html += `
      <div class="config-field">
        <label>Agent</label>
        <select onchange="updateNodeConfig('agent', this.value)">
          <option value="claude" ${node.agent === 'claude' ? 'selected' : ''}>Claude</option>
          <option value="gpt" ${node.agent === 'gpt' ? 'selected' : ''}>GPT-4</option>
          <option value="gemini" ${node.agent === 'gemini' ? 'selected' : ''}>Gemini</option>
        </select>
      </div>
      <div class="config-field">
        <label>Data Input</label>
        <div class="input-source-toggle">
          <button class="${node.inputs.data.source === 'previous' ? 'active' : ''}" onclick="setInputSource('data', 'previous')">From Previous</button>
          <button class="${node.inputs.data.source === 'runtime' ? 'active' : ''}" onclick="setInputSource('data', 'runtime')">User Input</button>
          <button class="${node.inputs.data.source === 'fixed' ? 'active' : ''}" onclick="setInputSource('data', 'fixed')">Fixed</button>
        </div>
        ${node.inputs.data.source === 'runtime' ? `<input type="text" placeholder="Label for user" value="${node.inputs.data.label || ''}" onchange="updateInputLabel('data', this.value)">` : ''}
        ${node.inputs.data.source === 'fixed' ? `<textarea placeholder="Fixed value" onchange="updateInputValue('data', this.value)">${node.inputs.data.value || ''}</textarea>` : ''}
      </div>
      <div class="config-field">
        <label>Instructions</label>
        <div class="input-source-toggle">
          <button class="${node.inputs.instructions.source === 'runtime' ? 'active' : ''}" onclick="setInputSource('instructions', 'runtime')">User Input</button>
          <button class="${node.inputs.instructions.source === 'fixed' ? 'active' : ''}" onclick="setInputSource('instructions', 'fixed')">Fixed</button>
        </div>
        ${node.inputs.instructions.source === 'runtime' ? `<input type="text" placeholder="Label for user" value="${node.inputs.instructions.label || ''}" onchange="updateInputLabel('instructions', this.value)">` : ''}
        ${node.inputs.instructions.source === 'fixed' ? `<textarea placeholder="Instructions for AI" onchange="updateInputValue('instructions', this.value)">${node.inputs.instructions.value || ''}</textarea>` : ''}
      </div>
    `;
  }
  
  html += `<div class="config-field">
    <label>Output Path</label>
    <input type="text" value="${node.output || 'result'}" onchange="updateNodeConfig('output', this.value)">
  </div>
  <button class="btn-secondary" style="width:100%;margin-top:10px;color:#ef4444;" onclick="deleteNode('${node.id}')">Delete Node</button>`;
  
  content.innerHTML = html;
}

window.updateNodeConfig = function(key, value) {
  if (selectedNode) {
    selectedNode[key] = value;
    const nodeEl = document.getElementById(selectedNode.id);
    if (nodeEl) {
      nodeEl.querySelector('.node-body').textContent = getNodeDescription(selectedNode);
    }
  }
};

window.setInputSource = function(inputKey, source) {
  if (selectedNode && selectedNode.inputs) {
    selectedNode.inputs[inputKey] = { source, label: '', value: '' };
    showNodeConfig(selectedNode);
  }
};

window.updateInputLabel = function(inputKey, label) {
  if (selectedNode && selectedNode.inputs) {
    selectedNode.inputs[inputKey].label = label;
  }
};

window.updateInputValue = function(inputKey, value) {
  if (selectedNode && selectedNode.inputs) {
    selectedNode.inputs[inputKey].value = value;
  }
};

window.deleteNode = function(nodeId) {
  workflowNodes = workflowNodes.filter(n => n.id !== nodeId);
  workflowEdges = workflowEdges.filter(e => e.from !== nodeId && e.to !== nodeId);
  const nodeEl = document.getElementById(nodeId);
  if (nodeEl) nodeEl.remove();
  deselectNode();
  
  if (workflowNodes.length === 0) {
    const canvas = document.getElementById('node-canvas');
    const placeholder = canvas.querySelector('.canvas-placeholder');
    if (placeholder) placeholder.style.display = 'block';
  }
};

window.clearCanvas = function() {
  workflowNodes = [];
  workflowEdges = [];
  nodeIdCounter = 1;
  selectedNode = null;
  currentWorkflow = null;
  
  const canvas = document.getElementById('node-canvas');
  canvas.querySelectorAll('.workflow-node').forEach(n => n.remove());
  const placeholder = canvas.querySelector('.canvas-placeholder');
  if (placeholder) placeholder.style.display = 'block';
  document.getElementById('node-config-panel').style.display = 'none';
};

window.saveCurrentWorkflow = async function() {
  const name = prompt('Workflow name:');
  if (!name) return;
  
  const workflow = {
    id: 'workflow-' + Date.now(),
    name: name,
    description: '',
    nodes: workflowNodes,
    edges: workflowEdges
  };
  
  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'save_workflow', params: { workflow } })
    });
    const data = await response.json();
    if (data.result) {
      alert('Workflow saved!');
      currentWorkflow = workflow;
      loadCoworkWorkflows();
    }
  } catch (error) {
    alert('Error saving workflow: ' + error.message);
  }
};

window.testRunWorkflow = function() {
  if (workflowNodes.length === 0) {
    alert('Add some nodes first!');
    return;
  }
  
  document.querySelector('[data-tab="cowork"]').click();
  setTimeout(() => {
    const select = document.getElementById('cowork-workflow-select');
    if (currentWorkflow) {
      select.value = currentWorkflow.id;
    }
    generateCoworkForm();
  }, 100);
};

// ===== COWORK RUN MODE =====

let coworkWorkflows = [];
let selectedWorkflow = null;

async function loadCoworkWorkflows() {
  try {
    const response = await fetch('/api/workflows');
    const data = await response.json();
    coworkWorkflows = data.workflows || [];
    
    const select = document.getElementById('cowork-workflow-select');
    select.innerHTML = '<option value="">-- Choose a workflow --</option>';
    coworkWorkflows.forEach(wf => {
      select.innerHTML += `<option value="${wf.id}">${wf.name}</option>`;
    });
  } catch (error) {
    console.error('Error loading workflows:', error);
  }
}

window.loadWorkflowForRun = async function() {
  const select = document.getElementById('cowork-workflow-select');
  const workflowId = select.value;
  
  if (!workflowId) {
    document.getElementById('cowork-form').innerHTML = '<p class="empty-state">Select a workflow to see its input form</p>';
    return;
  }
  
  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'load_workflow', params: { id: workflowId } })
    });
    const data = await response.json();
    if (data.result && data.result.workflow) {
      selectedWorkflow = data.result.workflow;
      generateCoworkForm();
    }
  } catch (error) {
    console.error('Error loading workflow:', error);
  }
};

function generateCoworkForm() {
  const form = document.getElementById('cowork-form');
  
  if (!selectedWorkflow && workflowNodes.length > 0) {
    selectedWorkflow = { nodes: workflowNodes, edges: workflowEdges };
  }
  
  if (!selectedWorkflow) {
    form.innerHTML = '<p class="empty-state">No workflow selected</p>';
    return;
  }
  
  const runtimeInputs = [];
  (selectedWorkflow.nodes || []).forEach((node, idx) => {
    if (node.inputs) {
      Object.entries(node.inputs).forEach(([key, input]) => {
        if (input.source === 'runtime') {
          runtimeInputs.push({
            nodeId: node.id,
            nodeIndex: idx + 1,
            inputKey: key,
            label: input.label || `${key} for ${NODE_TYPES[node.type]?.name || node.type}`
          });
        }
      });
    }
  });
  
  if (runtimeInputs.length === 0) {
    form.innerHTML = `
      <p style="color:#888;margin-bottom:20px;">This workflow has no runtime inputs - it will run with fixed values.</p>
      <button class="run-workflow-btn" onclick="runWorkflow()">Run Workflow</button>
    `;
    return;
  }
  
  let html = '';
  runtimeInputs.forEach((input, idx) => {
    html += `
      <div class="cowork-step">
        <h4>Step ${idx + 1}: ${input.label}</h4>
        <textarea id="runtime-${input.nodeId}-${input.inputKey}" placeholder="Enter ${input.label}..."></textarea>
      </div>
    `;
  });
  
  html += '<button class="run-workflow-btn" onclick="runWorkflow()">Run Workflow</button>';
  form.innerHTML = html;
}

window.runWorkflow = async function() {
  const executionDiv = document.getElementById('cowork-execution');
  executionDiv.style.display = 'block';
  
  const nodes = selectedWorkflow?.nodes || workflowNodes;
  
  let html = '<h3 style="margin-bottom:20px;">Execution Progress</h3>';
  nodes.forEach((node, idx) => {
    const nodeInfo = NODE_TYPES[node.type] || { icon: '?', name: node.type };
    html += `
      <div class="execution-step pending" id="exec-${node.id}">
        <div class="execution-step-icon">${idx === 0 ? '🔄' : '⏳'}</div>
        <div class="execution-step-content">
          <div class="execution-step-title">Step ${idx + 1}: ${nodeInfo.name}</div>
          <div class="execution-step-status">${idx === 0 ? 'Running...' : 'Pending'}</div>
        </div>
      </div>
    `;
  });
  executionDiv.innerHTML = html;
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const stepEl = document.getElementById(`exec-${node.id}`);
    
    stepEl.classList.remove('pending');
    stepEl.classList.add('in-progress');
    stepEl.querySelector('.execution-step-icon').textContent = '🔄';
    stepEl.querySelector('.execution-step-status').textContent = 'Running...';
    
    if (node.type === 'ai-agent') {
      const runtimeData = document.getElementById(`runtime-${node.id}-data`)?.value || '';
      const runtimeInstructions = document.getElementById(`runtime-${node.id}-instructions`)?.value || '';
      
      const task = node.inputs?.instructions?.source === 'runtime' 
        ? runtimeInstructions 
        : node.inputs?.instructions?.value || 'Process the data';
      
      try {
        await fetch('/api/quack/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: node.agent || 'claude',
            task: task,
            context: `Workflow execution - Node: ${node.id}`
          })
        });
        stepEl.querySelector('.execution-step-status').textContent = 'Sent to ' + (node.agent || 'claude') + ' via Quack';
      } catch (error) {
        stepEl.querySelector('.execution-step-status').textContent = 'Error: ' + error.message;
      }
    } else if (node.type === 'human-review') {
      stepEl.classList.remove('in-progress');
      stepEl.classList.add('waiting');
      stepEl.querySelector('.execution-step-icon').textContent = '⏸️';
      stepEl.querySelector('.execution-step-status').textContent = 'Waiting for approval...';
      break;
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    stepEl.classList.remove('in-progress');
    stepEl.classList.add('completed');
    stepEl.querySelector('.execution-step-icon').textContent = '✅';
    stepEl.querySelector('.execution-step-status').textContent = 'Completed';
    
    if (i < nodes.length - 1) {
      const nextEl = document.getElementById(`exec-${nodes[i + 1].id}`);
      if (nextEl) {
        nextEl.querySelector('.execution-step-icon').textContent = '🔄';
      }
    }
  }
};

// ===== TEMPLATES =====

const TEMPLATES = {
  'content-pipeline': {
    name: 'Content Pipeline',
    nodes: [
      { id: 'node-1', type: 'trigger', position: { x: 50, y: 100 }, inputs: {}, output: 'start' },
      { id: 'node-2', type: 'ai-agent', agent: 'claude', position: { x: 250, y: 100 }, inputs: { data: { source: 'runtime', label: 'Upload your topics CSV' }, instructions: { source: 'fixed', value: 'Generate blog outlines for each topic' } }, output: 'outlines' },
      { id: 'node-3', type: 'human-review', position: { x: 450, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'approved' },
      { id: 'node-4', type: 'ai-agent', agent: 'claude', position: { x: 650, y: 100 }, inputs: { data: { source: 'previous' }, instructions: { source: 'runtime', label: 'Paste your style guide' } }, output: 'articles' },
      { id: 'node-5', type: 'output', position: { x: 850, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'final' }
    ],
    edges: [{ from: 'node-1', to: 'node-2' }, { from: 'node-2', to: 'node-3' }, { from: 'node-3', to: 'node-4' }, { from: 'node-4', to: 'node-5' }]
  },
  'code-review': {
    name: 'Code Review',
    nodes: [
      { id: 'node-1', type: 'trigger', position: { x: 50, y: 100 }, inputs: {}, output: 'start' },
      { id: 'node-2', type: 'ai-agent', agent: 'claude', position: { x: 250, y: 100 }, inputs: { data: { source: 'runtime', label: 'Paste your code' }, instructions: { source: 'fixed', value: 'Review this code for bugs, security issues, and best practices' } }, output: 'review' },
      { id: 'node-3', type: 'output', position: { x: 450, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'final' }
    ],
    edges: [{ from: 'node-1', to: 'node-2' }, { from: 'node-2', to: 'node-3' }]
  },
  'data-analysis': {
    name: 'Data Analysis',
    nodes: [
      { id: 'node-1', type: 'trigger', position: { x: 50, y: 100 }, inputs: {}, output: 'start' },
      { id: 'node-2', type: 'ai-agent', agent: 'claude', position: { x: 250, y: 100 }, inputs: { data: { source: 'runtime', label: 'Upload CSV data' }, instructions: { source: 'fixed', value: 'Analyze this data and provide key insights' } }, output: 'insights' },
      { id: 'node-3', type: 'ai-agent', agent: 'claude', position: { x: 450, y: 100 }, inputs: { data: { source: 'previous' }, instructions: { source: 'fixed', value: 'Generate a summary report from these insights' } }, output: 'report' },
      { id: 'node-4', type: 'output', position: { x: 650, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'final' }
    ],
    edges: [{ from: 'node-1', to: 'node-2' }, { from: 'node-2', to: 'node-3' }, { from: 'node-3', to: 'node-4' }]
  },
  'image-generation': {
    name: 'Image Generation',
    nodes: [
      { id: 'node-1', type: 'trigger', position: { x: 50, y: 100 }, inputs: {}, output: 'start' },
      { id: 'node-2', type: 'ai-agent', agent: 'claude', position: { x: 250, y: 100 }, inputs: { data: { source: 'runtime', label: 'Enter image prompts' }, instructions: { source: 'fixed', value: 'Generate detailed image descriptions from these prompts' } }, output: 'descriptions' },
      { id: 'node-3', type: 'human-review', position: { x: 450, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'approved' },
      { id: 'node-4', type: 'output', position: { x: 650, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'final' }
    ],
    edges: [{ from: 'node-1', to: 'node-2' }, { from: 'node-2', to: 'node-3' }, { from: 'node-3', to: 'node-4' }]
  },
  'email-processor': {
    name: 'Email Processor',
    nodes: [
      { id: 'node-1', type: 'trigger', position: { x: 50, y: 100 }, inputs: {}, output: 'start' },
      { id: 'node-2', type: 'ai-agent', agent: 'claude', position: { x: 250, y: 100 }, inputs: { data: { source: 'runtime', label: 'Paste emails' }, instructions: { source: 'fixed', value: 'Categorize these emails by urgency and topic' } }, output: 'categorized' },
      { id: 'node-3', type: 'ai-agent', agent: 'claude', position: { x: 450, y: 100 }, inputs: { data: { source: 'previous' }, instructions: { source: 'fixed', value: 'Draft responses for each email' } }, output: 'drafts' },
      { id: 'node-4', type: 'human-review', position: { x: 650, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'approved' },
      { id: 'node-5', type: 'output', position: { x: 850, y: 100 }, inputs: { data: { source: 'previous' } }, output: 'final' }
    ],
    edges: [{ from: 'node-1', to: 'node-2' }, { from: 'node-2', to: 'node-3' }, { from: 'node-3', to: 'node-4' }, { from: 'node-4', to: 'node-5' }]
  }
};

window.loadTemplate = function(templateId) {
  const template = TEMPLATES[templateId];
  if (!template) return;
  
  clearCanvas();
  
  const canvas = document.getElementById('node-canvas');
  const placeholder = canvas.querySelector('.canvas-placeholder');
  if (placeholder) placeholder.style.display = 'none';
  
  workflowNodes = JSON.parse(JSON.stringify(template.nodes));
  workflowEdges = JSON.parse(JSON.stringify(template.edges));
  nodeIdCounter = workflowNodes.length + 1;
  
  workflowNodes.forEach(node => {
    const nodeInfo = NODE_TYPES[node.type];
    const nodeEl = document.createElement('div');
    nodeEl.className = 'workflow-node';
    nodeEl.id = node.id;
    nodeEl.style.left = node.position.x + 'px';
    nodeEl.style.top = node.position.y + 'px';
    nodeEl.style.borderColor = nodeInfo.color;
    nodeEl.innerHTML = `
      <div class="node-connector input"></div>
      <div class="node-header">
        <span class="node-icon">${nodeInfo.icon}</span>
        <span>${nodeInfo.name}</span>
      </div>
      <div class="node-body">${getNodeDescription(node)}</div>
      <div class="node-connector output"></div>
    `;
    
    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNode(node.id);
    });
    
    makeNodeDraggable(nodeEl);
    canvas.appendChild(nodeEl);
  });
  
  document.querySelector('[data-tab="logic-process"]').click();
  currentWorkflow = { id: 'template-' + templateId, name: template.name, nodes: workflowNodes, edges: workflowEdges };
};

document.addEventListener('DOMContentLoaded', () => {
  initNodeEditor();
  loadCoworkWorkflows();
});
