#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { Scanner } from './analyzer/scanner';
import chalk from 'chalk';

const program = new Command();

program
    .name('sql-scan')
    .description('LLM-based SQL Vulnerability Scanner')
    .version('1.0.0');

program
    .command('analyze')
    .description('Analyze a database for vulnerabilities')
    .option('-c, --connection <string>', 'Connection string (MSSQL format)', process.env.DB_CONNECTION)
    .option('-m, --model <string>', 'Ollama model to use', 'tinyllama')
    .action(async (options) => {
        const { connection, model } = options;
        if (!connection) {
            console.error(chalk.red('Error: Connection string is required. Provide it via -c or DB_CONNECTION in .env'));
            process.exit(1);
        }
        console.log(chalk.cyan(`Starting scan using model: ${model}`));

        const scanner = new Scanner(connection, model);
        await scanner.scan();
    });

program.parse(process.argv);
