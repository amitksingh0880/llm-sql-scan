import { Scanner } from './src/analyzer/scanner';
import 'dotenv/config';

// Disable headers timeout for LLM calls (undici/fetch)
process.env.UNDICI_HEADERS_TIMEOUT = '0';

async function run() {
    const connectionString = process.env.DB_CONNECTION;
    if (!connectionString) {
        console.error('No DB_CONNECTION in .env');
        process.exit(1);
    }
    const scanner = new Scanner(connectionString);
    console.log('Starting standalone scan...');
    await scanner.scan();
    console.log('Scan finished.');
}

run();
