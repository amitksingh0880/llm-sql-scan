import { Ollama } from 'ollama';

async function downloadModel() {
    const model = 'tinyllama';
    console.log(`Downloading ${model}... This may take a while.`);
    const ollama = new Ollama();

    try {
        const progress = await ollama.pull({ model: model, stream: true });
        for await (const part of progress) {
            if (part.digest) {
                process.stdout.write(`\rStatus: ${part.status} ${Math.round((part.completed || 0) / (part.total || 1) * 100)}%`);
            } else {
                process.stdout.write(`\rStatus: ${part.status}`);
            }
        }
        console.log('\n✅ Download complete!');
    } catch (error) {
        console.error('\n❌ Failed to download model:', error);
    }
}

downloadModel();
