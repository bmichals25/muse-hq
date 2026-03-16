# Group Voice Call Page Spec (Roundtable)

## File: `/home/user/workspace/muse-hq/client/src/pages/group-call.tsx`

## Route
`/voice/group` or `/voice/group?agents=a-1,a-2,a-3` — roundtable with selected agents

## Design
Full-screen dark interface. Multiple agent avatars arranged in a circle/grid. 
Think Discord stage channel meets a virtual boardroom.

## Layout

### Header
- "Roundtable" title with agent count
- Duration timer
- "Raise Hand" mode indicator

### Agent Circle/Grid (center)
- Agents arranged in a circle (for 3-6 agents) or 2-row grid (for 7-8)
- Each agent: avatar circle (80px) with codename, color ring
- Active speaker: larger ring + pulsing animation + glow
- Muted agents: dimmed opacity
- User's position: "You" circle in the arrangement
- Below each avatar: codename + current voice name in tiny text

### Current Speaker Panel
- When an agent is speaking: their name appears prominently
- Transcript of what they're saying appears in real-time
- Their avatar in the circle gets a speaking animation

### Mode Indicator
- Two modes:
  1. **Roundtable** (default): agents take turns responding in sequence
  2. **Raise Hand**: user clicks "Raise Hand" button to take the floor
     - When raised: all agent audio pauses, user can speak
     - When lowered: agents resume their discussion

### Transcript Area (bottom section, collapsible)
- Full conversation transcript with color-coded speakers
- Each entry: [AGENT COLOR DOT] CODENAME: message text
- User entries: highlighted differently
- Can expand/collapse this panel

### Controls Bar (bottom)
- Mic toggle (same as 1-on-1)
- "Raise Hand" button — toggles hand-raised state
  - Visual: hand icon, pulses when active, shows "You have the floor" text
- End call button
- Agent selector: can add/remove agents mid-call
- Text input fallback

## Agent Selection (before call starts or via panel)
- If no agents specified in URL: show agent picker grid
- Checkboxes on each agent avatar
- "Start Roundtable" button when 2+ selected
- Quick presets: "All Agents", "Resumaid Team", "Leadership" (MUSE + SENTINEL + VAULT)

## Roundtable Behavior
1. User speaks → text sent to ALL selected agents via POST /api/voice/group-chat
2. Response comes back as array of agent responses
3. Agents speak one at a time, in order
4. Between speakers: brief pause (300ms)
5. User can interrupt any speaker → stops current, skips remaining queue
6. After all agents speak → back to listening

## Raise Hand Mode
- User clicks "Raise Hand"
- If agent was speaking → audio stops immediately (interruption)
- UI shows "You have the floor"
- User speaks freely
- User clicks "Lower Hand" or stops speaking
- Their message is sent to all agents
- Roundtable resumes

## API calls
- GET /api/voice/profiles (all profiles)
- GET /api/agents (all agents for selection)
- POST /api/voice/group-chat { agentIds, userMessage }
