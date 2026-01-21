
import sql from 'mssql';
import 'dotenv/config';

async function test() {
    console.log('Testing connection configurations...');

    const configs = [
        // 1. Original from env
        process.env.DB_CONNECTION,
        // 2. Breakdown manual
        {
            server: 'HP15S',
            authentication: {
                type: 'default',
                options: {
                    userName: '', // Trusted connection via string usually handles this, but for config object it's different.
                }
            },
            options: {
                instanceName: 'SQLEXPRESS',
                trustServerCertificate: true,
                trustedConnection: true
            }
        },
        // 3. Localhost
        "Server=localhost\\SQLEXPRESS;Database=RuleEngineDb;Trusted_Connection=True;TrustServerCertificate=True;",
    ];

    for (const config of configs) {
        if (!config) continue;
        console.log(`\nTesting: ${typeof config === 'string' ? config : JSON.stringify(config)}`);
        try {
            const pool = await sql.connect(config as any);
            console.log('✅ SUCCESS!');
            await pool.close();
            return;
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
        }
    }
}

test();
