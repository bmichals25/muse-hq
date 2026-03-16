# Agent Settings Page Spec

## File: `/home/user/workspace/muse-hq/client/src/pages/agent-settings.tsx`

## Design
Dark themed, MUSE HQ style. Uses existing Tailwind + shadcn/ui setup. 
Colors: bg-background (#0A0E1A), cards bg-card, accent colors per agent.

## Route
`/agents/:codename/settings` — accessed from agent panel gear icon

## Layout
Full-width page with sections stacked vertically. Back arrow to agent panel.

### Section 1: Identity
- Agent avatar: large circle (96px) with agent initial/codename, or custom image if `avatarUrl` set
- Upload avatar button (just stores a URL for now — text input)
- Name field (editable text input, default: agent.name)
- Codename field (editable, uppercase)
- Department field (editable)
- Color picker (hex input + visual swatch)

### Section 2: Personality & Behavior
- System Prompt: large textarea (min 4 rows, monospace font)
- Pre-populated with agent's current systemPrompt
- Helper text: "This defines how the agent thinks, speaks, and behaves"
- Role description: editable text input

### Section 3: Voice Configuration
- Voice picker: grid of voice cards (from AVAILABLE_VOICES in schema)
- Each card shows: voice name, gender icon, style description
- Currently selected voice highlighted with agent color border
- Audio preview button on each card (just visual — shows "Preview" button)
- Pitch indicator: low/mid/high radio buttons
- Voice personality description: text input

### Save Button
- Fixed bottom bar with "Save Changes" button
- Uses PATCH /api/agents/:id/settings
- Invalidates agent queries on save
- Shows toast on success

## API calls
- GET /api/agents/:codename (load current data + voice profile)
- GET /api/voice/profiles/:agentId (load voice config)  
- PATCH /api/agents/:id/settings (save all changes)

## Imports
```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams, Link } from "wouter";
import { AVAILABLE_VOICES } from "@shared/schema";
import { ArrowLeft, Save, Volume2, User, Mic, Brain, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
```

## Key behaviors
- Form state managed with useState, pre-populated from API data
- Unsaved changes indicator
- Save invalidates ["/api/agents", codename] and ["/api/voice/profiles"]
- Toast confirmation on save
- The voice grid cards should be visually rich — show the voice name large, gender as a small badge, style as muted subtitle
