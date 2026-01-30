# Orchestrate

## Overview

Orchestrate is an MCP (Model Context Protocol) server designed to empower AI agents with visual workflow orchestration capabilities. It allows users to design and execute complex workflows using natural language, visualize them through LogicArt/LogiProcess, and manage inter-agent communication via Quack (quack.us.com). The platform aims to streamline AI-driven task automation, enabling seamless integration and coordination across various AI models and services.

**Critical Design Principle:** The Quack suite is designed for developers working in dev windows with AI agents (like Replit Agent) doing the heavy lifting - not for autonomous background automation. Wake-up action is always required for Replit Agents (human user or CoWork programmatically).

Key capabilities include generating workflows from natural language prompts, visualizing workflow logic, querying multiple AI models simultaneously, and persisting workflow definitions. It supports a "Build Mode" for visual workflow design and a "Run Mode" for end-user execution.

## User Preferences

I want iterative development. I prefer detailed explanations. Ask before making major changes.

## System Architecture

Orchestrate functions as an MCP server utilizing SSE/JSON-RPC for communication with clients like Claude Desktop and Cowork.

**Core Architectural Patterns and Design Decisions:**

*   **Workflow Generation and Execution**: Workflows are generated from natural language prompts, defined using TypeScript, and executed by a dedicated engine. The system supports `Trigger`, `AI Agent`, `Transform`, `Condition`, `Human Review`, and `Output` node types for comprehensive workflow logic.
*   **Visual Workflow Design (LogicProcess Build Mode)**: Provides a visual node editor for creating and editing workflow templates with drag-and-drop functionality. Templates are BPMN-compatible JSON schemas.
*   **User-friendly Workflow Execution (CoWork Run Mode)**: Offers a simplified UI for end-users to run pre-defined workflows by filling out forms generated from runtime inputs.
*   **Inter-Agent Communication (Quack Integration)**: Features a robust system for developer-to-developer coordination with AI agents in dev windows. Agent messaging and workflow management is handled at quack.us.com - Orchestrate sends messages via Quack API but does not duplicate Quack's native inbox/control room functionality.
*   **Multi-AI Model Querying (AI Council)**: Designed to query multiple AI models concurrently, allowing for comparative analysis or diversified task execution.
*   **Workflow Persistence**: Workflows can be saved, loaded, and listed for reuse and management.
*   **Distributed Workflow Execution**: Workflows can dispatch steps to external agents via Quack, with a defined mechanism for sending prompts, polling for responses, and handling callbacks.
*   **Authentication (Voyai)**: Implements a secure server-to-server session handshake for user authentication, integrating with Voyai for login and feature access.
*   **UI/UX**: The Orchestrate dashboard provides tabs for Workflows, LogicProcess (visual editor), CoWork (run mode), Templates gallery, and Tools. Control Room functionality has been removed as it duplicates Quack's native features at quack.us.com.
*   **Agent Template Gallery**: Provides a curated collection of pre-built agent templates categorized by type (Brokerage, Utility, Coordination, Domain) and complexity, with LogiProcess integration for editing.
*   **Ralph Wiggum Mode**: A workflow pattern integrated via LogiProcess for persistent AI coding loops, utilizing `PROMPT.md`, `plan.md`, and `progress.md` artifacts to structure AI agent tasks.

**Technical Implementations:**

*   **Server-Side Events (SSE) and JSON-RPC 2.0**: Used for real-time communication and method invocation between the server and clients.
*   **TypeScript Definitions**: Strongly typed workflow definitions ensure data consistency and reduce errors.
*   **Frontend Technologies**: Standard web technologies (HTML, CSS, JavaScript) are used for the dashboard and CoWork UI.
*   **API Endpoints**: A comprehensive set of RESTful APIs manages workflows, Quack interactions, authentication, and template management.

## External Dependencies

*   **Claude Desktop / Cowork**: Clients that interact with the Orchestrate MCP server.
*   **LogicArt / LogiProcess**: Integrated for visual workflow design and visualization. LogiProcess specifically handles the visual editor and "Ralph Wiggum Mode".
*   **Quack (quack.us.com)**: A service for agent-to-agent messaging and workflow management. Orchestrate integrates with Quack for task dispatch, inbox monitoring, and message status updates.
*   **Anthropic (Claude)**: AI model integrated into the AI Council.
*   **OpenAI (GPT-4)**: AI model integrated into the AI Council.
*   **Google (Gemini)**: AI model integrated into the AI Council.
*   **xAI (Grok)**: AI model integrated into the AI Council, using an OpenAI-compatible API.
*   **Voyai**: Used for user authentication and managing user feature access.