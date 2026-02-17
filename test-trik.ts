import { TrikGateway, FileConfigStore } from '@trikhub/gateway';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function test() {
  console.log('Testing demo-notes trik...\n');

  // Create config store that reads from .trikhub/secrets.json
  const configStore = new FileConfigStore({
    localSecretsPath: join(__dirname, '.trikhub', 'secrets.json'),
  });
  await configStore.load();

  // Create gateway with config store
  const gateway = new TrikGateway({ configStore });

  // Load trik from current directory
  await gateway.loadTrik(__dirname);
  console.log('Trik loaded!\n');

  // Test add_note
  console.log('1. Testing add_note...');
  const addResult = await gateway.execute('trik-demo-notes', 'add_note', {
    title: 'Test Note',
    content: 'This is a test note content',
  });
  console.log('Result:', JSON.stringify(addResult, null, 2));

  // Test list_notes
  console.log('\n2. Testing list_notes...');
  const listResult = await gateway.execute('trik-demo-notes', 'list_notes', {});
  console.log('Result:', JSON.stringify(listResult, null, 2));

  // Test get_note (passthrough mode)
  console.log('\n3. Testing get_note (by title search)...');
  const getResult = await gateway.execute('trik-demo-notes', 'get_note', {
    titleSearch: 'Test',
  });
  console.log('Result:', JSON.stringify(getResult, null, 2));

  // If passthrough, deliver content
  if (getResult.success && getResult.responseMode === 'passthrough') {
    const ref = (getResult as { userContentRef: string }).userContentRef;
    const content = gateway.deliverContent(ref);
    console.log('\n--- NOTE CONTENT ---');
    console.log(content);
    console.log('--- END ---');
  }

  // Test show_config
  console.log('\n4. Testing show_config...');
  const configResult = await gateway.execute('trik-demo-notes', 'show_config', {});
  console.log('Result:', JSON.stringify(configResult, null, 2));

  // Test delete_note
  console.log('\n5. Testing delete_note (by title search)...');
  const deleteResult = await gateway.execute('trik-demo-notes', 'delete_note', {
    titleSearch: 'Test',
  });
  console.log('Result:', JSON.stringify(deleteResult, null, 2));

  // Verify deletion
  console.log('\n6. Verifying deletion (list_notes should show 0)...');
  const finalListResult = await gateway.execute('trik-demo-notes', 'list_notes', {});
  console.log('Result:', JSON.stringify(finalListResult, null, 2));

  console.log('\nAll tests completed!');
}

test().catch(console.error);
