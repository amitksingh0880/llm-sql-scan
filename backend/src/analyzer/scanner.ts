import { DBConnector, TableSchema } from '../db/connector';
import { LLMEngine } from '../llm/engine';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
const sleep = promisify(setTimeout);

export class Scanner {
    private db: DBConnector;
    private llm: LLMEngine;

    constructor(connectionString: string, model: string = 'tinyllama') {
        this.db = new DBConnector(connectionString);
        this.llm = new LLMEngine(model);
    }

    private log(message: string, baseDir?: string) {
        const msg = `[${new Date().toISOString()}] ${message}`;
        console.log(message);
        if (baseDir) {
            fs.appendFileSync(path.join(baseDir, 'scan_log.txt'), msg + '\n');
        }
    }

    private formatSchema(tables: TableSchema[]): string {
        return tables.map(t => {
            const columns = t.columns.map(c =>
                `- ${c.name.padEnd(20)} | ${c.type.padEnd(15)} | ${c.isNullable ? 'NULL' : 'NOT NULL'}${c.maxLength ? ` | Max: ${c.maxLength}` : ''}`
            ).join('\n');
            return `### TABLE: ${t.tableName}\nColumns:\n${columns}`;
        }).join('\n\n---\n\n');
    }

    private createScanDirs(): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseDir = path.join(process.cwd(), 'scans', timestamp);

        ['tables', 'sps', 'views', 'triggers', 'indexes'].forEach(dir => {
            fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
        });

        return baseDir;
    }

    private saveReport(baseDir: string, subDir: string, name: string, content: string, analysis?: string) {
        const filePath = path.join(baseDir, subDir, `${name}.md`);
        let fileContent = `# ${name.toUpperCase()} ANALYSIS\n\n`;

        if (content) {
            fileContent += `## SCHEMA DEFINITION\n\`\`\`sql\n${content}\n\`\`\`\n\n`;
        }

        if (analysis) {
            fileContent += `## SECURITY ANALYSIS\n${analysis}`;
        }

        fs.writeFileSync(filePath, fileContent);
    }

    async scan() {
        const scanDir = this.createScanDirs();
        this.log(`Scan started. Results in: ${scanDir}`, scanDir);

        try {
            this.log('Connecting to database...', scanDir);
            await this.db.connect();

            // 1. Tables
            this.log('Scanning Tables...', scanDir);
            const tables = await this.db.getSupportSchema();
            if (tables.length > 0) {
                const schemaSummary = this.formatSchema(tables);
                this.log(`Analyzing global schema (${tables.length} tables)...`, scanDir);
                const globalAnalysis = await this.llm.analyzeSchema(schemaSummary);
                fs.writeFileSync(path.join(scanDir, 'tables', '00_Overview_Analysis.md'), globalAnalysis);

                for (const t of tables) {
                    const tDef = `CREATE TABLE ${t.tableName} (\n` +
                        t.columns.map(c => `  ${c.name} ${c.type}${c.maxLength ? `(${c.maxLength})` : ''} ${c.isNullable ? 'NULL' : 'NOT NULL'}`).join(',\n') +
                        '\n);';

                    this.log(`Analyzing table: ${t.tableName}`, scanDir);
                    const tAnalysis = await this.llm.analyzeCode('Table Schema', t.tableName, tDef);
                    this.log(`Received analysis for ${t.tableName} (${tAnalysis?.length || 0} bytes)`, scanDir);
                    this.saveReport(scanDir, 'tables', t.tableName, tDef, tAnalysis);
                    await sleep(500);
                }
            } else {
                this.log('No tables found.', scanDir);
            }

            // Helper for code objects
            const processCodeObjects = async (
                getter: () => Promise<{ name: string, definition: string }[]>,
                typeDir: string,
                typeLabel: string
            ) => {
                this.log(`Scanning ${typeLabel}...`, scanDir);
                const objects = await getter();
                this.log(`Found ${objects.length} ${typeLabel}.`, scanDir);

                for (const obj of objects) {
                    if (!obj.definition) continue;
                    this.log(`Analyzing ${typeLabel}: ${obj.name}`, scanDir);
                    const analysis = await this.llm.analyzeCode(typeLabel, obj.name, obj.definition);
                    this.log(`Received analysis for ${obj.name} (${analysis?.length || 0} bytes)`, scanDir);
                    this.saveReport(scanDir, typeDir, obj.name, obj.definition, analysis);
                    await sleep(500);
                }
            };

            await processCodeObjects(() => this.db.getStoredProcedures(), 'sps', 'Stored Procedure');
            await processCodeObjects(() => this.db.getViews(), 'views', 'View');
            await processCodeObjects(() => this.db.getTriggers(), 'triggers', 'Trigger');

            // Indexes
            this.log('Scanning Indexes...', scanDir);
            const indexes = await this.db.getIndexes();
            const indexReport = indexes.map(i =>
                `- Table: ${i.tableName}, Index: ${i.indexName}, Type: ${i.type}, Columns: ${i.columns}`
            ).join('\n');
            const indexAnalysis = await this.llm.analyzeCode('Indexes', 'All Indexes', indexReport);
            this.saveReport(scanDir, 'indexes', 'All_Indexes', indexReport, indexAnalysis);

            this.log('Scan Complete!', scanDir);

        } catch (error) {
            this.log(`Error during scan: ${error}`, scanDir);
        } finally {
            await this.db.close();
        }
    }
}
