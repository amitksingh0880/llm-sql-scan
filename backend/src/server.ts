import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Scanner } from './analyzer/scanner';
import 'dotenv/config';

// Disable headers timeout for LLM calls (undici/fetch)
process.env.UNDICI_HEADERS_TIMEOUT = '0';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const SCANS_DIR = path.join(process.cwd(), 'scans');

// List Scans
app.get('/api/scans', (req, res) => {
    if (!fs.existsSync(SCANS_DIR)) {
        return res.json([]);
    }
    const scans = fs.readdirSync(SCANS_DIR).map(dir => {
        const stat = fs.statSync(path.join(SCANS_DIR, dir));
        return {
            id: dir,
            date: stat.birthtime,
            path: path.join(SCANS_DIR, dir)
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
    res.json(scans);
});

// Get Scan Details (List of files)
app.get('/api/scans/:id', (req, res) => {
    const scanId = req.params.id;
    const scanPath = path.join(SCANS_DIR, scanId);

    if (!fs.existsSync(scanPath)) return res.status(404).send('Scan not found');

    const result: any = {};
    const dirs = ['tables', 'sps', 'views', 'triggers', 'indexes'];

    dirs.forEach(dir => {
        const dirPath = path.join(scanPath, dir);
        if (fs.existsSync(dirPath)) {
            result[dir] = fs.readdirSync(dirPath).filter(f => f.endsWith('.md')).map(f => ({
                name: f.replace('.md', ''),
                path: `/api/report/${scanId}/${dir}/${f}`
            }));
        } else {
            result[dir] = [];
        }
    });

    res.json(result);
});

// Get Report Content
app.get('/api/report/:scanId/:type/:filename', (req, res) => {
    const { scanId, type, filename } = req.params;
    const filePath = path.join(SCANS_DIR, scanId, type, filename);

    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');
    res.send(fs.readFileSync(filePath, 'utf-8'));
});

// Trigger Scan
app.post('/api/scan', async (req, res) => {
    try {
        const connectionString = req.body.connection || process.env.DB_CONNECTION;
        if (!connectionString) return res.status(400).send('No connection string');

        const scanner = new Scanner(connectionString);

        // Run scan async? Or wait? 
        // For simple UI, let's wait (timeout might be an issue for huge DBs, but fine for local)
        await scanner.scan();

        res.json({ success: true, message: 'Scan completed' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
