// ===== VOYAI AUTHENTICATION =====

let voyaiUser = null;

async function checkVoyaiAuth() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');

  if (sessionId) {
    try {
      // Claim the session from Voyai
      const response = await fetch(`/api/voyai/claim-session?session=${sessionId}`);
      const data = await response.json();

      if (data.success && data.user) {
        // Store user in localStorage
        localStorage.setItem('voyai_user', JSON.stringify(data.user));
        voyaiUser = data.user;

        // Clean URL - remove session param
        const url = new URL(window.location.href);
        url.searchParams.delete('session');
        window.history.replaceState({}, '', url.toString());

        console.log('[Auth] User authenticated:', data.user.email);
        console.log('[Auth] Has Orchestrate bundle:', data.user.hasBundle);
      } else {
        console.error('[Auth] Failed to claim session:', data.error);
      }
    } catch (err) {
      console.error('[Auth] Voyai auth error:', err);
    }
  } else {
    // Check localStorage for existing session
    const stored = localStorage.getItem('voyai_user');
    if (stored) {
      try {
        voyaiUser = JSON.parse(stored);
        console.log('[Auth] Loaded user from storage:', voyaiUser.email);
      } catch (e) {
        localStorage.removeItem('voyai_user');
      }
    }
  }

  updateAuthUI();
}

function updateAuthUI() {
  const authContainer = document.getElementById('auth-status');
  if (!authContainer) return;

  if (voyaiUser) {
    const displayName = voyaiUser.displayName || voyaiUser.email;
    const bundleStatus = voyaiUser.hasBundle ?
      '<span class="bundle-badge active">Bundle Active</span>' :
      '<span class="bundle-badge inactive">Free</span>';

    authContainer.innerHTML = `
      <div class="user-info">
        <span class="user-name">${displayName}</span>
        ${bundleStatus}
        <button class="btn-secondary btn-small" onclick="voyaiLogout()">Logout</button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <button class="btn-primary" onclick="voyaiLogin()">Log in with Voyai</button>
    `;
  }
}

window.voyaiLogin = function () {
  const returnUrl = window.location.host; // Just the domain, e.g., orchestrate.us.com
  window.location.href = `https://voyai.org/login?return_to=${returnUrl}&app=orchestrate`;
};

window.voyaiLogout = function () {
  localStorage.removeItem('voyai_user');
  voyaiUser = null;
  updateAuthUI();
};

window.hasVoyaiFeature = function (feature) {
  return voyaiUser?.features?.[feature] === true;
};

window.getVoyaiUser = function () {
  return voyaiUser;
};

window.requireVoyaiAuth = function () {
  if (!voyaiUser) {
    voyaiLogin();
    return false;
  }
  return true;
};

window.requireVoyaiBundle = function () {
  if (!voyaiUser) {
    voyaiLogin();
    return false;
  }
  if (!voyaiUser.hasBundle) {
    window.location.href = 'https://voyai.org/subscribe?app=orchestrate';
    return false;
  }
  return true;
};

