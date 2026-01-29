# 🧠 AI Council - Multi-Model Consensus

<div align="center">
  <img src="public/images/ai-council-consensus.png" alt="AI Council Consensus System" width="600">
  <p><em>Query multiple AI models simultaneously and synthesize unified responses</em></p>
</div>

---

## Overview

The **AI Council** is Orchestrate's multi-model consensus system that queries Claude, GPT-4, and Gemini in parallel, then aggregates their responses into a unified answer. This provides:

- 🎯 **Higher Accuracy** — Multiple perspectives reduce individual model biases
- ✅ **Confidence Scoring** — See agreement levels across models
- 🔄 **Comparative Analysis** — Understand where models agree and disagree
- ⚡ **Parallel Execution** — All models queried simultaneously for speed

---

## 🚀 Quick Start

### MCP Tool: `council_query`

```json
{
  "name": "council_query",
  "arguments": {
    "query": "What are the best practices for REST API design?",
    "models": ["claude", "gpt4", "gemini"]
  }
}
```

### Response

```json
{
  "consensus": {
    "summary": "All models agree on versioning, proper HTTP methods, and clear error responses...",
    "confidence": 0.92,
    "agreement": "high"
  },
  "individual": {
    "claude": { "response": "...", "confidence": 0.85 },
    "gpt4": { "response": "...", "confidence": 0.92 },
    "gemini": { "response": "...", "confidence": 0.88 }
  },
  "differences": [
    "Claude emphasizes HATEOAS, while GPT-4 and Gemini focus more on pagination patterns"
  ]
}
```

---

## 🔧 Consensus Patterns

The AI Council supports different aggregation patterns:

| Pattern | Description | Use Case |
|---------|-------------|----------|
| `consensus` | Find common ground across all responses | General questions, best practices |
| `vote` | Majority wins on discrete choices | Yes/no decisions, classifications |
| `compare` | Side-by-side analysis without merging | Understanding model differences |
| `debate` | Models critique each other's responses | Complex problem-solving |
| `chain` | First response feeds into next model | Iterative refinement |

### Pattern Examples

#### Consensus (Default)

```json
{
  "config": {
    "pattern": "consensus",
    "prompt": "Review this code for security vulnerabilities"
  }
}
```

#### Vote

```json
{
  "config": {
    "pattern": "vote",
    "prompt": "Is this SQL query vulnerable to injection? Answer YES or NO.",
    "threshold": 0.67
  }
}
```

#### Compare

```json
{
  "config": {
    "pattern": "compare",
    "prompt": "Explain quantum computing",
    "format": "side_by_side"
  }
}
```

---

## 📋 Workflow Integration

The AI Council can be used as a node type in Orchestrate workflows:

### Node Type: `council`

```json
{
  "id": "security-review",
  "type": "council",
  "label": "Security Review",
  "description": "Check for security vulnerabilities",
  "config": {
    "pattern": "consensus",
    "prompt": "Review this code for security vulnerabilities",
    "models": ["claude", "gpt4", "gemini"],
    "timeout": 30000
  }
}
```

### Example: Code Review Workflow

A complete workflow that uses the AI Council for multi-perspective code review:

```json
{
  "id": "code-review",
  "name": "AI Code Review Workflow",
  "description": "Use AI Council to review code from multiple perspectives",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "label": "Start"
    },
    {
      "id": "security-review",
      "type": "council",
      "label": "Security Review",
      "config": {
        "pattern": "consensus",
        "prompt": "Review this code for security vulnerabilities"
      }
    },
    {
      "id": "performance-review",
      "type": "council",
      "label": "Performance Review",
      "config": {
        "pattern": "consensus",
        "prompt": "Review this code for performance issues"
      }
    },
    {
      "id": "style-review",
      "type": "council",
      "label": "Style Review",
      "config": {
        "pattern": "consensus",
        "prompt": "Review this code for style and best practices"
      }
    },
    {
      "id": "generate-report",
      "type": "tool",
      "label": "Generate Report",
      "config": {
        "toolName": "summarize"
      }
    },
    {
      "id": "end",
      "type": "end",
      "label": "Complete"
    }
  ],
  "edges": [
    { "sourceNodeId": "start", "targetNodeId": "security-review" },
    { "sourceNodeId": "security-review", "targetNodeId": "performance-review" },
    { "sourceNodeId": "performance-review", "targetNodeId": "style-review" },
    { "sourceNodeId": "style-review", "targetNodeId": "generate-report" },
    { "sourceNodeId": "generate-report", "targetNodeId": "end" }
  ]
}
```

---

## ⚙️ Configuration Options

### Model Selection

| Model | Key | Provider |
|-------|-----|----------|
| Claude | `claude` | Anthropic |
| GPT-4 | `gpt4` | OpenAI |
| Gemini | `gemini` | Google |
| Grok | `grok` | xAI |

### Timeout Settings

```json
{
  "config": {
    "timeout": 30000,        // Per-model timeout (ms)
    "totalTimeout": 60000,   // Total operation timeout (ms)
    "retries": 2             // Retry failed models
  }
}
```

### Confidence Thresholds

```json
{
  "config": {
    "minConfidence": 0.7,    // Skip responses below threshold
    "consensusThreshold": 0.8 // Agreement level for consensus
  }
}
```

---

## 📊 Response Analysis

### Agreement Levels

| Level | Score Range | Meaning |
|-------|-------------|---------|
| `high` | 0.8 - 1.0 | Strong consensus, reliable answer |
| `medium` | 0.5 - 0.8 | Partial agreement, review differences |
| `low` | 0.0 - 0.5 | Significant disagreement, investigate |

### Difference Detection

The council automatically identifies where models diverge:

```json
{
  "differences": [
    {
      "topic": "Error handling approach",
      "models": {
        "claude": "Recommends try-catch with specific exceptions",
        "gpt4": "Suggests Result type pattern",
        "gemini": "Advocates for guard clauses"
      }
    }
  ]
}
```

---

## 🔗 API Endpoint

### POST `/api/council`

Direct API access to the AI Council:

```bash
curl -X POST "https://orchestrate.us.com/api/council" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the pros and cons of microservices?",
    "models": ["claude", "gpt4", "gemini"],
    "pattern": "consensus"
  }'
```

---

## 💡 Use Cases

### 1. Code Review

Get comprehensive code review from multiple AI perspectives:
- Security vulnerabilities
- Performance optimization
- Best practices adherence

### 2. Decision Making

Make informed decisions with multi-model input:
- Architecture choices
- Technology selection
- Risk assessment

### 3. Content Validation

Verify facts and claims across models:
- Fact-checking
- Bias detection
- Accuracy verification

### 4. Creative Synthesis

Combine creative ideas from multiple sources:
- Brainstorming
- Solution exploration
- Alternative generation

---

## 🔐 API Key Requirements

To use the AI Council, you need API keys for the models you want to query:

| Model | Environment Variable |
|-------|---------------------|
| Claude | `ANTHROPIC_API_KEY` |
| GPT-4 | `OPENAI_API_KEY` |
| Gemini | `GOOGLE_API_KEY` |
| Grok | `XAI_API_KEY` |

Or use **Voyai's Managed Allowance** for Pro users — no API keys needed!

---

## 🔗 Related Documentation

- [Orchestrate Overview](/) — Main documentation
- [Workflow Builder](/control-room) — Visual workflow editor
- [MCP Integration](https://orchestrate.us.com/docs) — Claude Desktop setup
- [LogicArt Visualization](https://logicart.us.com) — Flowchart visualization

---

<div align="center">
  <strong>AI Council</strong> — Consensus through collective intelligence
</div>
