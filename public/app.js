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

// ===== UTILITY FUNCTIONS =====

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