document.addEventListener('DOMContentLoaded', async () => {
  await checkVoyaiAuth();
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

window.refreshWorkflows = async function () {
  const container = document.getElementById('workflows-list');
  container.innerHTML = '<p class="loading">Loading workflows...</p>';
  await loadWorkflows();
};

window.visualizeWorkflow = async function (id) {
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

window.loadWorkflow = async function (id) {
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

window.copyWorkflowJson = function (encoded) {
  const json = decodeURIComponent(encoded);
  navigator.clipboard.writeText(JSON.stringify(JSON.parse(json), null, 2));
  alert('Workflow JSON copied to clipboard!');
};

window.openHelpModal = function () {
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
          <div style="text-align:center;margin-bottom:20px;">
            <img src="/images/architecture.png" alt="Orchestrate Architecture" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(168,85,247,0.3);">
          </div>
          
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
            <div style="text-align:center;margin:12px 0;">
              <img src="/images/ai-council.png" alt="AI Council: Claude + GPT-4 + Gemini" style="max-width:200px;border-radius:8px;">
            </div>
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
          <div style="text-align:center;margin:15px 0;">
            <img src="/images/workflow-nodes.png" alt="Workflow Node Types" style="max-width:280px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.3);">
          </div>
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
            <a href="https://logic.art" target="_blank" class="help-link">LogicArt Editor</a>
            <a href="https://wizardofquack.com" target="_blank" class="help-link">Wizard of Quack Suite</a>
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

window.closeHelpModal = function () {
  const modal = document.getElementById('help-modal');
  if (modal) modal.remove();
};

window.loadExample = async function (name) {
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

window.copyExampleJson = function (encoded) {
  const json = decodeURIComponent(encoded);
  navigator.clipboard.writeText(JSON.stringify(JSON.parse(json), null, 2));
  alert('Workflow JSON copied to clipboard!');
};

window.visualizeInLogicArt = async function (encoded) {
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

window.visualizeInLogiProcess = async function (encoded) {
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

window.loadControlRoom = async function () {
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

window.refreshControlRoom = async function () {
  const container = document.getElementById('agent-tiles');
  container.innerHTML = '<p class="loading">Refreshing...</p>';
  await loadControlRoom();
};

window.testAgentWorkflow = async function() {
  showToast('Starting agent workflow test...');
  
  const testWorkflow = {
    id: 'test-agent-' + Date.now(),
    name: 'Agent Test Workflow',
    description: 'Test dispatching a task to an agent via Quack',
    version: '1.0',
    config: { timeout: 60000 },
    inputs: [],
    outputs: [],
    startNodeId: 'start',
    metadata: { 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(), 
      visibility: 'private' 
    },
    nodes: [
      { id: 'start', type: 'start', label: 'Start', config: {} },
      { 
        id: 'agent1', 
        type: 'agent', 
        label: 'Ping Agent', 
        config: {
          agentInbox: 'agent/autonomous',
          prompt: 'ping',
          timeout: 30000
        }
      },
      { id: 'end', type: 'end', label: 'End', config: {} }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'start', targetNodeId: 'agent1' },
      { id: 'e2', sourceNodeId: 'agent1', targetNodeId: 'end' }
    ]
  };
  
  try {
    console.log('[Test] Sending agent workflow:', testWorkflow.name);
    
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'execute_workflow',
        params: { workflow: testWorkflow, inputs: {} }
      })
    });
    
    const result = await response.json();
    console.log('[Test] Workflow result:', result);
    
    const execResult = result.result || result;
    
    if (result.error || execResult.error) {
      const errMsg = result.error || execResult.error?.message || 'Unknown error';
      showToast('Workflow error: ' + errMsg, 'error');
    } else if (execResult.status === 'completed') {
      showToast('Agent workflow completed successfully!', 'success');
    } else if (execResult.status === 'running') {
      showToast('Workflow dispatched - waiting for agent response...', 'info');
    } else if (execResult.status === 'failed') {
      const failMsg = execResult.error?.message || 'Agent did not respond (timeout)';
      showToast('Workflow failed: ' + failMsg, 'warning');
    } else {
      showToast('Workflow status: ' + (execResult.status || 'unknown'));
    }
    
    // Refresh to see updated state
    await refreshControlRoom();
    
  } catch (err) {
    console.error('[Test] Error:', err);
    showToast('Test failed: ' + err.message, 'error');
  }
};

let quackWidgetInitialized = false;

window.switchControlRoomTab = function(tabName) {
  document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.control-room-subtab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-subtab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`subtab-${tabName}`)?.classList.add('active');
  
  if (tabName === 'audit') loadAuditLogs();
  if (tabName === 'agents') loadRegisteredAgents();
  if (tabName === 'threads') loadThreads();
  if (tabName === 'widget') initQuackWidget();
};

window.initQuackWidget = function() {
  if (quackWidgetInitialized) return;
  
  const container = document.getElementById('quack-widget');
  container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">Loading Quack Widget...</p>';
  
  // Load external widget script from Quack
  if (typeof QuackWidget !== 'undefined') {
    initQuackWidgetInstance();
  } else {
    const script = document.createElement('script');
    script.src = 'https://quack.us.com/quack-widget.js';
    script.onload = () => {
      console.log('[Quack Widget] Script loaded from quack.us.com');
      initQuackWidgetInstance();
    };
    script.onerror = () => {
      console.error('[Quack Widget] Failed to load script');
      container.innerHTML = `
        <div class="widget-empty-state">
          <p>Could not load Quack Widget</p>
          <p style="font-size:12px;color:#666;margin-top:8px;">The widget script at quack.us.com may be unavailable</p>
        </div>
      `;
    };
    document.head.appendChild(script);
  }
};

function initQuackWidgetInstance() {
  if (typeof QuackWidget === 'undefined') {
    console.error('[Quack Widget] QuackWidget not defined after script load');
    return;
  }
  
  QuackWidget.init({
    container: "#quack-widget",
    inbox: "replit/orchestrate",
    pollInterval: 5000,
    theme: "dark",
    showThreads: true,
    showApproveReject: true,
    maxHeight: "480px",
    onMessage: (msg) => {
      console.log("[Quack Widget] New message:", msg.from);
      showToast(`New message from ${msg.from}`);
    },
    onApprove: (msg) => {
      console.log("[Quack Widget] Approved:", msg.id);
      showToast("Message approved!");
    },
    onReject: (msg) => {
      console.log("[Quack Widget] Rejected:", msg.id);
      showToast("Message rejected");
    },
    onError: (err) => {
      console.error("[Quack Widget] Error:", err);
    }
  });
  
  quackWidgetInitialized = true;
  console.log("[Quack Widget] Initialized with Quack's external script");
}

window.refreshQuackWidget = function() {
  if (typeof QuackWidget !== 'undefined' && QuackWidget.refresh) {
    QuackWidget.refresh();
    showToast("Widget refreshed");
  } else {
    quackWidgetInitialized = false;
    initQuackWidget();
    showToast("Widget reloaded");
  }
};

window.loadAuditLogs = async function() {
  const container = document.getElementById('audit-logs');
  const actionFilter = document.getElementById('audit-action-filter')?.value || '';
  
  try {
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (actionFilter) params.set('action', actionFilter);
    
    const [logsRes, statsRes] = await Promise.all([
      fetch(`/api/quack/audit?${params}`),
      fetch('/api/quack/audit/stats')
    ]);
    
    const logsData = await logsRes.json();
    const statsData = await statsRes.json();
    
    document.getElementById('audit-total').textContent = statsData.totalLogs || 0;
    document.getElementById('audit-recent').textContent = statsData.recentActivity || 0;
    
    const logs = logsData.logs || [];
    if (logs.length > 0) {
      container.innerHTML = logs.map(log => {
        const actionClass = log.action.includes('send') ? 'send' : 
                           log.action.includes('approve') ? 'approve' :
                           log.action.includes('reject') ? 'reject' :
                           log.action.includes('complete') ? 'complete' : 'status';
        const actionLabel = log.action.replace('message.', '').replace('_', ' ');
        return `
          <div class="audit-log-item">
            <div>
              <span class="audit-action-badge ${actionClass}">${actionLabel}</span>
              <span class="audit-log-actor">${log.actor}</span>
            </div>
            <span class="audit-log-time">${new Date(log.timestamp).toLocaleString()}</span>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p class="empty-state-small">No audit logs found</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="empty-state-small">Error loading audit logs: ${error.message}</p>`;
  }
};

window.loadRegisteredAgents = async function() {
  const container = document.getElementById('registered-agents');
  
  try {
    const response = await fetch('/api/quack/agents');
    const data = await response.json();
    const agents = data.agents || [];
    
    if (agents.length > 0) {
      container.innerHTML = agents.map(agent => `
        <div class="agent-card">
          <div class="agent-card-header">
            <span class="agent-card-name">${agent.displayName || agent.name}</span>
            <span class="agent-status ${agent.status || 'unknown'}"></span>
          </div>
          <div class="agent-card-platform">${agent.platform}/${agent.name}</div>
          <div class="agent-card-desc">${agent.description || 'No description'}</div>
          ${agent.lastSeen ? `<div style="color:#666;font-size:11px;">Last seen: ${new Date(agent.lastSeen).toLocaleString()}</div>` : ''}
          <div class="agent-card-actions">
            <button class="btn-small" onclick="pingAgent('${agent.platform}', '${agent.name}')">Ping</button>
            <button class="btn-small" onclick="sendToAgent('${agent.platform}/${agent.name}')">Send</button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="empty-state-small">No registered agents found</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="empty-state-small">Error loading agents: ${error.message}</p>`;
  }
};

window.pingAgent = async function(platform, name) {
  try {
    const response = await fetch(`/api/quack/agents/${platform}/${name}/ping`, { method: 'POST' });
    const data = await response.json();
    showToast(data.success ? `${name} is online!` : `${name} did not respond`);
    await loadRegisteredAgents();
  } catch (error) {
    showToast(`Error pinging agent: ${error.message}`, 'error');
  }
};

window.sendToAgent = function(agentPath) {
  openSendQuackModal();
  setTimeout(() => {
    const toField = document.getElementById('quack-to');
    if (toField) toField.value = agentPath;
  }, 100);
};

window.loadThreads = async function() {
  const container = document.getElementById('threads-list');
  
  try {
    const response = await fetch('/api/quack/threads');
    const data = await response.json();
    const threads = data.threads || [];
    
    if (threads.length > 0) {
      container.innerHTML = threads.map(thread => `
        <div class="thread-item" onclick="viewThread('${thread.threadId}')">
          <div class="thread-header">
            <span class="thread-id">${thread.threadId.substring(0, 8)}...</span>
            <span class="thread-count">${thread.messages?.length || 0} messages</span>
          </div>
          <div class="thread-participants">${thread.participants?.join(', ') || 'Unknown'}</div>
          <div class="thread-last-activity">Last activity: ${new Date(thread.lastActivity).toLocaleString()}</div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="empty-state-small">No conversation threads found</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="empty-state-small">Error loading threads: ${error.message}</p>`;
  }
};

window.viewThread = async function(threadId) {
  try {
    const response = await fetch(`/api/quack/thread/${threadId}`);
    const thread = await response.json();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width:600px;max-height:80vh;overflow-y:auto;">
        <div class="modal-header">
          <h3>Thread ${threadId.substring(0, 8)}...</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="thread-messages" style="display:flex;flex-direction:column;gap:12px;padding:16px;">
          ${(thread.messages || []).map(msg => `
            <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${msg.from?.includes('orchestrate') ? '#00d9ff' : '#a855f7'};">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:#00d9ff;font-weight:500;">${msg.from}</span>
                <span style="color:#666;font-size:11px;">${new Date(msg.timestamp).toLocaleString()}</span>
              </div>
              <p style="color:#ddd;font-size:14px;">${msg.task}</p>
              ${msg.priority && msg.priority !== 'normal' ? `<span class="priority-badge ${msg.priority}">${msg.priority}</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="padding:16px;border-top:1px solid rgba(255,255,255,0.1);">
          <button class="btn-secondary" onclick="archiveThread('${threadId}');this.closest('.modal-overlay').remove();">Archive Thread</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    showToast(`Error loading thread: ${error.message}`, 'error');
  }
};

window.archiveThread = async function(threadId) {
  try {
    const response = await fetch(`/api/quack/archive/${threadId}`, { method: 'POST' });
    const data = await response.json();
    showToast(data.success ? 'Thread archived!' : 'Failed to archive thread');
    await loadThreads();
  } catch (error) {
    showToast(`Error archiving thread: ${error.message}`, 'error');
  }
};

window.selectInbox = function (name) {
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
            ${msg.priority && msg.priority !== 'normal' ? `<span class="priority-badge ${msg.priority}">${msg.priority}</span>` : ''}
          </div>
          <p style="color:#ccc;font-size:13px;margin:6px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${msg.task}</p>
          <p style="color:#666;font-size:11px;">${new Date(msg.timestamp).toLocaleString()}</p>
          ${msg.tags?.length > 0 ? `<div class="message-tags">${msg.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        </div>
      `).join('') : '<p style="color:#888;text-align:center;padding:20px;">No messages</p>'}
    </div>
  `;

  document.body.appendChild(sidebar);
}

window.closeInboxSidebar = function () {
  const sidebar = document.getElementById('inbox-sidebar');
  if (sidebar) sidebar.remove();
  selectedInbox = null;
};

window.showMessageDetail = function (messageId) {
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

window.closeMessageDetail = function () {
  const modal = document.getElementById('message-detail-modal');
  if (modal) modal.remove();
  selectedMessage = null;
};

window.approveMessage = async function (id) {
  try {
    await fetch(`/api/quack/approve/${id}`, { method: 'POST' });
    closeMessageDetail();
    closeInboxSidebar();
    await loadControlRoom();
  } catch (error) {
    alert('Error approving message: ' + error.message);
  }
};

window.startWork = async function (id) {
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

window.completeMessage = async function (id) {
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

window.failMessage = async function (id) {
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

window.updateNodeConfig = function (key, value) {
  if (selectedNode) {
    selectedNode[key] = value;
    const nodeEl = document.getElementById(selectedNode.id);
    if (nodeEl) {
      nodeEl.querySelector('.node-body').textContent = getNodeDescription(selectedNode);
    }
  }
};

window.setInputSource = function (inputKey, source) {
  if (selectedNode && selectedNode.inputs) {
    selectedNode.inputs[inputKey] = { source, label: '', value: '' };
    showNodeConfig(selectedNode);
  }
};

window.updateInputLabel = function (inputKey, label) {
  if (selectedNode && selectedNode.inputs) {
    selectedNode.inputs[inputKey].label = label;
  }
};

window.updateInputValue = function (inputKey, value) {
  if (selectedNode && selectedNode.inputs) {
    selectedNode.inputs[inputKey].value = value;
  }
};

window.deleteNode = function (nodeId) {
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

window.clearCanvas = function () {
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

window.saveCurrentWorkflow = async function () {
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

window.testRunWorkflow = function () {
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

window.loadWorkflowForRun = async function () {
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

window.runWorkflow = async function () {
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

window.loadTemplate = function (templateId) {
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

// ===== ENHANCED CONTROL ROOM =====

let activityEvents = [];
let activeWorkflows = [];
let refreshInterval = null;
let settings = {
  apiKeys: { anthropic: '', openai: '', google: '', grok: '' },
  webhooks: { replit: '', completion: '' },
  notifications: { sound: true, toast: true, email: false },
  refreshInterval: 8,
  theme: 'dark',
  defaultTab: 'control-room'
};

function loadSettings() {
  const saved = localStorage.getItem('orchestrate-settings');
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) };
  }
  applySettings();
}

function applySettings() {
  if (document.getElementById('api-anthropic')) {
    document.getElementById('api-anthropic').value = settings.apiKeys?.anthropic || '';
    document.getElementById('api-openai').value = settings.apiKeys?.openai || '';
    document.getElementById('api-google').value = settings.apiKeys?.google || '';
    document.getElementById('api-grok').value = settings.apiKeys?.grok || '';
    document.getElementById('webhook-replit').value = settings.webhooks?.replit || '';
    document.getElementById('webhook-completion').value = settings.webhooks?.completion || '';
    document.getElementById('notify-sound').checked = settings.notifications?.sound ?? true;
    document.getElementById('notify-toast').checked = settings.notifications?.toast ?? true;
    document.getElementById('notify-email').checked = settings.notifications?.email ?? false;
    document.getElementById('refresh-interval').value = settings.refreshInterval || 8;
    document.getElementById('theme-select').value = settings.theme || 'dark';
    document.getElementById('default-tab').value = settings.defaultTab || 'control-room';
  }

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(refreshControlRoom, (settings.refreshInterval || 8) * 1000);
}

window.openSettings = function () {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('settings').classList.add('active');
  applySettings();
};

window.saveSettings = function () {
  settings = {
    apiKeys: {
      anthropic: document.getElementById('api-anthropic').value,
      openai: document.getElementById('api-openai').value,
      google: document.getElementById('api-google').value,
      grok: document.getElementById('api-grok').value
    },
    webhooks: {
      replit: document.getElementById('webhook-replit').value,
      completion: document.getElementById('webhook-completion').value
    },
    notifications: {
      sound: document.getElementById('notify-sound').checked,
      toast: document.getElementById('notify-toast').checked,
      email: document.getElementById('notify-email').checked
    },
    refreshInterval: parseInt(document.getElementById('refresh-interval').value),
    theme: document.getElementById('theme-select').value,
    defaultTab: document.getElementById('default-tab').value
  };

  localStorage.setItem('orchestrate-settings', JSON.stringify(settings));
  applySettings();
  showToast('Settings saved!');
  document.querySelector('[data-tab="control-room"]').click();
};

window.resetSettings = function () {
  localStorage.removeItem('orchestrate-settings');
  settings = {
    apiKeys: { anthropic: '', openai: '', google: '', grok: '' },
    webhooks: { replit: '', completion: '' },
    notifications: { sound: true, toast: true, email: false },
    refreshInterval: 8,
    theme: 'dark',
    defaultTab: 'control-room'
  };
  applySettings();
  showToast('Settings reset to defaults');
};

window.testApiKey = async function (provider) {
  const keyEl = document.getElementById('api-' + provider);
  if (!keyEl.value) {
    showToast('Please enter an API key first', 'error');
    return;
  }
  showToast('Testing ' + provider + ' API key...');
};

window.clearApiKey = function (provider) {
  document.getElementById('api-' + provider).value = '';
  showToast(provider + ' API key cleared');
};

window.testWebhook = async function (type) {
  const urlEl = document.getElementById('webhook-' + type);
  if (!urlEl.value) {
    showToast('Please enter a webhook URL first', 'error');
    return;
  }
  showToast('Testing webhook...');
};

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: ${type === 'error' ? '#ef4444' : '#22c55e'};
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 2000;
    animation: slideIn 0.3s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Activity Feed
function addActivity(type, title, body, actions = []) {
  const icons = {
    quack: '🦆',
    workflow_start: '▶️',
    workflow_complete: '✅',
    workflow_waiting: '⏸️',
    workflow_fail: '❌',
    logicart: '📊',
    message_approved: '✉️'
  };

  activityEvents.unshift({
    id: 'evt-' + Date.now(),
    type,
    icon: icons[type] || '📌',
    title,
    body,
    actions,
    time: new Date()
  });

  if (activityEvents.length > 50) activityEvents.pop();
  renderActivityFeed();
}

function renderActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  const filter = document.getElementById('activity-filter')?.value || 'all';
  let events = activityEvents;

  if (filter !== 'all') {
    events = activityEvents.filter(e => {
      if (filter === 'quack') return e.type.includes('quack') || e.type.includes('message');
      if (filter === 'workflow') return e.type.includes('workflow');
      if (filter === 'logicart') return e.type === 'logicart';
      return true;
    });
  }

  if (events.length === 0) {
    feed.innerHTML = '<p class="empty-state-small">No recent activity</p>';
    return;
  }

  feed.innerHTML = events.slice(0, 20).map(evt => {
    const timeAgo = getTimeAgo(evt.time);
    const actionsHtml = evt.actions.map(a =>
      `<button onclick="${a.onclick}">${a.label}</button>`
    ).join('');

    return `
      <div class="activity-item" data-type="${evt.type}">
        <div class="activity-header">
          <div class="activity-icon-title">
            <span class="activity-icon">${evt.icon}</span>
            <span class="activity-title">${evt.title}</span>
          </div>
          <span class="activity-time">${timeAgo}</span>
        </div>
        ${evt.body ? `<div class="activity-body">${evt.body}</div>` : ''}
        ${actionsHtml ? `<div class="activity-actions">${actionsHtml}</div>` : ''}
      </div>
    `;
  }).join('');
}

window.filterActivity = function () {
  renderActivityFeed();
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago';
  return Math.floor(seconds / 86400) + ' days ago';
}

// Active Workflows Panel
function renderActiveWorkflows() {
  const list = document.getElementById('active-workflows-list');
  if (!list) return;

  document.getElementById('stat-workflows').textContent = activeWorkflows.length;

  if (activeWorkflows.length === 0) {
    list.innerHTML = '<p class="empty-state-small">No active workflows</p>';
    return;
  }

  list.innerHTML = activeWorkflows.map(wf => {
    const progress = Math.round((wf.currentStep / wf.totalSteps) * 100);
    const statusClass = wf.status.toLowerCase().replace(' ', '-');

    let actionsHtml = '<button class="btn-view" onclick="viewWorkflow(\'' + wf.id + '\')">View</button>';
    if (wf.status === 'WAITING APPROVAL') {
      actionsHtml += '<button class="btn-review" onclick="reviewWorkflow(\'' + wf.id + '\')">Review Now</button>';
    } else if (wf.status === 'RUNNING') {
      actionsHtml += '<button class="btn-pause" onclick="pauseWorkflow(\'' + wf.id + '\')">Pause</button>';
    }
    actionsHtml += '<button class="btn-cancel" onclick="cancelWorkflow(\'' + wf.id + '\')">Cancel</button>';

    return `
      <div class="active-workflow-item">
        <div class="active-workflow-header">
          <span class="active-workflow-name">${wf.name}</span>
          <span class="workflow-status-badge ${statusClass}">${wf.status}</span>
        </div>
        <div class="workflow-progress-bar">
          <div class="workflow-progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="workflow-current-step">Step ${wf.currentStep}/${wf.totalSteps}: ${wf.currentAction}</div>
        <div class="workflow-actions-row">${actionsHtml}</div>
      </div>
    `;
  }).join('');
}

window.viewWorkflow = function (id) {
  document.querySelector('[data-tab="cowork"]').click();
};

window.reviewWorkflow = function (id) {
  const wf = activeWorkflows.find(w => w.id === id);
  if (wf) {
    wf.status = 'RUNNING';
    addActivity('workflow_start', `Workflow "${wf.name}" resumed`, 'Human review completed');
    renderActiveWorkflows();
  }
};

window.pauseWorkflow = function (id) {
  const wf = activeWorkflows.find(w => w.id === id);
  if (wf) {
    wf.status = 'PAUSED';
    renderActiveWorkflows();
    showToast('Workflow paused');
  }
};

window.cancelWorkflow = function (id) {
  activeWorkflows = activeWorkflows.filter(w => w.id !== id);
  addActivity('workflow_fail', 'Workflow cancelled', '');
  renderActiveWorkflows();
  showToast('Workflow cancelled');
};

// Send Quack Modal
window.openSendQuackModal = function () {
  const modal = document.createElement('div');
  modal.id = 'send-quack-modal';
  modal.className = 'send-quack-modal';
  modal.innerHTML = `
    <div class="send-quack-content">
      <h2>🦆 Send Quack</h2>
      <div class="settings-field">
        <label>To Agent</label>
        <select id="quack-to">
          <option value="claude">Claude</option>
          <option value="gpt">GPT-4</option>
          <option value="gemini">Gemini</option>
          <option value="replit">Replit</option>
          <option value="cursor">Cursor</option>
          <option value="grok">Grok</option>
          <option value="copilot">Copilot</option>
        </select>
      </div>
      <div class="settings-field">
        <label>Task</label>
        <textarea id="quack-task" rows="4" placeholder="Describe the task..."></textarea>
      </div>
      <div class="settings-field">
        <label>Context (optional)</label>
        <textarea id="quack-context" rows="2" placeholder="Additional context..."></textarea>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn-primary" onclick="sendQuackMessage()">Send Quack</button>
        <button class="btn-secondary" onclick="closeSendQuackModal()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.closeSendQuackModal = function () {
  const modal = document.getElementById('send-quack-modal');
  if (modal) modal.remove();
};

window.sendQuackMessage = async function () {
  const to = document.getElementById('quack-to').value;
  const task = document.getElementById('quack-task').value;
  const context = document.getElementById('quack-context').value;

  if (!task) {
    showToast('Please enter a task', 'error');
    return;
  }

  try {
    await fetch('/api/quack/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, task, context })
    });

    addActivity('quack', `Quack sent to /${to}`, task.substring(0, 60) + '...', []);
    closeSendQuackModal();
    showToast('Quack sent successfully!');

    if (settings.notifications?.sound) {
      playQuackSound();
    }
  } catch (error) {
    showToast('Error sending quack: ' + error.message, 'error');
  }
};

function playQuackSound() {
  // Simple audio feedback
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) { }
}

// Analyze Code Modal
window.openAnalyzeModal = function () {
  const modal = document.createElement('div');
  modal.id = 'analyze-modal';
  modal.className = 'send-quack-modal';
  modal.innerHTML = `
    <div class="send-quack-content">
      <h2>📊 Analyze Code</h2>
      <div class="settings-field">
        <label>Code to Analyze</label>
        <textarea id="analyze-code" rows="10" placeholder="Paste your code here..." style="font-family:monospace;font-size:12px;"></textarea>
      </div>
      <div class="settings-field">
        <label>Language</label>
        <select id="analyze-lang">
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn-primary" onclick="analyzeCode()">Analyze with LogicArt</button>
        <button class="btn-secondary" onclick="closeAnalyzeModal()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.closeAnalyzeModal = function () {
  const modal = document.getElementById('analyze-modal');
  if (modal) modal.remove();
};

window.analyzeCode = async function () {
  const code = document.getElementById('analyze-code').value;
  const lang = document.getElementById('analyze-lang').value;

  if (!code) {
    showToast('Please enter code to analyze', 'error');
    return;
  }

  try {
    const response = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'analyze_code',
        params: { code, language: lang }
      })
    });
    const data = await response.json();

    if (data.result && data.result.url) {
      addActivity('logicart', `LogicArt: analyzed ${lang} code`, 'Complexity: ' + (data.result.complexity || 'N/A'), [
        { label: 'View Flowchart', onclick: `window.open('${data.result.url}', '_blank')` }
      ]);
      window.open(data.result.url, '_blank');
    }
    closeAnalyzeModal();
    showToast('Code analysis complete!');
  } catch (error) {
    showToast('Analysis error: ' + error.message, 'error');
  }
};

// Template Dropdown
let templateDropdownEl = null;

window.openTemplateDropdown = function (event) {
  if (templateDropdownEl) {
    templateDropdownEl.remove();
    templateDropdownEl = null;
    return;
  }

  const templates = [
    { id: 'content-pipeline', icon: '📝', name: 'Content Pipeline' },
    { id: 'code-review', icon: '🔍', name: 'Code Review' },
    { id: 'data-analysis', icon: '📊', name: 'Data Analysis' },
    { id: 'image-generation', icon: '🎨', name: 'Image Generation' },
    { id: 'email-processor', icon: '📧', name: 'Email Processor' }
  ];

  const dropdown = document.createElement('div');
  dropdown.className = 'template-dropdown';
  dropdown.style.position = 'fixed';
  dropdown.style.top = (event.target.getBoundingClientRect().bottom + 5) + 'px';
  dropdown.style.left = event.target.getBoundingClientRect().left + 'px';

  dropdown.innerHTML = templates.map(t => `
    <div class="template-dropdown-item" onclick="runTemplate('${t.id}')">
      <span>${t.icon}</span>
      <span>${t.name}</span>
    </div>
  `).join('');

  document.body.appendChild(dropdown);
  templateDropdownEl = dropdown;

  setTimeout(() => {
    document.addEventListener('click', closeTemplateDropdown, { once: true });
  }, 0);
};

function closeTemplateDropdown() {
  if (templateDropdownEl) {
    templateDropdownEl.remove();
    templateDropdownEl = null;
  }
}

window.runTemplate = function (templateId) {
  closeTemplateDropdown();
  loadTemplate(templateId);

  const wf = {
    id: 'wf-' + Date.now(),
    name: templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    status: 'RUNNING',
    currentStep: 1,
    totalSteps: 4,
    currentAction: 'Initializing...'
  };
  activeWorkflows.push(wf);

  addActivity('workflow_start', `Workflow "${wf.name}" started`, 'Step 1/4: Initializing...', [
    { label: 'View Progress', onclick: `document.querySelector('[data-tab="cowork"]').click()` }
  ]);

  renderActiveWorkflows();
  showToast('Template loaded - running workflow!');
};

// Enhanced Control Room refresh
async function loadControlRoom() {
  loadSettings();

  try {
    const response = await fetch('/api/quack/inboxes');
    const data = await response.json();

    if (data.inboxes) {
      let totalMessages = 0;
      let totalPending = 0;

      data.inboxes.forEach(inbox => {
        totalMessages += inbox.messages?.length || 0;
        totalPending += inbox.pendingCount || 0;

        // Add to activity feed for new messages
        if (inbox.messages) {
          inbox.messages.slice(0, 2).forEach(msg => {
            if (msg.status === 'pending' && !activityEvents.find(e => e.id === msg.id)) {
              addActivity('quack', `New quack from /${inbox.name}`, msg.task?.substring(0, 60) || '', [
                { label: 'View', onclick: `openAgentSidebar('${inbox.name}')` },
                { label: 'Approve', onclick: `approveMessage('${msg.id}')` }
              ]);
            }
          });
        }
      });

      document.getElementById('stat-inboxes').textContent = data.inboxes.length;
      document.getElementById('stat-messages').textContent = totalMessages;
      document.getElementById('stat-pending').textContent = totalPending;

      renderAgentTiles(data.inboxes);
    }
  } catch (error) {
    console.error('Error loading control room:', error);
  }

  renderActiveWorkflows();
  renderActivityFeed();
}

window.refreshControlRoom = async function () {
  await loadControlRoom();
};

// ===== TEMPLATE GALLERY =====

let agentTemplates = { templates: [], categories: {} };
let currentTemplateFilter = 'all';

window.loadTemplateGallery = async function() {
  const container = document.getElementById('template-gallery');
  try {
    const response = await fetch('/agent-templates.json');
    agentTemplates = await response.json();
    renderTemplateGallery();
  } catch (error) {
    container.innerHTML = `<p class="empty-state">Error loading templates: ${error.message}</p>`;
  }
};

window.refreshTemplateGallery = function() {
  loadTemplateGallery();
};

window.filterTemplates = function(category) {
  currentTemplateFilter = category;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  renderTemplateGallery();
};

function renderTemplateGallery() {
  const container = document.getElementById('template-gallery');
  const templates = agentTemplates.templates.filter(t => 
    currentTemplateFilter === 'all' || t.category === currentTemplateFilter
  );
  
  if (templates.length === 0) {
    container.innerHTML = '<p class="empty-state">No templates in this category</p>';
    return;
  }
  
  const complexityColors = {
    low: '#22c55e',
    medium: '#eab308', 
    high: '#ef4444'
  };
  
  container.innerHTML = templates.map(template => {
    const cat = agentTemplates.categories[template.category] || {};
    return `
      <div class="template-card agent-template" data-template-id="${template.id}">
        <div class="template-header">
          <span class="template-icon">${cat.icon || '🤖'}</span>
          <span class="complexity-badge" style="background:${complexityColors[template.complexity]}">${template.complexity}</span>
        </div>
        <h3>${template.name}</h3>
        <p class="template-description">${template.description}</p>
        <div class="template-meta">
          <div class="template-commands">
            <strong>Commands:</strong> ${template.commands.slice(0, 2).join(', ')}${template.commands.length > 2 ? '...' : ''}
          </div>
          <div class="template-integrations">
            ${template.integrations.slice(0, 2).map(i => `<span class="integration-tag">${i}</span>`).join('')}
            ${template.integrations.length > 2 ? `<span class="integration-more">+${template.integrations.length - 2}</span>` : ''}
          </div>
        </div>
        <div class="template-actions">
          <button class="btn-secondary" onclick="previewTemplate('${template.id}')">Preview</button>
          <button class="btn-primary" onclick="editInLogiProcess('${template.id}')">Edit in LogiProcess</button>
        </div>
      </div>
    `;
  }).join('');
}

window.previewTemplate = function(templateId) {
  const template = agentTemplates.templates.find(t => t.id === templateId);
  if (!template) return;
  
  const cat = agentTemplates.categories[template.category] || {};
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal template-preview-modal">
      <div class="modal-header">
        <h2>${cat.icon || '🤖'} ${template.name}</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p class="template-desc">${template.description}</p>
        
        <div class="preview-section">
          <h4>Complexity</h4>
          <span class="complexity-badge complexity-${template.complexity}">${template.complexity.toUpperCase()}</span>
        </div>
        
        <div class="preview-section">
          <h4>Commands</h4>
          <div class="command-list">
            ${template.commands.map(c => `<code>${c}</code>`).join('')}
          </div>
        </div>
        
        <div class="preview-section">
          <h4>Integrations</h4>
          <div class="integration-list">
            ${template.integrations.length ? template.integrations.map(i => `<span class="integration-tag">${i}</span>`).join('') : '<em>None required</em>'}
          </div>
        </div>
        
        <div class="preview-section">
          <h4>Workflow Structure</h4>
          <div class="workflow-preview">
            ${template.nodes.map(n => `<span class="node-preview node-${n.type}">${n.label}</span>`).join(' → ')}
          </div>
        </div>
        
        <div class="preview-section">
          <h4>Agent Configuration</h4>
          <pre class="agent-config">${JSON.stringify(template.agentConfig, null, 2)}</pre>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-primary" onclick="editInLogiProcess('${template.id}'); this.closest('.modal-overlay').remove();">Edit in LogiProcess</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.editInLogiProcess = async function(templateId) {
  const template = agentTemplates.templates.find(t => t.id === templateId);
  if (!template) {
    showToast('Template not found', 'error');
    return;
  }
  
  try {
    const templateData = btoa(JSON.stringify(template));
    const url = `https://logic.art/process?template=${templateData}`;
    window.open(url, '_blank');
    showToast(`Opening ${template.name} in LogiProcess...`);
  } catch (error) {
    showToast('Error opening LogiProcess: ' + error.message, 'error');
  }
};

// Load templates when Templates tab is activated
const originalSwitchTab = window.switchTab;
if (originalSwitchTab) {
  window.switchTab = function(tabName) {
    originalSwitchTab(tabName);
    if (tabName === 'templates' && agentTemplates.templates.length === 0) {
      loadTemplateGallery();
    }
  };
} else {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'templates' && agentTemplates.templates.length === 0) {
          loadTemplateGallery();
        }
      });
    });
  });
}
