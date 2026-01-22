import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Markdown from 'react-markdown';
import {
  RefreshCw,
  Play,
  FileText,
  ChevronRight,
  Database,
  History,
  Search,
  Settings,
  Layers,
  Layout,
  Table as TableIcon,
  Code2,
  Eye,
  Zap,
  ShieldAlert
} from 'lucide-react';
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
  const [activeSection, setActiveSection] = useState<keyof ScanDetails>('tables');

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
      // Load first item of the current active section
      const items = data[activeSection];
      if (items && items.length > 0) {
        loadReport(items[0].path);
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
      if (scans.length > 0) setActiveScanId(scans[0].id);
    } catch (err) {
      alert('Scan failed: ' + err);
    } finally {
      setScanning(false);
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'tables': return <TableIcon className="w-4 h-4" />;
      case 'sps': return <Code2 className="w-4 h-4" />;
      case 'views': return <Eye className="w-4 h-4" />;
      case 'triggers': return <Zap className="w-4 h-4" />;
      case 'indexes': return <Layers className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mini Sidebar - Icons */}
      <div className="w-16 flex flex-col items-center py-4 border-r bg-muted/30 gap-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <Button variant="ghost" size="icon" className="rounded-xl bg-background shadow-sm">
          <Search className="w-5 h-5 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-background/50">
          <History className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="mt-auto">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-background/50">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Scans & History */}
      <div className="w-72 border-r bg-card flex flex-col overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold tracking-tight">SQL Analysis</h1>
            <Badge variant="secondary" className="font-mono">v1.2</Badge>
          </div>

          <Button
            className="w-full h-11 rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? 'Scanning...' : 'Launch New Scan'}
          </Button>
        </div>

        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 px-3 mb-2">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Scans</span>
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-1 pr-3">
              {scans.length > 0 ? scans.map(scan => (
                <button
                  key={scan.id}
                  onClick={() => setActiveScanId(scan.id)}
                  className={cn(
                    "w-full flex flex-col gap-1 items-start px-4 py-3 rounded-xl text-left transition-all duration-200 group relative",
                    activeScanId === scan.id
                      ? "bg-primary/5 border-l-2 border-primary ring-1 ring-primary/10"
                      : "hover:bg-muted/50 border-l-2 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "text-sm font-medium",
                      activeScanId === scan.id ? "text-primary" : "text-foreground"
                    )}>
                      {new Date(scan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-70">
                      {new Date(scan.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate w-full flex items-center gap-1">
                    <Database className="w-3 h-3 opacity-50" />
                    HP15S\SQLEXPRESS
                  </div>
                </button>
              )) : (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-10 w-full mb-2" />
                  <p className="text-xs italic">No scans found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Middle - Object Explorer */}
      <div className="w-80 border-r bg-muted/10 flex flex-col overflow-hidden">
        <div className="p-6 border-b bg-background/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Scan Content
            </h2>
          </div>

          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as keyof ScanDetails)} className="w-full">
            <TabsList className="grid grid-cols-5 h-9 bg-muted/50 rounded-lg p-1">
              <TabsTrigger value="tables" className="rounded-md p-0" title="Tables"><TableIcon className="w-3.5 h-3.5" /></TabsTrigger>
              <TabsTrigger value="sps" className="rounded-md p-0" title="Procedures"><Code2 className="w-3.5 h-3.5" /></TabsTrigger>
              <TabsTrigger value="views" className="rounded-md p-0" title="Views"><Eye className="w-3.5 h-3.5" /></TabsTrigger>
              <TabsTrigger value="triggers" className="rounded-md p-0" title="Triggers"><Zap className="w-3.5 h-3.5" /></TabsTrigger>
              <TabsTrigger value="indexes" className="rounded-md p-0" title="Indexes"><Layers className="w-3.5 h-3.5" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-1">
              {scanDetails ? (
                scanDetails[activeSection].length > 0 ? (
                  scanDetails[activeSection].map((file: FileRef) => (
                    <button
                      key={file.name}
                      onClick={() => loadReport(file.path)}
                      className="w-full group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-card hover:shadow-sm border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
                          {getSectionIcon(activeSection)}
                        </div>
                        <span className="truncate font-medium text-foreground group-hover:text-primary">{file.name}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                    <Search className="w-8 h-8 mb-2" />
                    <p className="text-xs">No {activeSection} found</p>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main - Report Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card">
        <header className="h-16 border-b flex items-center justify-between px-8 bg-background/50 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-none mb-1">Security Analysis Report</h2>
              <p className="text-xs text-muted-foreground">Detailed scan results and LLM generated insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 rounded-lg gap-2 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-12">
              {loading ? (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-64 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ) : activeReportContent ? (
                <article className="prose prose-slate dark:prose-invert max-w-none 
                  prose-headings:font-bold prose-headings:tracking-tight
                  prose-h1:text-4xl prose-h1:mb-8
                  prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-2 prose-h2:border-b
                  prose-pre:bg-muted/50 prose-pre:p-6 prose-pre:rounded-xl prose-pre:border
                  prose-code:text-primary prose-code:font-mono prose-code:text-sm
                  prose-p:leading-relaxed prose-p:text-muted-foreground/90"
                >
                  <Markdown>{activeReportContent}</Markdown>
                </article>
              ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Report Selected</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    Select an object from the explorer on the left to view its security analysis and schema definition.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}

export default App;
