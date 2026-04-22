# Chat Premium Stage Redesign

Date: 2026-04-22
Status: Approved for planning
Scope: Chat workspace visual and interaction redesign only

## Summary

This design updates the chat workspace into a more polished, product-grade experience built around a centered "Premium Stage" message area. The redesign prioritizes refined background layering, stronger visual hierarchy, tighter message density, and a calmer tool chrome. The selected direction combines:

- `A` as the primary aesthetic direction: polished card-based product feel
- A small amount of `B` density: more compact than the current chat UI
- `A2` background treatment: spotlight-stage atmosphere
- Center-focused hierarchy: the message list is the primary visual focal point
- `B1` focus behavior: the stage container, not individual bubbles, carries the main spotlight

The redesign intentionally avoids changing provider logic, store shape, message streaming behavior, or core chat state management.

## Problem Statement

The current chat workspace is functional, but it does not yet feel like a cohesive, finished product UI. The main issues are:

1. The message area lacks a clear visual "hero" region.
2. The dialogue bubbles feel too spacious relative to their content.
3. Top bars, status strips, message content, and the input area compete for attention.
4. Background, cards, and controls feel like good individual pieces, but not one unified interface language.
5. State changes such as generating, thinking, connected, hover, and focus are readable, but not expressed with a consistent premium interaction style.

## Goals

1. Make the message list the unmistakable focal point of the chat workspace.
2. Increase perceived product quality through depth, lighting, and structure instead of oversized whitespace.
3. Reduce the "empty bubble" feeling by tightening message density.
4. Make the top chrome quieter so the content stage dominates.
5. Keep the redesign safely scoped to UI and interaction presentation in the chat workspace.

## Non-Goals

1. No provider or networking changes.
2. No changes to Zustand store structure.
3. No changes to message streaming or thinking parsing logic.
4. No redesign of non-chat modules in this iteration.
5. No broad design-system rewrite for the entire app in this phase.

## Approved Direction

### Visual Language

The redesign uses a polished desktop-product aesthetic with a restrained spotlight treatment. The page should feel more like a mature AI product surface than a generic tool shell. The premium quality comes from layered surfaces, soft lighting, subtle translucency, and cleaner stage framing rather than from excessive gradients or decoration.

### Background and Hierarchy

The overall background uses a soft spotlight-stage treatment. The outer page recedes visually, while the center of the chat workspace gently brightens to frame the message area. This should guide the eye into the middle of the page without becoming flashy.

The primary visual hierarchy is:

1. Message stage container
2. Message content
3. Input composer
4. Session tabs and status tools
5. Global app chrome

### Stage Focus Strategy

The spotlight belongs mainly to the central message-stage container rather than to each message bubble. Individual bubbles should still feel refined, but the main "product moment" comes from the stage surface that holds the conversation.

This preserves a mature product feel and prevents the interface from becoming visually noisy or too animated.

## Layout Architecture

The chat workspace will move to a three-layer structure:

1. `Workspace backdrop`
   A calm background field with the spotlight atmosphere and low-contrast separation from the rest of the app shell.

2. `Central stage container`
   A centered content stage with subtle edge definition, soft shadows, and a gently elevated surface treatment. This stage will visually hold the message list and composer as one coherent conversation space.

3. `Internal conversation flow`
   Messages, thinking panels, and composer arranged with consistent rhythm, controlled density, and clear parent-child relationships.

### Width and Centering

The stage container should feel centered and intentional, but not narrow. The design should avoid the "small floating card in the middle" effect. Instead, it should read as a generously sized content stage that still has a clearly framed boundary.

### Internal Spacing

Internal spacing should be tightened compared with the current chat UI. The redesign should reduce wasted gap between:

- stage edges and messages
- avatars and content
- bubble edge and text content
- thinking panel and parent message
- composer edge and input contents

The result should feel more precise rather than merely smaller.

## Component-Level Design

### Top App Bar

The top app bar remains present for branding and global actions, but it should become quieter. It should use lower contrast, lighter borders, and reduced visual weight so it frames the workspace rather than competing with it.

Theme switching remains in the top bar, but the bar itself should visually step back.

### Session Tabs

The session tabs should become a lighter tool strip rather than a heavy structural divider. Active state remains clearly visible, but inactive tabs should recede more. New-chat and delete affordances should feel like members of the same control family instead of separate utility buttons.

### Provider and Model Status

The provider/model/connection row should stop behaving like a full-strength independent bar. It should become a secondary information element, ideally integrated into the upper tool region or presented as a lighter stage-adjacent badge cluster.

It must stay readable, but should no longer compete with the conversation stage.

### Message Stage Container

This is the key redesign element. It should:

- hold the message list as the dominant content region
- use soft depth and restrained light focus
- visually unify the list and composer
- support both dark and light themes with equivalent hierarchy

