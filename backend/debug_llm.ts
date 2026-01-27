import { LLMEngine } from './src/llm/engine';

async function debug() {
    const llm = new LLMEngine('tinyllama');
    console.log('Testing LLM Engine...');

    const tableDef = `
    CREATE TABLE User (
        UserId INT PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL,
        Password NVARCHAR(50) NOT NULL, -- Plaintext!
        Email NVARCHAR(100)
    );
    `;

    console.log('--- Querying LLM ---');
    const analysis = await llm.analyzeCode('Table', 'User', tableDef);
    console.log('Analysis Result:');
    console.log(analysis);
    console.log('--- End of Result ---');
}

debug();
