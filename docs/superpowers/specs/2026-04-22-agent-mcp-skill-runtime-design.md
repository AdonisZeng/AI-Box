# Agent MCP Skill Runtime Design

Date: 2026-04-22
Status: Approved for planning
Scope: Agent module architecture, runtime, local skill loading, MCP integration, and execution visibility

## Summary

This design turns the current placeholder Agent module into a modular task execution system for general assistant work inside the Electron app. The selected direction is:

- A `task panel` user experience rather than a chat-first interface
- A `main-process execution kernel` with a `renderer-only presentation layer`
- Local Skill discovery from `C:\Users\33664\.agents\skills`
- Skill package compatibility with the existing `SKILL.md` folder structure used by Codex-style skills
- Support for both `automatic execution` and `confirm external actions` modes, with automatic execution as the default
- A true `agent loop` where MCP tool results and skill/script results are returned to the LLM as observations for subsequent decisions

The design keeps the Agent module modular. `Agent`, `MCP`, and `Skill` remain separate capability domains:

- `Agent` orchestrates work
- `MCP` provides tools
- `Skill` provides reusable local procedures, instructions, and optional execution entrypoints

## Problem Statement

The current Agent module is only a placeholder UI. The application already has:

- a modular app shell
- provider configuration and chat infrastructure
- a working MCP module and client
- a place for an Agent workspace

What it does not yet have is an execution architecture that allows the Agent to:

1. accept a task and turn it into structured execution steps
2. discover and select local Skills
3. discover and call MCP tools
4. run local Node, Python, or Shell entrypoints safely
5. pause for confirmation when external actions require approval
6. feed tool and script results back into the model to continue the task loop
7. expose the full process visibly in the UI

Without these pieces, the Agent module cannot perform real work and remains disconnected from the rest of the product direction.

## Goals

1. Build a first-phase Agent focused on `general assistant tasks`.
2. Keep the Agent architecture modular and aligned with the app's existing module system.
3. Allow the Agent to use both MCP tools and local Skills during task execution.
4. Support two execution modes:
   - `automatic execution`
   - `confirm external actions`
5. Make execution transparent by showing:
   - plan steps
   - selected Skills
   - MCP tool calls
   - script execution logs
   - final result
6. Support local Skill packages that follow the established `SKILL.md`-based folder structure.
7. Ensure MCP and Skill results are returned to the model to form a real agent loop.

## Non-Goals

1. No multi-agent orchestration in this phase.
2. No remote Skill installation or Skill marketplace.
3. No visual Skill editor or drag-and-drop workflow builder.
4. No advanced memory system beyond task-local execution state.
5. No fully user-configurable policy engine for permissions in this phase.
6. No attempt to merge the MCP module into the Agent module.
7. No redesign of unrelated app modules.

## Approved Direction

The approved direction is `B`: a `main-process execution kernel + renderer task panel`.

This direction is preferred over a renderer-heavy implementation because:

- it preserves Electron security boundaries
- it keeps execution logic out of UI components
- it makes approval gating centralized and reliable
- it creates a stable foundation for task history, retries, and future extensibility

This direction is preferred over an external daemon because:

- it is substantially lighter for phase one
- it fits the current project structure
- it avoids unnecessary process orchestration and deployment complexity

## High-Level Architecture

The Agent system is split into two layers:

1. `Renderer presentation layer`
2. `Main-process execution layer`

### Renderer Presentation Layer

The renderer owns only the task panel user experience. It does not directly plan tasks, run scripts, or call MCP tools. Its responsibilities are:

- capture task input
- let the user switch execution mode
- subscribe to task execution events
- render plan steps, selected Skills, tool traces, logs, and results
- surface approval prompts to the user

### Main-Process Execution Layer

The main process owns all execution and policy decisions. It contains the Agent runtime and its supporting subsystems. Its responsibilities are:

- create and manage task sessions
- gather available Skills and MCP tools
- call the model for planning and next-step decisions
- dispatch Skill and MCP actions
- run local scripts
- enforce execution mode and approval policy
- normalize action results into observations
- stream execution events back to the renderer

## Module Boundary Requirements

Preserving modularity is a hard requirement.

### Agent Module Boundary

