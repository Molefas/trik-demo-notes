// Generate a simple ID
function generateId() {
    return `note_${Date.now().toString(36)}`;
}
// Main graph object with invoke method (required by TrikGateway)
export default {
    async invoke(input) {
        const { action, input: actionInput, storage } = input;
        switch (action) {
            case 'add_note':
                return addNote(actionInput, storage);
            case 'list_notes':
                return listNotes(storage);
            case 'get_note':
                return getNote(actionInput, storage);
            case 'update_note':
                return updateNote(actionInput, storage);
            case 'delete_note':
                return deleteNote(actionInput, storage);
            default:
                return { agentData: { template: 'error', message: `Unknown action: ${action}` } };
        }
    },
};
async function addNote(input, storage) {
    const noteId = generateId();
    const note = {
        id: noteId,
        title: input.title,
        content: input.content,
        createdAt: new Date().toISOString(),
    };
    // Store the note
    await storage.set(`notes:${noteId}`, note);
    // Update the index
    const indexRaw = await storage.get('notes:index');
    const index = indexRaw ?? [];
    index.push(noteId);
    await storage.set('notes:index', index);
    return {
        agentData: {
            template: 'note_added',
            noteId,
            title: input.title,
        },
    };
}
async function listNotes(storage) {
    const indexRaw = await storage.get('notes:index');
    const index = indexRaw ?? [];
    if (index.length === 0) {
        return {
            agentData: {
                template: 'no_notes',
                count: 0,
            },
        };
    }
    // Fetch titles for each note
    const titles = [];
    for (const noteId of index) {
        const note = (await storage.get(`notes:${noteId}`));
        if (note) {
            titles.push(note.title);
        }
    }
    return {
        agentData: {
            template: 'notes_list',
            count: index.length,
            noteIds: index,
            titles,
        },
    };
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
async function getNote(input, storage) {
    let note = null;
    if (input.noteId) {
        note = (await storage.get(`notes:${input.noteId}`));
    }
    else if (input.titleSearch) {
        note = await findNoteByTitle(input.titleSearch, storage);
    }
    if (!note) {
        return {
            responseMode: 'template',
            agentData: {
                template: 'note_not_found',
            },
        };
    }
    // Return full note content via passthrough
    return {
        responseMode: 'passthrough',
        userContent: {
            contentType: 'note',
            content: `# ${note.title}\n\n${note.content}\n\n---\nCreated: ${note.createdAt}\nID: ${note.id}`,
            metadata: { noteId: note.id, title: note.title },
        },
    };
}
async function updateNote(input, storage) {
    let noteToUpdate = null;
    let noteId;
    if (input.noteId) {
        noteId = input.noteId;
        noteToUpdate = (await storage.get(`notes:${noteId}`));
    }
    else if (input.titleSearch) {
        noteToUpdate = await findNoteByTitle(input.titleSearch, storage);
        noteId = noteToUpdate?.id;
    }
    if (!noteToUpdate || !noteId) {
        return {
            agentData: {
                template: 'note_not_found',
            },
        };
    }
    // Check if any changes were provided
    if (!input.newTitle && !input.newContent) {
        return {
            agentData: {
                template: 'no_changes',
            },
        };
    }
    // Update the note
    const updatedNote = {
        ...noteToUpdate,
        title: input.newTitle ?? noteToUpdate.title,
        content: input.newContent ?? noteToUpdate.content,
    };
    await storage.set(`notes:${noteId}`, updatedNote);
    return {
        agentData: {
            template: 'note_updated',
            noteId,
            title: updatedNote.title,
        },
    };
}
async function deleteNote(input, storage) {
    let noteToDelete = null;
    let noteId;
    if (input.noteId) {
        noteId = input.noteId;
        noteToDelete = (await storage.get(`notes:${noteId}`));
    }
    else if (input.titleSearch) {
        noteToDelete = await findNoteByTitle(input.titleSearch, storage);
        noteId = noteToDelete?.id;
    }
    if (!noteToDelete || !noteId) {
        return {
            agentData: {
                template: 'note_not_found',
            },
        };
    }
    // Delete the note
    await storage.delete(`notes:${noteId}`);
    // Update the index
    const indexRaw = await storage.get('notes:index');
    const index = indexRaw ?? [];
    const newIndex = index.filter((id) => id !== noteId);
    await storage.set('notes:index', newIndex);
    return {
        agentData: {
            template: 'note_deleted',
            noteId,
            title: noteToDelete.title,
        },
    };
}
