// ProcessInput.tsx - Textarea for "Describe your process in natural language"
import React, { useState } from 'react';

interface ProcessInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  placeholder?: string;
}

const EXAMPLE_PROMPTS = [
  "Customer requests a refund. Support reviews the request. If approved, finance processes payment. Customer receives confirmation.",
  "User submits order. System validates inventory. If available, warehouse prepares shipment. Delivery partner picks up package.",
  "Employee submits expense report. Manager reviews and approves. Finance verifies receipts. Payment is processed.",
];

export const ProcessInput: React.FC<ProcessInputProps> = ({
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  placeholder = "Describe your business process in natural language...\n\nExample: Customer submits a refund request. Support team reviews the request. If approved, finance processes the refund. Customer receives email confirmation.",
}) => {
  const [showExamples, setShowExamples] = useState(false);

  const handleExampleClick = (example: string) => {
    onChange(example);
    setShowExamples(false);
  };

  return (
    <div className="process-input">
      <div className="process-input-header">
        <h3>Describe Your Process</h3>
        <button
          className="examples-toggle"
          onClick={() => setShowExamples(!showExamples)}
        >
          {showExamples ? 'Hide' : 'Show'} Examples
        </button>
      </div>

      {showExamples && (
        <div className="examples-panel">
          <p className="examples-hint">Click an example to use it:</p>
          {EXAMPLE_PROMPTS.map((example, index) => (
            <button
              key={index}
              className="example-item"
              onClick={() => handleExampleClick(example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div className="input-container">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="process-textarea"
          rows={6}
          disabled={isGenerating}
        />
        <div className="input-footer">
          <span className="char-count">{value.length} characters</span>
          {onGenerate && (
            <button
              className="generate-btn"
              onClick={onGenerate}
              disabled={isGenerating || !value.trim()}
            >
              {isGenerating ? (
                <>
                  <span className="spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate Diagram
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="input-tips">
        <h4>Tips for best results:</h4>
        <ul>
          <li>Mention the <strong>actors/roles</strong> involved (Customer, Support, System)</li>
          <li>Describe <strong>decisions</strong> using "if/then" language</li>
          <li>Include <strong>waiting periods</strong> if applicable (e.g., "wait 24 hours")</li>
          <li>Be specific about the <strong>start</strong> and <strong>end</strong> of the process</li>
        </ul>
      </div>

      <div className="phase-notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          <strong>MVP Mode:</strong> AI-powered generation coming in Phase 2.
          For now, use the sample process or manually edit the diagram.
        </span>
      </div>
    </div>
  );
};

export default ProcessInput;
