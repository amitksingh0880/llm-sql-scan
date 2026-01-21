import sql from 'mssql/msnodesqlv8';

export interface ColumnInfo {
    name: string;
    type: string;
    isNullable: boolean;
    maxLength?: number;
}

export interface TableSchema {
    tableName: string;
    columns: ColumnInfo[];
}

export class DBConnector {
    private pool: sql.ConnectionPool | null = null;

    constructor(private connectionString: string) { }

    async connect() {
        try {
            console.log('Connecting to MSSQL database using native driver...');

            // Simple parsing to support msnodesqlv8 config structure
            const serverMatch = this.connectionString.match(/Server=([^;]+)/i);
            const dbMatch = this.connectionString.match(/Database=([^;]+)/i);

            if (!serverMatch || !dbMatch) {
                // Fallback to string if regex fails, though msnodesqlv8 prefers object for some setups
                this.pool = await sql.connect(this.connectionString);
            } else {
                const config = {
                    server: serverMatch[1].replace(/\\\\/g, '\\'), // Ensure single backslash if double present
                    database: dbMatch[1],
                    options: {
                        trustedConnection: true,
                        trustServerCertificate: true
                    },
                    driver: 'msnodesqlv8'
                };
                this.pool = await sql.connect(config as any);
            }
            console.log('Connected to MSSQL database.');
        } catch (err) {
            console.error('Failed to connect to MSSQL:', err);
            throw err;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.close();
        }
    }

    async getSupportSchema(): Promise<TableSchema[]> {
        if (!this.pool) throw new Error('Not connected to database');
        // ... (Existing implementation for tables, improved to be robust)
        const result = await this.pool.request().query`
            SELECT 
                t.TABLE_NAME,
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.CHARACTER_MAXIMUM_LENGTH
            FROM 
                INFORMATION_SCHEMA.TABLES t
            JOIN 
                INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
            WHERE 
                t.TABLE_TYPE = 'BASE TABLE'
            ORDER BY 
                t.TABLE_NAME, c.ORDINAL_POSITION
        `;

        const tables: Map<string, TableSchema> = new Map();
        for (const row of result.recordset) {
            if (!tables.has(row.TABLE_NAME)) {
                tables.set(row.TABLE_NAME, { tableName: row.TABLE_NAME, columns: [] });
            }
            tables.get(row.TABLE_NAME)?.columns.push({
                name: row.COLUMN_NAME,
                type: row.DATA_TYPE,
                isNullable: row.IS_NULLABLE === 'YES',
                maxLength: row.CHARACTER_MAXIMUM_LENGTH
            });
        }
        return Array.from(tables.values());
    }

    async getStoredProcedures(): Promise<{ name: string; definition: string }[]> {
        if (!this.pool) throw new Error('Not connected');
        const result = await this.pool.request().query`
            SELECT name, OBJECT_DEFINITION(object_id) AS definition
            FROM sys.procedures
            WHERE is_ms_shipped = 0
        `;
        return result.recordset;
    }

    async getViews(): Promise<{ name: string; definition: string }[]> {
        if (!this.pool) throw new Error('Not connected');
        const result = await this.pool.request().query`
            SELECT name, OBJECT_DEFINITION(object_id) AS definition
            FROM sys.views
            WHERE is_ms_shipped = 0
        `;
        return result.recordset;
    }

    async getTriggers(): Promise<{ name: string; definition: string }[]> {
        if (!this.pool) throw new Error('Not connected');
        const result = await this.pool.request().query`
            SELECT name, OBJECT_DEFINITION(object_id) AS definition
            FROM sys.triggers
            WHERE is_ms_shipped = 0
        `;
        return result.recordset;
    }

    async getIndexes(): Promise<{ tableName: string; indexName: string; type: string; columns: string }[]> {
        if (!this.pool) throw new Error('Not connected');
        const result = await this.pool.request().query`
            SELECT 
                t.name AS tableName,
                i.name AS indexName,
                i.type_desc AS type,
                STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
            FROM sys.indexes i
            JOIN sys.tables t ON i.object_id = t.object_id
            JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            WHERE t.is_ms_shipped = 0
            GROUP BY t.name, i.name, i.type_desc
            ORDER BY t.name, i.name
        `;
        return result.recordset;
    }
}