`Agent` remains a normal app module registered through the existing module system. It should continue to be represented by:

- [src/modules/agent.ts](D:/Development/Electron/AI-Box/src/modules/agent.ts)
- [src/components/workspace/AgentWorkspace.tsx](D:/Development/Electron/AI-Box/src/components/workspace/AgentWorkspace.tsx)

The Agent module is the UI entrypoint and orchestration consumer. It is not the place where MCP protocol logic or Skill discovery logic should live.

### MCP Boundary

The MCP system remains its own capability domain. Existing MCP-specific code remains conceptually separate:

- [src/components/mcp/MCPWorkspace.tsx](D:/Development/Electron/AI-Box/src/components/mcp/MCPWorkspace.tsx)
- [src/lib/mcp/client.ts](D:/Development/Electron/AI-Box/src/lib/mcp/client.ts)

The Agent consumes MCP capabilities through a dedicated broker abstraction rather than directly owning MCP client logic.

### Skill Boundary

Skills are a separate local extension system. The Agent can search, select, and execute them, but the Skill system remains independently structured and loadable.

## Main-Process Runtime Components

The main-process execution layer should be divided into focused units rather than a single monolithic service.

### 1. TaskSessionManager

Responsibilities:

- create task sessions
- persist in-memory task-local execution state
- track current step, status, execution mode, and accumulated observations
- expose task state to event publishers and IPC handlers

### 2. AgentRuntime

Responsibilities:

- coordinate the full task lifecycle
- call the planner and decision loop
- dispatch each step to the correct subsystem
- determine when the task is complete, blocked, or failed

This is the orchestration core, not the home for every low-level concern.

### 3. Planner

Responsibilities:

- use the active LLM provider to turn the user task into structured next actions
- evaluate available Skills and available MCP tools
- decide whether to continue, call a tool, use a Skill, ask for confirmation, ask the user for clarification, or finish

The planner is loop-based, not one-shot. It must be able to act repeatedly based on new observations.

### 4. SkillRegistry

Responsibilities:

- scan the local Skill directory at `C:\Users\33664\.agents\skills`
- identify valid Skill packages
- parse `SKILL.md` metadata and discover optional resources
- parse optional Agent-facing metadata for AI Box execution
- provide searchable Skill summaries to the planner

### 5. SkillExecutor

Responsibilities:

- load the selected Skill's detailed instruction body and optional references as needed
- determine whether the Skill is instruction-only or executable
- dispatch executable entrypoints through the runner layer
- report structured outputs back to the Agent runtime

### 6. ToolBroker

Responsibilities:

- expose all currently available MCP tools to the Agent runtime
- abstract over connected server and tool lookup
- execute MCP tool calls
- normalize tool call results and errors

### 7. ApprovalGate

Responsibilities:

- evaluate whether a step is considered an external action
- enforce the current execution mode
- pause the task when confirmation is required
- resume execution after approval or rejection

### 8. RunnerManager

Responsibilities:

- select the correct runtime for Skill entrypoints
- support `Node`, `Python`, and `Shell`
- capture stdout, stderr, exit codes, and execution metadata
- normalize process results for both UI and model consumption

## Skill System Design

### Local Skill Directory

The phase-one local Skill root is fixed to:

- `C:\Users\33664\.agents\skills`

The first implementation should use this fixed path directly. A configurable path can be added later, but it is intentionally out of scope for phase one.

### Skill Package Structure

The Skill package structure should follow the existing `SKILL.md`-based convention rather than introducing a new private package format.

Each Skill package must contain:

- `SKILL.md` as the required entrypoint

Each Skill package may optionally contain:

- `agents/`
- `scripts/`
- `references/`
- `assets/`

Example:

```text
my-skill/
├── SKILL.md
├── agents/
│   ├── openai.yaml
│   └── ai-box.yaml
├── scripts/
│   └── run.py
├── references/
│   └── api.md
└── assets/
    └── template.md
```

### Required Skill Metadata

`SKILL.md` frontmatter remains the required base metadata source. The registry should parse:

- `name`
- `description`

The body of `SKILL.md` remains the human-readable and model-readable workflow description. It should be loaded lazily when the Agent chooses the Skill or needs more detail.

