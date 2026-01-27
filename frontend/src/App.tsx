import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  ShieldAlert,
  Copy,
  Check,
  Download,
  Terminal,
  AlertTriangle
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

const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-3 right-3 h-8 w-8 bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/10 text-zinc-400 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
};

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      {/* Mini Sidebar - Icons */}
      <div className="w-20 flex flex-col items-center py-6 border-r bg-muted/20 gap-6">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 rotate-3 hover:rotate-0 transition-transform cursor-pointer group">
          <Database className="w-6 h-6 text-primary-foreground group-hover:scale-110 transition-transform" />
        </div>
        <div className="flex flex-col gap-4">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-background shadow-sm border border-border/50 hover:border-primary/50 transition-all group">
            <Search className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-background/80 transition-all border border-transparent hover:border-border/50 group">
            <History className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-background/80 transition-all border border-transparent hover:border-border/50 group">
            <Layers className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-background/80 transition-all border border-transparent hover:border-border/50 group">
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
        </div>
      </div>

      {/* Sidebar - Scans & History */}
      <div className="w-80 border-r bg-card/30 flex flex-col overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight text-foreground/90 uppercase italic">SQL<span className="text-primary not-italic">SCAN</span></h1>
              <span className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">Security Engine</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono border-muted-foreground/30 text-muted-foreground">PRO 1.2</Badge>
          </div>

          <Button
            className="w-full h-12 rounded-2xl gap-3 font-bold shadow-xl shadow-primary/10 transition-all hover:translate-y-[-2px] active:translate-y-[0px] bg-primary hover:bg-primary/90"
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {scanning ? 'ENGINE ACTIVE...' : 'INITIATE SCAN'}
          </Button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 px-4 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Archive</span>
          </div>
          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="space-y-2 pr-4 pl-2">
              {scans.length > 0 ? scans.map(scan => (
                <button
                  key={scan.id}
                  onClick={() => setActiveScanId(scan.id)}
                  className={cn(
                    "w-full flex flex-col gap-1.5 items-start px-5 py-4 rounded-2xl text-left transition-all duration-300 relative border overflow-hidden",
                    activeScanId === scan.id
                      ? "bg-primary/[0.03] border-primary/20 shadow-sm"
                      : "hover:bg-muted/30 border-transparent hover:border-border/50"
                  )}
                >
                  {activeScanId === scan.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(
                      "text-sm font-bold tracking-tight",
                      activeScanId === scan.id ? "text-primary" : "text-foreground/80"
                    )}>
                      {new Date(scan.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground/50 tabular-nums">
                      {new Date(scan.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-muted/50">
                      <Terminal className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground truncate opacity-80">
                      HP15S\SQLEXPRESS
                    </span>
                  </div>
                </button>
              )) : (
                <div className="px-4 py-8 text-center">
                  <div className="w-12 h-12 bg-muted/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground/50 italic">No archive data available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Middle - Object Explorer */}
      <div className="w-96 border-r bg-muted/5 flex flex-col overflow-hidden">
        <div className="p-8 border-b bg-background/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-black text-[11px] text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
              <Layout className="w-3.5 h-3.5" />
              Intelligence Explorer
            </h2>
            <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/10 text-primary capitalize font-bold">{activeSection}</Badge>
          </div>

          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as keyof ScanDetails)} className="w-full">
            <TabsList className="grid grid-cols-5 h-11 bg-muted/50 rounded-2xl p-1.5 border border-border/50">
              <TabsTrigger value="tables" className="rounded-xl p-0 data-[state=active]:bg-background data-[state=active]:shadow-sm" title="Tables"><TableIcon className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="sps" className="rounded-xl p-0 data-[state=active]:bg-background data-[state=active]:shadow-sm" title="Procedures"><Code2 className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="views" className="rounded-xl p-0 data-[state=active]:bg-background data-[state=active]:shadow-sm" title="Views"><Eye className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="triggers" className="rounded-xl p-0 data-[state=active]:bg-background data-[state=active]:shadow-sm" title="Triggers"><Zap className="w-4 h-4" /></TabsTrigger>
              <TabsTrigger value="indexes" className="rounded-xl p-0 data-[state=active]:bg-background data-[state=active]:shadow-sm" title="Indexes"><Layers className="w-4 h-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {scanDetails ? (
                scanDetails[activeSection].length > 0 ? (
                  scanDetails[activeSection].map((file: FileRef) => (
                    <button
                      key={file.name}
                      onClick={() => loadReport(file.path)}
                      className="w-full group flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm transition-all hover:bg-background hover:shadow-xl hover:shadow-black/5 border border-transparent hover:border-border/50 relative overflow-hidden"
                    >
                      <div className="flex items-center gap-4 overflow-hidden relative z-10">
                        <div className="p-2 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                          {getSectionIcon(activeSection)}
                        </div>
                        <span className="truncate font-bold text-foreground/80 group-hover:text-foreground tracking-tight">{file.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30">
                    <Search className="w-12 h-12 mb-4 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-widest italic">No data discovered</p>
                  </div>
                )
              ) : (
                <div className="space-y-3 px-2">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl opacity-50" />)}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main - Report Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-20 border-b flex items-center justify-between px-10 bg-background/60 backdrop-blur-2xl z-20 sticky top-0 border-border/50">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-lg leading-none mb-1.5 tracking-tight uppercase italic text-foreground/90">Intelligence <span className="text-primary not-italic">REPORT</span></h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-1.5 py-0 text-[9px] font-black uppercase tracking-tighter bg-muted/50 text-muted-foreground/80">LLM-ANALYZED</Badge>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Security & Performance Insights</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-muted/50 transition-all">
              <Download className="w-4 h-4" />
              EXPORT PDF
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-muted/5">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-12 lg:p-20">
              {loading ? (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-3/4 rounded-2xl" />
                    <Skeleton className="h-4 w-1/2 rounded-full" />
                  </div>
                  <Skeleton className="h-[400px] w-full rounded-3xl" />
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full rounded-full" />
                    <Skeleton className="h-4 w-full rounded-full" />
                    <Skeleton className="h-4 w-2/3 rounded-full" />
                  </div>
                </div>
              ) : activeReportContent ? (
                <article className="prose prose-slate dark:prose-invert max-w-none 
                  prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:italic
                  prose-h1:text-5xl prose-h1:mb-12 prose-h1:not-italic prose-h1:text-foreground
                  prose-h2:text-sm prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-3 prose-h2:border-b-2 prose-h2:border-primary/20 prose-h2:text-primary prose-h2:tracking-[0.3em] prose-h2:bg-primary/[0.02] prose-h2:pl-4 prose-h2:rounded-r-lg
                  prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-foreground/90 prose-h3:p-0
                  prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:shadow-none
                  prose-code:text-foreground prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                  prose-p:leading-relaxed prose-p:text-muted-foreground/80 prose-p:text-base
                  prose-li:text-muted-foreground/80
                  prose-strong:text-primary prose-strong:font-black"
                >
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const content = String(children).replace(/\n$/, '');
                        return !inline && match ? (
                          <div className="relative group my-8 overflow-hidden rounded-3xl border border-white/5 bg-[#0d1117] shadow-2xl shadow-black/20">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                                </div>
                                <span className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{match[1]}</span>
                              </div>
                              <CopyButton content={content} />
                            </div>
                            <SyntaxHighlighter
                              {...props}
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                padding: '1.5rem',
                                background: 'transparent',
                                fontSize: '0.875rem',
                                lineHeight: '1.6',
                              }}
                            >
                              {content}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-primary font-bold", className)} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {activeReportContent}
                  </Markdown>
                </article>
              ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-muted/50 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12 animate-in fade-in zoom-in duration-700">
                    <FileText className="w-10 h-10 text-muted-foreground/20" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tighter uppercase italic">Neutral State</h3>
                  <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm leading-relaxed">
                    Awaiting object selection. Choose a database entity from the explorer to commence analysis retrieval.
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

