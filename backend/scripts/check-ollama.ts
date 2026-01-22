
import { Ollama } from 'ollama';

async function check() {
    console.log('Checking Ollama API connection...');
    try {
        const ollama = new Ollama();
        const models = await ollama.list();
        console.log('✅ Ollama is reachable!');
        console.log('Available models:');
        models.models.forEach(m => console.log(` - ${m.name}`));
    } catch (error: any) {
        console.log('❌ Could not connect to Ollama:', error.message);
        if (error.cause) console.log('Cause:', error.cause);
    }
}

check();