### AI Box Skill Metadata

Because AI Box needs execution-specific metadata, it should define an optional file:

- `agents/ai-box.yaml`

This file is AI Box specific and should hold machine-oriented execution metadata without polluting the base `SKILL.md` format.

Suggested fields include:

- `display_name`
- `tags`
- `input_schema`
- `allowed_mcp_tools`
- `confirmation_policy`
- `entrypoints`
- `default_runner`
- `artifacts`

This allows two Skill categories under one shared package structure:

1. `instruction-only Skills`
2. `executable Skills`

If `agents/ai-box.yaml` does not exist, the Skill is still usable as a procedural instruction resource.

### Skill Discovery and Indexing

The SkillRegistry should index each Skill into a searchable summary for the planner, including:

- id
- name
- description
- tags
- whether the Skill is executable
- declared allowed MCP tools
- declared runner types

This summary should be used during planning instead of eagerly loading every Skill body into context.

## MCP Integration Design

The Agent must not directly own raw MCP client concerns. Instead, it should consume MCP via the ToolBroker.

### Tool Discovery

The ToolBroker should collect tool summaries from currently connected MCP servers. These summaries should include:

- server id
- tool name
- description
- input schema

The planner consumes these summaries when deciding what actions are available.

### Tool Execution

When a planner step selects an MCP tool call:

1. AgentRuntime asks ApprovalGate whether the action requires confirmation.
2. If allowed, ToolBroker executes the MCP call.
3. The raw result is normalized into:
   - UI event payloads
   - model observation payloads

The Agent must never treat a tool call as terminal by default. The result must go back into the task loop unless the planner explicitly concludes the task is done.

## Execution Modes

The Agent supports two modes:

1. `automatic execution`
2. `confirm external actions`

Default mode is `automatic execution`.

### External Action Definition

For phase one, the following are considered external actions:

- MCP tool calls
- local script execution
- file-system or network side-effect actions exposed through Skills or tools

ApprovalGate should operate on normalized action types, not on UI labels or ad hoc string matching.

### Confirmation Flow

When a step requires confirmation:

1. AgentRuntime pauses the task
2. a structured `approval.required` event is emitted
3. the renderer shows the action summary, source, arguments, and expected effect
4. the user approves or rejects
5. AgentRuntime resumes or terminates the step accordingly

## Agent Task Loop

This is a true agent loop, not a linear workflow player.

### Loop Structure

The conceptual loop is:

1. receive task
2. gather available Skill and MCP summaries
3. ask the model for the next structured action
4. execute the action
5. normalize the result into an observation
6. return the observation to the model
7. ask for the next action
8. repeat until completion, failure, clarification request, or approval block

### Structured Step Types

The planner should emit step types such as:

- `reasoning`
- `use_skill`
- `call_tool`
- `run_script`
- `respond`
- `request_confirmation`
- `request_clarification`
- `finish`

This makes execution inspectable and easier to render in the task panel.

## Observation and Result Feedback Design

Returning action results to the model is mandatory.

### Two Output Channels

Every action result should be split into two channels:

1. `UI event channel`
2. `model observation channel`

The UI channel keeps rich, user-visible execution detail.

The model observation channel provides structured, compact, reasoning-friendly output.

### Observation Shape

Each completed action should produce a normalized observation similar to:

```ts
{
  type: 'tool_result' | 'skill_result' | 'script_result',
  actionId: 'step-3',
  name: 'filesystem.read_file',
  status: 'success' | 'error',
  summary: 'Read three config files and found activeProvider=lmstudio',
  data: {},
  rawExcerpt: '...',
  artifacts: []
}
```

### Log and Context Strategy

The UI should retain detailed logs.

The model should receive a summarized and structured result by default, not the entire raw log stream. This avoids context pollution from long script output while preserving full traceability in the UI.

Action IDs must be shared between the UI event stream and model observations so the same execution step can be traced across both views.

## Renderer Task Panel Design

The Agent module should be task-panel-first rather than chat-first.

Recommended sub-panels:

- `TaskInput`
- `ExecutionModeToggle`
- `PlanTimeline`
- `SkillPanel`
- `ToolTracePanel`
- `ExecutionLogPanel`
- `ResultPanel`

