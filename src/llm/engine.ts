import { Ollama } from 'ollama';

export class LLMEngine {
    private ollama: Ollama;
    private model: string;

    constructor(model: string = 'tinyllama') {
        this.ollama = new Ollama();
        this.model = model;
    }

    async analyzeSchema(schemaSummary: string): Promise<string> {
        const systemPrompt = `You are a SQL Security Expert. Find security flaws.
Output ONLY a Markdown table with columns: ISSUE, TABLE, IMPACT, FIX.
Do not use conversational filler.`;

        const userPrompt = `Analyze this schema:
${schemaSummary}`;

        return this.query(systemPrompt, userPrompt);
    }

    async analyzeCode(objectType: string, objectName: string, code: string): Promise<string> {
        const systemPrompt = `You are a SQL Expert. Review code for SQL Injection and Performance.
Output ONLY a Markdown table with columns: VULNERABILITY, LINE, REFACTOR.`;

        const userPrompt = `Analyze ${objectType} "${objectName}":
\`\`\`sql
${code}
\`\`\``;

        return this.query(systemPrompt, userPrompt);
    }

    private async query(system: string, user: string): Promise<string> {
        // TinyLlama often works better if instructions are in the user prompt for some fine-tunes,
        // but let's try strict System/User separation which Ollama usually handles well.
        const response = await this.ollama.chat({
            model: this.model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ],
            options: {
                temperature: 0.1, // Lower temperature for more deterministic/precise output
            }
        });
        return response.message.content;
    }

    async suggestFix(vulnerabilityDescription: string): Promise<string> {
        const prompt = `
Provide a SQL query or command to fix the following vulnerability:
${vulnerabilityDescription}

Output ONLY the SQL code or a brief explanation if code isn't applicable.
`;
        const response = await this.ollama.chat({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
        });

        return response.message.content;
    }
}