The stage should feel premium without becoming glass-heavy or overly glossy.

### Message Rows

Assistant and user messages should follow a more stable visual rhythm. Vertical spacing between rows should feel deliberate and consistent. The current layout already has good building blocks, but the redesign should make the whole stream feel like one system.

### Message Bubbles

The current bubbles feel too far from their own content. The redesign should solve that by adjusting all three of the following together:

1. inner padding
2. bubble max width and line-length behavior
3. outer spacing around each row

Assistant bubbles should feel like refined reading cards with less internal emptiness. User bubbles should remain more vivid, but their presence should come from cleaner proportion and sharper containment, not just solid color mass.

### Thinking Panel

The thinking panel should read as an extension of its parent message rather than a separate block with a different UI identity. Expanded/collapsed motion should be smoother and feel attached to the parent assistant message.

Its hierarchy should be:

- primary answer content first
- thinking as a controlled secondary layer

### Composer

The composer should become a docked part of the stage, not a separate footer-like region. It should visually belong to the same conversation surface as the message list.

The textarea, send button, and stop button should feel more unified and slightly more compact than now. The focus state should look premium and deliberate, but the overall composer footprint should not grow.

## Interaction Design

### Motion

Motion should be restrained and product-grade:

- stage container softly reveals on load
- new messages rise/fade in over a short distance
- composer focus state subtly increases edge/light emphasis
- thinking panel expand/collapse should be smooth and attached to the message

Avoid decorative motion or floating effects that make the UI feel like a template.

### Hover and Focus

Hover states should be gentle. Message cards can slightly increase elevation, but should not noticeably jump. Controls should use a shared interaction language so buttons, tabs, and toggles all feel like they belong to the same product.

### State Presentation

Generating, connected, disconnected, hover, focus, and thinking states should all be re-expressed with a more consistent visual system. These states should remain obvious when needed, but should stay calm during normal use.

## Responsive and Theming Requirements

### Light and Dark Themes

The redesign must preserve hierarchy in both themes. Light mode should not become flat, and dark mode should not rely on uniformly heavy dark blocks. The premium-stage effect should feel equivalent across both.

### Resizing

The centered stage must continue to work across the Electron app window range already supported by the project. The design should preserve readability on narrower widths without collapsing into cramped UI or oversized whitespace.

## Accessibility

1. Contrast must remain acceptable for text, badges, controls, and secondary metadata.
2. Decorative depth must never reduce content readability.
3. Focus states must remain visible and not rely on subtle color shifts alone.
4. Hover-only affordances should still remain understandable and operable.

## Implementation Boundaries

This redesign should primarily touch:

- `src/components/chat/ChatWorkspace.tsx`
- any chat-specific style helpers needed to keep the file readable
- light supporting adjustments in surrounding shell styles only if they improve stage framing

This redesign should not require changes to:

- provider implementations
- store contracts
- IPC interfaces
- message data model

## Testing Strategy

### Visual and Interaction Verification

1. Verify that the message list reads as the primary focal region in both light and dark themes.
2. Verify that assistant bubbles feel tighter and less empty.
3. Verify that the composer feels docked to the stage rather than detached.
4. Verify that session tabs and provider status visually recede.
5. Verify that thinking expansion still behaves correctly after UI restructuring.

### Technical Verification

1. Run TypeScript type-checking.
2. Run existing tests that cover chat-related helpers where relevant.
3. Run a production build to ensure the workspace still compiles under Electron/Vite packaging.

## Rollout Approach

The safest implementation order is:

1. establish the stage/backdrop/container structure
2. restyle top tools and secondary status elements
3. retune message row spacing and bubble density
4. integrate the composer into the stage
5. polish motion and state transitions

This order keeps the redesign incremental and reduces the chance of mixing layout and behavioral changes in one step.

## Risks and Mitigations

### Risk: Over-designed visuals

If shadows, gradients, or transparency are pushed too far, the interface will feel decorative instead of mature.

Mitigation:
Keep effects restrained and prioritize hierarchy over novelty.

### Risk: Density regression

If the stage gets more premium but spacing is not tightened, the UI will look nicer but still feel wasteful.

Mitigation:
Treat bubble padding, row spacing, and stage margins as one density system.

### Risk: Tool chrome still competes with chat

If top bars and badges remain too strong, the message stage will not become the real focal point.

Mitigation:
Actively demote top chrome during implementation rather than only enhancing the center.

## Final Design Decision

Implement the chat redesign as a `Premium Stage` experience:

- polished product-grade container framing
- spotlight-stage background treatment
- center-weighted hierarchy
- stage-container visual focus
- tighter, less empty message bubbles
- calmer chrome and more integrated composer

This is the approved direction for the implementation-planning phase.
