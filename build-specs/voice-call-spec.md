# Voice Call Page Spec (1-on-1)

## File: `/home/user/workspace/muse-hq/client/src/pages/voice-call.tsx`

## Route
`/voice/:agentId` — 1-on-1 voice call with a specific agent

## Design
Full-screen dark call interface. Minimal UI — agent avatar center stage, waveform animations, transcript below.
Think FaceTime/Discord voice call screen but darker and more futuristic.

## Layout (top to bottom, centered)

### Call Header
- Small "Calling MUSE..." or "Connected" status text
- Duration timer (mm:ss) when connected

### Agent Avatar (center, hero element)
- Large circle (160px) with agent codename initial
- Border color = agent's color
- Pulsing ring animation when agent is speaking
- Static ring when idle
- Show agent's voice name below as small muted text (e.g. "Voice: Daniel")

### Voice State Indicator
- Shows current state with animation:
  - "Listening..." with animated mic waveform (3 bars bouncing) — when user's turn
  - "Thinking..." with pulsing dot — when processing
  - "Speaking..." with waveform emanating from avatar — when agent talks
  - Idle state when neither is talking

### Transcript Area
- Scrollable area below avatar showing conversation history
- User messages: right-aligned, blue bg
- Agent messages: left-aligned, dark card bg with agent color accent bar
- Interim (in-progress) user speech shown in italic/muted
- Auto-scrolls to bottom

### Controls Bar (bottom, fixed)
- Large circular mic button (center) — red when active, gray when muted
  - Toggles between mute/unmute
- End call button (red, left side)  
- Text input fallback button (right) — for typing instead of speaking
- Settings gear that links to /agents/:codename/settings

## Interruption Behavior
- When user starts speaking (interim speech detected):
  1. Agent audio immediately stops
  2. Speaking indicator switches to user
  3. Transcript shows "[interrupted]" note on agent's last message
  4. System enters listening mode

## Key Hook Usage
```tsx
import { useVoiceChat } from "@/hooks/use-voice-chat";

const {
  state, transcript, interimText, isSupported, micPermission,
  startCall, endCall, sendToAgent, handleInterruption, stopPlayback
} = useVoiceChat({
  autoListen: true,
  onInterruption: () => { /* visual feedback */ },
});
```

## Speech Recognition Flow
- On mount: startCall() begins listening
- When Web Speech API returns final text: call sendToAgent(agentId, text)
- sendToAgent posts to /api/voice/chat, gets response + audio
- Audio plays automatically, then resumes listening
- User speaking during playback triggers handleInterruption()

## Important: Web Speech API Recognition
The hook's startRecognition returns final text via the onresult callback. 
We need to wire this up in the page component:
- Create a SpeechRecognition instance
- On final result → call sendToAgent
- On interim result → show in UI + check for interruption

## Fallback
- If Web Speech API not supported: show text input field prominently
- If mic permission denied: show "Enable microphone" prompt

## API calls
- GET /api/voice/profiles/:agentId (agent voice info)
- GET /api/agents/:codename (agent details)
- POST /api/voice/chat (send message, get audio response)