The renderer should remain event-driven and never be the source of truth for execution logic.

## IPC Design

The preload bridge should expose a narrow Agent surface rather than raw execution primitives.

Suggested IPC operations:

- `agent.startTask`
- `agent.approveAction`
- `agent.rejectAction`
- `agent.subscribeToTaskEvents`
- `agent.getTaskState`
- `agent.cancelTask`

The renderer should not receive direct access to shell execution, file execution, or MCP clients.

## Task and Event Model

Recommended event types:

- `task.created`
- `plan.generated`
- `step.started`
- `skill.selected`
- `tool.call.started`
- `tool.call.finished`
- `script.started`
- `script.output`
- `script.finished`
- `approval.required`
- `step.completed`
- `task.completed`
- `task.failed`

These events should be sufficient to drive the task panel without exposing the renderer to runtime internals.

## Failure Handling

Phase one should treat each step as a failure-aware unit rather than aborting the entire task on the first error.

### Recoverable Errors

Examples:

- MCP tool call failure
- Skill entrypoint exit code failure
- invalid script arguments
- missing optional references

These should be returned to the model as error observations so the planner can decide whether to retry, switch tools, simplify the approach, or inform the user.

### Terminal Errors

Examples:

- invalid runtime initialization
- broken IPC channel
- corrupted mandatory Skill package structure
- runner unavailable for a required step

These should fail the task directly.

### User Rejection

If a user rejects a required confirmation, the task should stop with a clear rejected state rather than continuing with a fallback action behind the user's back.

## Security and Safety

This design deliberately centralizes sensitive actions in the main process.

Security requirements:

1. Renderer must not directly execute scripts.
2. Renderer must not directly call MCP tools.
3. Skill packages must be treated as local extension packages, not trusted UI code.
4. Approval policy must apply equally to Agent-originated actions and Skill-originated actions.
5. RunnerManager must only support the approved phase-one runtimes:
   - Node
   - Python
   - Shell

## Implementation Boundaries

This design is expected to touch these areas:

- [src/components/workspace/AgentWorkspace.tsx](D:/Development/Electron/AI-Box/src/components/workspace/AgentWorkspace.tsx)
- new Agent UI subcomponents under `src/components/workspace/agent/` or similar
- new Agent state and runtime contracts under `src/lib/agent/` or equivalent
- `electron/main.ts` for Agent IPC registration
- `electron/preload.ts` for Agent bridge exposure
- MCP integration abstractions that wrap existing MCP client behavior

This design should not require:

- merging Agent and MCP modules into one module
- changing provider store shape globally
- redesigning unrelated workspaces

## Testing Strategy

### Runtime Tests

1. SkillRegistry discovers valid Skills from `C:\Users\33664\.agents\skills`.
2. SkillRegistry ignores invalid or incomplete Skill folders safely.
3. ToolBroker returns connected MCP tool summaries.
4. RunnerManager executes Node, Python, and Shell entrypoints and captures output.
5. ApprovalGate blocks external actions correctly in confirm mode.
6. AgentRuntime returns tool and script results as observations for subsequent planning.

### UI Tests

1. Agent task panel renders plan steps and updates incrementally.
2. Skill selection is visible in the UI.
3. MCP tool call traces render correctly.
4. Script output streams into the log panel without blocking the UI.
5. Approval prompts suspend visible execution correctly.

### Integration Tests

1. A task can select a local Skill, run its entrypoint, and produce a result.
2. A task can call an MCP tool and continue based on the returned result.
3. A task in confirm mode pauses before an external action and resumes after approval.
4. A failed tool or script call produces an error observation and a coherent next state.

## Phase-One Deliverable

At the end of phase one, the Agent module should be able to:

1. accept a general assistant task in a task panel
2. generate visible execution steps
3. discover Skills from `C:\Users\33664\.agents\skills`
4. discover and call MCP tools through a broker
5. execute Node, Python, and Shell Skill entrypoints
6. pause for confirmation when needed
7. stream all progress into the UI
8. return tool and script results to the model to continue the loop
9. produce a final answer with a full visible execution trace

That is the intended threshold for considering the Agent module no longer a placeholder, but a real product capability.
