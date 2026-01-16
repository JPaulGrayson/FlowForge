document.addEventListener('DOMContentLoaded', () => {
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

async function refreshWorkflows() {
  const container = document.getElementById('workflows-list');
  container.innerHTML = '<p class="loading">Loading workflows...</p>';
  await loadWorkflows();
}

async function visualizeWorkflow(id) {
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
}

async function loadWorkflow(id) {
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

function copyWorkflowJson(encoded) {
  const json = decodeURIComponent(encoded);
  navigator.clipboard.writeText(JSON.stringify(JSON.parse(json), null, 2));
  alert('Workflow JSON copied to clipboard!');
}
