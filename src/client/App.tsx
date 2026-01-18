// App.tsx - Main LogicProcess application
import React, { useState, useCallback } from 'react';
import { ProcessMap, ProcessStep, Role } from './types/process';
import { sampleRefundProcess, sampleOrderProcess } from './data/sampleProcess';
import SwimlaneDiagram from './components/SwimlaneDiagram';
import RoleManager from './components/RoleManager';
import ProcessInput from './components/ProcessInput';
import './styles/App.css';

// Sample processes available
const SAMPLE_PROCESSES = [
  { id: 'refund', name: 'Customer Refund', data: sampleRefundProcess },
  { id: 'order', name: 'Order Fulfillment', data: sampleOrderProcess },
];

const App: React.FC = () => {
  // State
  const [processMap, setProcessMap] = useState<ProcessMap>(sampleRefundProcess);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [processDescription, setProcessDescription] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'diagram' | 'input'>('diagram');

  // Update roles
  const handleRolesChange = useCallback((newRoles: Role[]) => {
    setProcessMap(prev => ({
      ...prev,
      roles: newRoles,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Handle step click
  const handleStepClick = useCallback((step: ProcessStep) => {
    setSelectedStepId(prev => prev === step.id ? null : step.id);
    setSelectedRoleId(step.roleId);
  }, []);

  // Load sample process
  const handleLoadSample = useCallback((sampleId: string) => {
    const sample = SAMPLE_PROCESSES.find(s => s.id === sampleId);
    if (sample) {
      setProcessMap(sample.data);
      setSelectedStepId(null);
      setSelectedRoleId(null);
    }
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="logo-icon">
            <rect x="2" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
            <rect x="9" y="10" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
            <rect x="16" y="17" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
            <path d="M5 7v3h7M12 14v3h7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <h1>LogicProcess</h1>
        </div>
        <p className="tagline">Business Process Mapping with BPMN Swimlanes</p>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button
          className={`nav-btn ${activeTab === 'diagram' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagram')}
        >
          Diagram View
        </button>
        <button
          className={`nav-btn ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          Process Input
        </button>
        <div className="nav-divider" />
        <div className="sample-selector">
          <label>Load Sample:</label>
          <select
            onChange={e => handleLoadSample(e.target.value)}
            value=""
          >
            <option value="" disabled>Select a sample...</option>
            {SAMPLE_PROCESSES.map(sample => (
              <option key={sample.id} value={sample.id}>
                {sample.name}
              </option>
            ))}
          </select>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main">
        {activeTab === 'diagram' ? (
          <div className="diagram-layout">
            {/* Sidebar - Role Manager */}
            <aside className="sidebar">
              <RoleManager
                roles={processMap.roles}
                onRolesChange={handleRolesChange}
                selectedRoleId={selectedRoleId}
                onSelectRole={setSelectedRoleId}
              />

              {/* Selected Step Info */}
              {selectedStepId && (
                <div className="step-details">
                  <h4>Selected Step</h4>
                  {(() => {
                    const step = processMap.steps.find(s => s.id === selectedStepId);
                    if (!step) return null;
                    const role = processMap.roles.find(r => r.id === step.roleId);
                    return (
                      <div className="step-info">
                        <p><strong>Name:</strong> {step.name}</p>
                        <p><strong>Type:</strong> {step.type}</p>
                        <p><strong>Role:</strong> {role?.name || 'Unknown'}</p>
                        {step.description && (
                          <p><strong>Description:</strong> {step.description}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </aside>

            {/* Diagram Canvas */}
            <div className="diagram-area">
              <SwimlaneDiagram
                processMap={processMap}
                selectedStepId={selectedStepId}
                onStepClick={handleStepClick}
              />
            </div>
          </div>
        ) : (
          <div className="input-layout">
            <ProcessInput
              value={processDescription}
              onChange={setProcessDescription}
              isGenerating={false}
            />
            <div className="input-preview">
              <h3>Current Process: {processMap.name}</h3>
              <p>{processMap.description}</p>
              <div className="process-summary">
                <div className="summary-item">
                  <span className="summary-value">{processMap.roles.length}</span>
                  <span className="summary-label">Roles</span>
                </div>
                <div className="summary-item">
                  <span className="summary-value">{processMap.steps.length}</span>
                  <span className="summary-label">Steps</span>
                </div>
                <div className="summary-item">
                  <span className="summary-value">{processMap.connections.length}</span>
                  <span className="summary-label">Connections</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>LogicProcess - MVP | Pan: Click + Drag | Zoom: Scroll | Keyboard: +/- to zoom, 0 to reset</p>
      </footer>
    </div>
  );
};

export default App;
