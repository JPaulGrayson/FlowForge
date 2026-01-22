# Voyai Integration Guide for Orchestrate

This guide explains how to integrate Voyai's bundle features into Orchestrate, including Quack Premium, LogicArt Pro, and LogicProcess.

## Overview

Orchestrate is the premium developer toolkit bundle from Voyai. It combines:
- **Quack Premium**: Enhanced agent-to-agent messaging with priority routing
- **LogicArt Pro**: Cloud sync, AI debugging, and GitHub integration for flowcharts
- **LogicProcess**: Visual workflow builder with node editor

## Bundle Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | $0/month | Basic Quack messaging, LogicArt viewer |
| Orchestrate | $20/month | All premium features |
| Enterprise | Custom | Custom limits, priority support |

## API Endpoints

### Check Bundle Status

```
GET /api/orchestrate/status
```

Returns the current bundle status and available features.

**Response:**
```json
{
  "active": true,
  "plan": "orchestrate",
  "features": ["quack_premium", "logicart_pro", "logicprocess"],
  "expiresAt": "2026-02-22T00:00:00.000Z",
  "usage": {
    "quackMessages": 150,
    "workflowRuns": 25,
    "logicArtVisualizations": 42
  }
}
```

### Create Subscription

```
POST /api/orchestrate/subscribe
```

Creates a new bundle subscription.

**Request:**
```json
{
  "email": "user@example.com",
  "plan": "orchestrate"
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "sub_abc123",
  "checkoutUrl": "https://voyai.org/checkout/sub_abc123"
}
```

## Using the Voyai SDK

### Installation

The SDK is included in the `integration-packages/voyai-sdk/` directory.

### Basic Usage

```typescript
import { createVoyaiClient, VoyaiClient } from './integration-packages/voyai-sdk';

// For local development (defaults to /api)
const voyai = createVoyaiClient();

// For production with Voyai API
const voyaiProd = new VoyaiClient({
  apiKey: process.env.VOYAI_API_KEY,
  baseUrl: 'https://voyai.org/api'
});

// Check bundle status
const status = await voyai.getStatus();
console.log(`Plan: ${status.plan}, Features: ${status.features.join(', ')}`);

// Check specific feature
const hasQuackPremium = await voyai.checkFeature('quack_premium');

// Get usage stats (returns null if not available)
const usage = await voyai.getUsage();
if (usage) {
  console.log(`Messages sent: ${usage.quackMessages}`);
}
```

### Feature Gating

Use the SDK to gate premium features:

```typescript
const voyai = createVoyaiClient();

async function runPremiumWorkflow() {
  const hasLogicProcess = await voyai.checkFeature('logicprocess');
  
  if (!hasLogicProcess) {
    return { error: 'LogicProcess requires Orchestrate bundle' };
  }
  
  // Run the premium workflow
  return executeWorkflow();
}
```

## Quack Integration

Messages sent from Orchestrate use the inbox `replit/orchestrate`. Premium features include:
- Priority message routing
- Extended message retention (7 days vs 2 days)
- File attachments up to 10MB
- Webhook notifications

## LogicArt Pro Features

With the Orchestrate bundle, LogicArt includes:
- Cloud history storage
- GitHub sync for version control
- AI-powered debugging suggestions
- Custom themes and branding

## LogicProcess Features

The visual workflow builder includes:
- Drag-and-drop node editor
- AI Agent nodes for Quack messaging
- Human Review nodes for approval gates
- Transform nodes for data manipulation
- Template library with pre-built workflows

## Support

For integration help, send a Quack to `voyai/support` or visit https://voyai.org/support.
