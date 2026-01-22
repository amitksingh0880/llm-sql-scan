import { DBConnector, TableSchema } from '../db/connector';
import { LLMEngine } from '../llm/engine';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class Scanner {
    private db: DBConnector;
    private llm: LLMEngine;

    constructor(connectionString: string, model: string = 'tinyllama') {
        this.db = new DBConnector(connectionString);
        this.llm = new LLMEngine(model);
    }

    private formatSchema(tables: TableSchema[]): string {
        return tables.map(t => {
            const columns = t.columns.map(c =>
                `- ${c.name} (${c.type}${c.maxLength ? `(${c.maxLength})` : ''}) ${c.isNullable ? 'NULL' : 'NOT NULL'}`
            ).join('\n');
            return `Table: ${t.tableName}\n${columns}`;
        }).join('\n\n');
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
        let fileContent = `# ${name}\n\n`;
        if (content) {
            fileContent += `## Definition\n\`\`\`sql\n${content}\n\`\`\`\n\n`;
        }
        if (analysis) {
            fileContent += `## Analysis\n${analysis}`;
        }
        fs.writeFileSync(filePath, fileContent);
    }

    async scan() {
        try {
            console.log(chalk.blue('Connecting to database...'));
            await this.db.connect();

            const scanDir = this.createScanDirs();
            console.log(chalk.green(`\nScan results will be saved to: ${scanDir}`));

            // 1. Tables
            console.log(chalk.cyan('\nScanning Tables...'));
            const tables = await this.db.getSupportSchema();
            if (tables.length > 0) {
                const schemaSummary = this.formatSchema(tables);
                // Analyze specific tables later if needed, for now global schema analysis
                // But user wants "each scan in folder", implying per-object?
                // For tables, usually schema is analyzed as a whole context.
                // Let's do per-table file just for structure, or one big schema file.
                // The user asked for "different folders for sps, tables...".

                // Let's save individual table schema + aggregated analysis?
                // actually, analyzing table by table is less useful for relational context.
                // But let's verify what the user asked: "put each scan in the folder"

                // I will save each table definition + an overall analysis in the tables folder.
                const globalAnalysis = await this.llm.analyzeSchema(schemaSummary);
                fs.writeFileSync(path.join(scanDir, 'tables', '00_Overview_Analysis.md'), globalAnalysis);

                for (const t of tables) {
                    const tDef = `Table: ${t.tableName}\n` + t.columns.map(c => `- ${c.name} ${c.type}`).join('\n');
                    this.saveReport(scanDir, 'tables', t.tableName, tDef, undefined); // Just def for now
                }
            } else {
                console.log('No tables found.');
            }

            // Helper for code objects
            const processCodeObjects = async (
                getter: () => Promise<{ name: string, definition: string }[]>,
                typeDir: string,
                typeLabel: string
            ) => {
                console.log(chalk.cyan(`\nScanning ${typeLabel}...`));
                const objects = await getter();
                console.log(`Found ${objects.length} ${typeLabel}.`);

                for (const obj of objects) {
                    process.stdout.write(`Analyzing ${obj.name}... `);
                    if (!obj.definition) {
                        console.log('Skipped (No definition)');
                        continue;
                    }
                    const analysis = await this.llm.analyzeCode(typeLabel, obj.name, obj.definition);
                    this.saveReport(scanDir, typeDir, obj.name, obj.definition, analysis);
                    console.log('Done.');
                }
            };

            await processCodeObjects(() => this.db.getStoredProcedures(), 'sps', 'Stored Procedure');
            await processCodeObjects(() => this.db.getViews(), 'views', 'View');
            await processCodeObjects(() => this.db.getTriggers(), 'triggers', 'Trigger');

            // Indexes
            console.log(chalk.cyan('\nScanning Indexes...'));
            const indexes = await this.db.getIndexes();
            const indexReport = indexes.map(i =>
                `- Table: ${i.tableName}, Index: ${i.indexName}, Type: ${i.type}, Columns: ${i.columns}`
            ).join('\n');
            const indexAnalysis = await this.llm.analyzeCode('Indexes', 'All Indexes', indexReport); // Reuse analyzeCode roughly
            this.saveReport(scanDir, 'indexes', 'All_Indexes', indexReport, indexAnalysis);

            console.log(chalk.green.bold(`\nScan Complete! Check ${scanDir} for reports.`));

        } catch (error) {
            console.error(chalk.red('Error during scan:'), error);
        } finally {
            await this.db.close();
        }
    }
}
