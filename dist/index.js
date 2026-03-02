/**
 * Demo Notes — conversational trik.
 *
 * A personal notes assistant that manages notes with persistent storage.
 * Uses the wrapAgent() pattern for multi-turn conversation via handoff.
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { wrapAgent, transferBackTool } from '@trikhub/sdk';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(join(__dirname, '../src/prompts/system.md'), 'utf-8');
function generateId() {
    return `note_${Date.now().toString(36)}`;
}
async function findNoteByTitle(titleSearch, storage) {
    const indexRaw = await storage.get('notes:index');
    const index = indexRaw ?? [];
    const searchLower = titleSearch.toLowerCase();
    for (const noteId of index) {
        const note = (await storage.get(`notes:${noteId}`));
        if (note && note.title.toLowerCase().includes(searchLower)) {
            return note;
        }
    }
    return null;
}
async function resolveNote(input, storage) {
    if (input.noteId) {
        return (await storage.get(`notes:${input.noteId}`));
    }
    if (input.titleSearch) {
        return findNoteByTitle(input.titleSearch, storage);
    }
    return null;
}
// ============================================================================
// LangChain tool builders (closed over storage from context)
// ============================================================================
function buildTools(storage) {
    const addNote = tool(async (input) => {
        const noteId = generateId();
        const note = {
            id: noteId,
            title: input.title,
            content: input.content,
            createdAt: new Date().toISOString(),
        };
        await storage.set(`notes:${noteId}`, note);
        const indexRaw = await storage.get('notes:index');
        const index = indexRaw ?? [];
        index.push(noteId);
        await storage.set('notes:index', index);
        return JSON.stringify({ status: 'created', noteId, title: input.title });
    }, {
        name: 'addNote',
        description: 'Add a new note to persistent storage',
        schema: z.object({
            title: z.string().describe('Note title'),
            content: z.string().describe('Note content'),
        }),
    });
    const listNotes = tool(async () => {
        const indexRaw = await storage.get('notes:index');
        const index = indexRaw ?? [];
        if (index.length === 0) {
            return JSON.stringify({ count: 0, notes: [] });
        }
        const notes = [];
        for (const noteId of index) {
            const note = (await storage.get(`notes:${noteId}`));
            if (note) {
                notes.push({ id: note.id, title: note.title });
            }
        }
        return JSON.stringify({ count: notes.length, notes });
    }, {
        name: 'listNotes',
        description: 'List all stored notes with their titles and IDs',
        schema: z.object({}),
    });
    const getNote = tool(async (input) => {
        const note = await resolveNote(input, storage);
        if (!note) {
            return JSON.stringify({ status: 'not_found' });
        }
        return JSON.stringify({
            status: 'found',
            noteId: note.id,
            title: note.title,
            content: note.content,
            createdAt: note.createdAt,
        });
    }, {
        name: 'getNote',
        description: 'Get a note by ID or title search',
        schema: z.object({
            noteId: z.string().optional().describe('The note ID to retrieve'),
            titleSearch: z.string().optional().describe('Search for a note by title (partial match)'),
        }),
    });
    const updateNote = tool(async (input) => {
        const note = await resolveNote(input, storage);
        if (!note) {
            return JSON.stringify({ status: 'not_found' });
        }
        if (!input.newTitle && !input.newContent) {
            return JSON.stringify({ status: 'no_changes' });
        }
        const updated = {
            ...note,
            title: input.newTitle ?? note.title,
            content: input.newContent ?? note.content,
        };
        await storage.set(`notes:${note.id}`, updated);
        return JSON.stringify({ status: 'updated', noteId: note.id, title: updated.title });
    }, {
        name: 'updateNote',
        description: 'Update an existing note\'s title and/or content',
        schema: z.object({
            noteId: z.string().optional().describe('The note ID to update'),
            titleSearch: z.string().optional().describe('Search for a note by title (partial match)'),
            newTitle: z.string().optional().describe('New title for the note'),
            newContent: z.string().optional().describe('New content for the note'),
        }),
    });
    const deleteNote = tool(async (input) => {
        const note = await resolveNote(input, storage);
        if (!note) {
            return JSON.stringify({ status: 'not_found' });
        }
        await storage.delete(`notes:${note.id}`);
        const indexRaw = await storage.get('notes:index');
        const index = indexRaw ?? [];
        await storage.set('notes:index', index.filter((id) => id !== note.id));
        return JSON.stringify({ status: 'deleted', noteId: note.id, title: note.title });
    }, {
        name: 'deleteNote',
        description: 'Delete a note by ID or title search',
        schema: z.object({
            noteId: z.string().optional().describe('The note ID to delete'),
            titleSearch: z.string().optional().describe('Search for a note by title (partial match)'),
        }),
    });
    return [addNote, listNotes, getNote, updateNote, deleteNote];
}
// ============================================================================
// Agent entry point
// ============================================================================
export default wrapAgent((context) => {
    const model = new ChatAnthropic({
        modelName: 'claude-sonnet-4-20250514',
        anthropicApiKey: context.config.get('ANTHROPIC_API_KEY'),
    });
    const tools = [
        ...buildTools(context.storage),
        transferBackTool,
    ];
    return createReactAgent({
        llm: model,
        tools,
        messageModifier: systemPrompt,
    });
});
