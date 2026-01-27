import { Ollama } from 'ollama';

export class LLMEngine {
    private ollama: Ollama;
    private model: string;

    constructor(model: string = 'tinyllama') {
        this.ollama = new Ollama();
        this.model = model;
    }

    async analyzeSchema(schemaSummary: string): Promise<string> {
        const systemPrompt = `You are an elite SQL Security Architect.
Analyze the provided database schema for architectural flaws, security risks, and optimization opportunities.

RULE: Your output MUST be strictly valid Markdown.
RULE: Use ### [Title] for each finding.
RULE: Use SQL code blocks for any code suggestions.
RULE: If no issues exist, respond ONLY with "No critical security issues identified in schema."

TEMPLATE for each finding:
### [Issue Name]
- **Vector**: [The technical vulnerability]
- **Impact**: High/Medium/Low
- **Resolution**: 
\`\`\`sql
[Optimized/Secure SQL code]
\`\`\``;

        const userPrompt = `DATABASE SCHEMA SUMMARY:
${schemaSummary}`;

        return this.query(systemPrompt, userPrompt);
    }

    async analyzeCode(objectType: string, objectName: string, code: string): Promise<string> {
        const systemPrompt = `You are a Senior Security Auditor specializing in MSSQL.
Analyze the following ${objectType} for vulnerabilities (SQLi, Logic flaws, Permission issues).

RULE: Be concise. Avoid conversational filler.
RULE: Wrap ALL SQL in triple backticks with 'sql' language specifier.
RULE: If clean, respond ONLY with "Security audit passed for ${objectName}."

TEMPLATE:
### [Severity] - [Vulnerability Name]
- **Details**: [Precise explanation]
- **Fixed Implementation**: 
\`\`\`sql
[Refactored secure code]
\`\`\``;

        const userPrompt = `AUDIT TARGET: ${objectType} [${objectName}]
CODE:
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
