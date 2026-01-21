import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Markdown from 'react-markdown';
import { RefreshCw, Play, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scan {
  id: string;
  date: string;
}

interface ScanDetails {
  tables: FileRef[];
  sps: FileRef[];
  views: FileRef[];
  triggers: FileRef[];
  indexes: FileRef[];
}

interface FileRef {
  name: string;
  path: string;
}

const API_BASE = 'http://localhost:3000/api';

function App() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanDetails, setScanDetails] = useState<ScanDetails | null>(null);
  const [activeReportContent, setActiveReportContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  useEffect(() => {
    if (activeScanId) {
      fetchScanDetails(activeScanId);
    }
  }, [activeScanId]);

  const fetchScans = async () => {
    try {
      const res = await fetch(`${API_BASE}/scans`);
      const data = await res.json();
      setScans(data);
      if (data.length > 0 && !activeScanId) {
        setActiveScanId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScanDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/scans/${id}`);
      const data = await res.json();
      setScanDetails(data);
      // Load first table report by default if available
      if (data.tables.length > 0) {
        loadReport(data.tables[0].path);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReport = async (path: string) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3000${path}`);
      const text = await res.text();
      setActiveReportContent(text);
    } finally {
      setLoading(false);
    }
  };

  const runScan = async () => {
    try {
      setScanning(true);
      await fetch(`${API_BASE}/scan`, { method: 'POST' });
      await fetchScans();
      if (scans.length > 0) setActiveScanId(scans[0].id); // Select new scan usually at top
    } catch (err) {
      alert('Scan failed: ' + err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar - Scans */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <span className="text-blue-600">SQL</span> Scanner
          </h1>
        </div>

        <div className="p-4">
          <Button
            className="w-full gap-2"
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? 'Scanning...' : 'New Scan'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            History
          </div>
          <div className="space-y-1">
            {scans.map(scan => (
              <button
                key={scan.id}
                onClick={() => setActiveScanId(scan.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeScanId === scan.id
                    ? "bg-slate-100 dark:bg-slate-800 font-medium text-blue-600"
                    : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                )}
              >
                {new Date(scan.date).toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle - Object Explorer */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-medium">
          Scan Content
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {scanDetails && (Object.keys(scanDetails) as Array<keyof ScanDetails>).map(section => (
            <div key={section} className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                {section} ({scanDetails[section].length})
              </div>
              <div className="space-y-1">
                {scanDetails[section].map((file: FileRef) => (
                  <button
                    key={file.name}
                    onClick={() => loadReport(file.path)}
                    className="w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main - Report Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Report Viewer</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto prose dark:prose-invert">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">Loading...</div>
            ) : (
              <Markdown>{activeReportContent}</Markdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
