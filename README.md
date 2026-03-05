# Demo Notes

A demo conversational trik that manages personal notes with persistent storage. Showcases how TrikHub's **handoff architecture** and **TDPS (Type-Directed Privilege Separation)** keep the consuming agent safe from prompt injection.

## How It Works

Demo Notes is a **conversational trik** — when a user asks to manage notes, the main agent hands off the conversation entirely. The trik has its own LLM and takes over the chat. The main agent's LLM is never exposed to trik output.

### Security Model

Every tool in this trik uses **logSchema + logTemplate** instead of returning free-form text to the consuming agent:

| Tool | What the trik's LLM sees | What the main agent sees (via logTemplate) |
|------|--------------------------|-------------------------------------------|
| `addNote` | Full note content, storage result | `Added note: created (note_abc123)` |
| `listNotes` | All note titles, IDs, content | `Listed notes: 3 found` |
| `getNote` | Full note content | `Get note: found (note_abc123)` |
| `updateNote` | Old and new content | `Update note: updated (note_abc123)` |
| `deleteNote` | Confirmation, deleted content | `Delete note: deleted (note_abc123)` |

The logSchema fields use **constrained types only** — enums (`"created"`, `"error"`, `"found"`, `"not_found"`), integers, and format-restricted strings (`"format": "id"`). No unconstrained strings ever flow back to the main agent's context, eliminating prompt injection risk.

The user sees the full conversational output directly from the trik's LLM. The main agent only sees the structured log summaries.

## Installation

```bash
trik install @molefas/trik-demo-notes
```

## Configuration

Requires an Anthropic API key (the trik runs its own LLM):

```json
// .trikhub/secrets.json
{
  "@molefas/trik-demo-notes": {
    "ANTHROPIC_API_KEY": "sk-ant-..."
  }
}
```

## Usage

Once installed, the main agent can hand off to Demo Notes:

```
User: I need to save some notes
Agent: [hands off to Demo Notes]

Demo Notes: I can help with that! What would you like to note down?
User: Add a note called "Shopping List" with "Milk, Eggs, Bread"
Demo Notes: Done! I've saved your "Shopping List" note.

User: /back
Agent: [back in control] Welcome back! The notes trik added a note.
```

## Capabilities

- **Storage**: Notes persist in `~/.trikhub/storage/@molefas/trik-demo-notes/`

## License

MIT
