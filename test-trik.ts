import { TrikGateway } from '@trikhub/gateway';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log('Testing demo-notes trik...\n');

  const gateway = new TrikGateway({
    triks: [
      {
        id: 'trik-demo-notes',
        path: __dirname,
      },
    ],
    secretsPath: path.join(__dirname, '.trikhub', 'secrets.json'),
  });

  await gateway.initialize();

  // Test add_note
  console.log('1. Testing add_note...');
  const addResult = await gateway.executeAction('trik-demo-notes', 'add_note', {
    title: 'Test Note',
    content: 'This is a test note content',
  });
  console.log('Result:', JSON.stringify(addResult, null, 2));

  // Test list_notes
  console.log('\n2. Testing list_notes...');
  const listResult = await gateway.executeAction('trik-demo-notes', 'list_notes', {});
  console.log('Result:', JSON.stringify(listResult, null, 2));

  // Test get_note
  console.log('\n3. Testing get_note (by title search)...');
  const getResult = await gateway.executeAction('trik-demo-notes', 'get_note', {
    titleSearch: 'Test',
  });
  console.log('Result:', JSON.stringify(getResult, null, 2));

  // Test show_config
  console.log('\n4. Testing show_config...');
  const configResult = await gateway.executeAction('trik-demo-notes', 'show_config', {});
  console.log('Result:', JSON.stringify(configResult, null, 2));

  // Test delete_note
  console.log('\n5. Testing delete_note (by title search)...');
  const deleteResult = await gateway.executeAction('trik-demo-notes', 'delete_note', {
    titleSearch: 'Test',
  });
  console.log('Result:', JSON.stringify(deleteResult, null, 2));

  // Verify deletion
  console.log('\n6. Verifying deletion (list_notes should show 0)...');
  const finalListResult = await gateway.executeAction('trik-demo-notes', 'list_notes', {});
  console.log('Result:', JSON.stringify(finalListResult, null, 2));

  console.log('\nAll tests completed!');
}

test().catch(console.error);
