import sql from 'mssql/msnodesqlv8';

async function testNative() {
    console.log('Testing Native Driver (msnodesqlv8)...');

    // Config for native driver usually uses connection string or object differently
    // For trusted connection:
    const config = {
        server: 'HP15S\\SQLEXPRESS',
        database: 'RuleEngineDb',
        options: {
            trustedConnection: true,
            trustServerCertificate: true
        },
        driver: 'msnodesqlv8'
    };

    try {
        console.log('Connecting with config:', JSON.stringify(config));
        const pool = await sql.connect(config as any);
        console.log('✅ SUCCESS! Connected via Native Driver.');
        await pool.close();
    } catch (err: any) {
        console.error('❌ FAILED:', err);
    }
}

testNative();
