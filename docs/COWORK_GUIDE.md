# FlowForge + Cowork Integration Guide

This guide explains how to use FlowForge with Claude's Cowork agentic mode.

## What is Cowork?

Cowork is Claude's agentic mode that can execute complex, multi-step tasks autonomously. Unlike conversational AI, Cowork can:

- Take on complex tasks and work through them step by step
- Read, edit, and organize files
- Use MCP tools like FlowForge to extend capabilities
- Work autonomously while you step away

## Setup

### 1. Configure FlowForge in Cowork

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "flowforge": {
      "type": "sse",
      "url": "https://flow-forge--jpaulgrayson.replit.app/api/mcp/sse"
    }
  }
}
```

### 2. Verify Connection

In Cowork, ask:
> "What tools do you have access to from FlowForge?"

Claude should list the available tools: generate_workflow, visualize_workflow, council_query, etc.

## Example Cowork Sessions

### Session 1: Research Project

**Your prompt:**
> "Research the latest developments in quantum computing. Use FlowForge to create a workflow, query the AI council for different perspectives, and generate a comprehensive report. Save everything when done."

**What Cowork does:**
1. Calls `generate_workflow` to create a research workflow
2. Uses `web_search` to find current information
3. Queries `council_query` for multi-AI perspectives
4. Calls `summarize` to create the report
5. Uses `save_workflow` to persist the workflow
6. Calls `visualize_workflow` to get a LogicArt URL

### Session 2: Code Review Automation

**Your prompt:**
> "I need to set up an automated code review process. Create a workflow that uses the AI council to review code for security, performance, and style. Then visualize it so I can share with my team."

**What Cowork does:**
1. Designs the workflow with council nodes
2. Saves it for reuse
3. Generates LogicArt visualization
4. Returns shareable URL

### Session 3: Content Pipeline

**Your prompt:**
> "Build me a content research pipeline that searches 3 topics in parallel, combines the results, and creates a summary. I want to see it visualized and saved for later use."

**What Cowork does:**
1. Creates parallel research workflow
2. Tests it with sample topics
3. Visualizes and saves
4. Provides execution instructions

## Best Practices

### Be Specific
Tell Cowork exactly what you want:
- What the workflow should accomplish
- What tools to use
- Whether to save/visualize the result

### Chain Operations
Cowork excels at multi-step tasks:
> "Generate a workflow, test it with these inputs, fix any issues, then save and visualize it."

### Use Council for Decisions
When you need multiple perspectives:
> "Ask the AI council whether this workflow design is optimal, then implement their suggestions."

## Troubleshooting

### Tools Not Available
Ensure your `.mcp.json` is correctly configured and restart Cowork.

### Slow Responses
FlowForge is hosted remotely. Allow a few seconds for responses, especially for council queries.

### Workflow Validation Errors
If a generated workflow has issues, ask Cowork to validate and fix it:
> "Check if this workflow is valid and fix any problems."
