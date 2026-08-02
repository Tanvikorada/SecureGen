import React, { useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Search, Loader2, AlertCircle, FileCode, Package,
  GitBranch, ChevronDown, ChevronRight, ExternalLink, Cpu,
  CheckCircle2, Circle, Star, Eye, X, Layers, ShieldAlert
} from 'lucide-react';
import VulnerabilityCard from './VulnerabilityCard';

// ---------- constants ----------
const CODE_EXT = new Set(['js','jsx','ts','tsx','py','go','rb','java','php','c','cpp','h','hpp',
  'cs','rs','swift','kt','vue','svelte','html','css','scss','json','yml','yaml','md','sql','sh']);
const IGNORE_SEG = ['node_modules','.git','dist','build','vendor','venv','.venv','__pycache__',
  'coverage','.next','.cache','out','target','.idea','.vscode','.github','test','tests','__tests__'];
const PRIORITY_NAMES = ['readme.md','package.json','requirements.txt','pyproject.toml','main.py',
  'app.py','index.js','index.ts','app.js','app.tsx','main.js','main.ts','server.js','manage.py',
  'settings.py','docker-compose.yml','dockerfile','vite.config.js','next.config.js'];
const MAX_FILES = 100;
const PER_FILE_CHAR_CAP = 8000;
const TOTAL_CHAR_BUDGET = 300000;

const FOLDER_COLORS = ['#f97362','#5eb1ef','#a78bfa','#4ade80','#fbbf24','#f472b6','#22d3ee','#fb923c'];

function parseRepoUrl(url) {
  const clean = (url || '').trim().replace(/\.git$/, '').replace(/\/$/, '');
  const m = clean.match(/github\.com[:/]+([^/]+)\/([^/]+)/i);
  if (m) return { owner: m[1], repo: m[2] };
  const m2 = clean.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m2) return { owner: m2[1], repo: m2[2] };
  return null;
}

function topFolder(path) {
  const parts = path.split('/');
  return parts.length > 1 ? parts[0] : '(root)';
}

function scoreFile(f) {
  const name = f.path.split('/').pop().toLowerCase();
  let score = 0;
  if (PRIORITY_NAMES.includes(name)) score += 100;
  const depth = f.path.split('/').length;
  score -= depth * 3;
  const size = f.size || 0;
  if (size > 200 && size < 15000) score += 15;
  if (size >= 15000) score += 5;
  return score;
}

function extractImports(path, content) {
  const ext = path.split('.').pop().toLowerCase();
  const imports = [];
  if (['js','jsx','ts','tsx','vue','svelte'].includes(ext)) {
    const re1 = /import\s+(?:[^'";]*?)\s+from\s+['"]([^'"]+)['"]/g;
    const re2 = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const re3 = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re1.exec(content))) imports.push(m[1]);
    while ((m = re2.exec(content))) imports.push(m[1]);
    while ((m = re3.exec(content))) imports.push(m[1]);
  } else if (ext === 'py') {
    const re1 = /^\s*from\s+([.\w]+)\s+import/gm;
    const re2 = /^\s*import\s+([.\w]+)/gm;
    let m;
    while ((m = re1.exec(content))) imports.push(m[1]);
    while ((m = re2.exec(content))) imports.push(m[1]);
  }
  return imports;
}

function normalizePath(p) {
  const parts = p.split('/');
  const out = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function resolveImport(fromPath, imp, allPathsSet) {
  const ext = fromPath.split('.').pop().toLowerCase();
  if (ext === 'py') {
    const cleaned = imp.replace(/^\.+/, '');
    const candidatePath = cleaned.split('.').join('/') + '.py';
    const found = [...allPathsSet].find(p => p.endsWith(candidatePath));
    return found || null;
  }
  if (!imp.startsWith('.')) return null;
  const dir = fromPath.split('/').slice(0, -1).join('/');
  const base = normalizePath(dir + '/' + imp);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.ts`, `${base}.tsx`,
    `${base}/index.js`, `${base}/index.jsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find(c => allPathsSet.has(c)) || null;
}

export default function RepoArchitect({ apiKey }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [viewMode, setViewMode] = useState('architecture'); // 'architecture' or 'security'
  const svgWrapRef = useRef(null);

  function pushStep(label, status) {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.label === label);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { label, status };
        return copy;
      }
      return [...prev, { label, status }];
    });
  }

  async function ghFetch(path, token) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(path, { headers });
  }

  async function analyze() {
    if (!apiKey) {
      setError("Please enter your Gemini API key at the top of the page first.");
      return;
    }

    setError(null);
    setResult(null);
    setSelectedNode(null);
    setSteps([]);
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setError("That doesn't look like a valid GitHub repo URL. Try something like https://github.com/owner/repo");
      return;
    }
    const { owner, repo } = parsed;
    setLoading(true);
    try {
      pushStep('Fetching repository metadata', 'active');
      const repoRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`, token);
      if (!repoRes.ok) {
        if (repoRes.status === 404) throw new Error('Repository not found. Check the URL, or it may be private (add a token below).');
        if (repoRes.status === 403) throw new Error('GitHub API rate limit hit. Add a personal access token to continue, or wait an hour.');
        throw new Error(`GitHub API error: ${repoRes.status}`);
      }
      const repoData = await repoRes.json();
      pushStep('Fetching repository metadata', 'done');

      pushStep('Building file tree', 'active');
      const branch = repoData.default_branch;
      const treeRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token);
      if (!treeRes.ok) throw new Error(`Could not read file tree: ${treeRes.status}`);
      const treeData = await treeRes.json();
      const allFiles = (treeData.tree || []).filter(t =>
        t.type === 'blob' &&
        !IGNORE_SEG.some(seg => t.path.split('/').includes(seg)) &&
        CODE_EXT.has((t.path.split('.').pop() || '').toLowerCase())
      );
      if (allFiles.length === 0) throw new Error('No recognizable source files found in this repo.');
      pushStep('Building file tree', 'done');

      pushStep(`Selecting key files (from ${allFiles.length} total)`, 'active');
      const selected = [...allFiles].sort((a, b) => scoreFile(b) - scoreFile(a)).slice(0, MAX_FILES);
      const allPathsSet = new Set(allFiles.map(f => f.path));
      pushStep(`Selecting key files (from ${allFiles.length} total)`, 'done');

      pushStep('Reading file contents', 'active');
      const fileMap = {};
      const chunkSize = 15;
      for (let i = 0; i < selected.length; i += chunkSize) {
        const chunk = selected.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(async f => {
          try {
            const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`);
            if (!r.ok) return [f.path, ''];
            const text = await r.text();
            return [f.path, text];
          } catch { return [f.path, '']; }
        }));
        results.forEach(([p, c]) => { fileMap[p] = c; });
      }
      pushStep('Reading file contents', 'done');

      pushStep('Parsing dependency graph', 'active');
      const nodesById = {};
      selected.forEach(f => {
        nodesById[f.path] = {
          id: f.path,
          name: f.path.split('/').pop(),
          folder: topFolder(f.path),
          size: f.size || 0,
        };
      });
      const edgeSet = new Set();
      const edges = [];
      selected.forEach(f => {
        const content = fileMap[f.path] || '';
        const imports = extractImports(f.path, content);
        imports.forEach(imp => {
          const target = resolveImport(f.path, imp, allPathsSet);
          if (target && nodesById[target] && target !== f.path) {
            const key = `${f.path}=>${target}`;
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              edges.push({ source: f.path, target });
            }
          }
        });
      });
      pushStep('Parsing dependency graph', 'done');

      pushStep('Running Gemini Deep Audit & Analysis', 'active');
      let budget = TOTAL_CHAR_BUDGET;
      const contentBlocks = [];
      for (const f of selected) {
        if (budget <= 0) break;
        const raw = (fileMap[f.path] || '').slice(0, PER_FILE_CHAR_CAP);
        if (!raw.trim()) continue;
        contentBlocks.push(`--- FILE: ${f.path} ---\n${raw}`);
        budget -= raw.length;
      }
      const treeSummary = allFiles.slice(0, 300).map(f => f.path).join('\n');

      const systemPrompt = `You are a world-class Software Architect and Cybersecurity Expert. You are auditing a GitHub repository.
Respond with ONLY valid JSON (no markdown fences, no prose outside the JSON) matching exactly this schema:
{
  "projectPurpose": "2-3 sentences on what this project does",
  "techStack": ["short tag", "short tag"],
  "architecture": "3-4 sentences describing the overall architecture/pattern used",
  "dataFlow": "3-4 sentences on how data/requests move through the system",
  "fileExplanations": [{"path": "exact file path from the tree", "role": "one short label", "explanation": "one concise sentence"}],
  "keyConnections": [{"from": "file path", "to": "file path", "relationship": "short phrase"}],
  "overall_risk": "critical|high|medium|low|safe",
  "risk_score": <number 0-100>,
  "summary": "1 sentence security posture summary",
  "vulnerabilities": [
    {
      "id": "V1",
      "type": "vulnerability type",
      "severity": "critical|high|medium|low",
      "line_reference": "file path and approximate location",
      "description": "what is wrong",
      "exploit_scenario": "how an attacker exploits this",
      "cvss_score": 8.5,
      "owasp_category": "OWASP category"
    }
  ]
}
Include fileExplanations for at most 30 of the most important files. Ensure JSON is strictly valid.`;

      const userMessage = `Analyze this GitHub repository: ${owner}/${repo}.
Description: ${repoData.description || 'none provided'}
Primary language: ${repoData.language || 'unknown'}

File tree (${allFiles.length} source files total; showing up to 300):
${treeSummary}

Contents of the most important files:
${contentBlocks.join('\n\n')}`;

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        })
      });

      if (!aiRes.ok) {
        if (aiRes.status === 400) throw new Error('Invalid request. Ensure you are using a valid Gemini API key.');
        if (aiRes.status === 403) throw new Error('Invalid API key or unauthorized. Check your API key at aistudio.google.com.');
        if (aiRes.status === 429) throw new Error('Gemini rate limit exceeded. Try again in a minute.');
        throw new Error(`Analysis backend error: ${aiRes.status}`);
      }

      const aiData = await aiRes.json();
      const textOut = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = textOut.trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
      
      let analysis;
      try {
        analysis = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        analysis = match ? JSON.parse(match[0]) : {
          projectPurpose: 'Could not parse AI analysis for this repo — try again.',
          techStack: [], architecture: '', dataFlow: '', fileExplanations: [], keyConnections: [],
          overall_risk: "safe", risk_score: 0, summary: "Failed to parse security audit.", vulnerabilities: []
        };
      }
      pushStep('Running Gemini Deep Audit & Analysis', 'done');

      (analysis.keyConnections || []).forEach(kc => {
        const fromMatch = [...allPathsSet].find(p => p === kc.from || p.endsWith(kc.from));
        const toMatch = [...allPathsSet].find(p => p === kc.to || p.endsWith(kc.to));
        if (fromMatch && toMatch && nodesById[fromMatch] && nodesById[toMatch] && fromMatch !== toMatch) {
          const key = `${fromMatch}=>${toMatch}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source: fromMatch, target: toMatch, semantic: kc.relationship });
          }
        }
      });

      pushStep('Laying out diagram', 'active');
      const nodes = Object.values(nodesById);
      const folders = [...new Set(nodes.map(n => n.folder))];
      const colorScale = d3.scaleOrdinal().domain(folders).range(FOLDER_COLORS);

      const width = 900, height = 560;
      const simNodes = nodes.map(n => ({ ...n }));
      const simEdges = edges.map(e => ({ ...e }));
      const simulation = d3.forceSimulation(simNodes)
        .force('link', d3.forceLink(simEdges).id(d => d.id).distance(85).strength(0.35))
        .force('charge', d3.forceManyBody().strength(-260))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(30))
        .stop();
      for (let i = 0; i < 320; i++) simulation.tick();
      simNodes.forEach(n => {
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      });
      pushStep('Laying out diagram', 'done');

      const explanationByPath = {};
      (analysis.fileExplanations || []).forEach(fe => {
        const match = [...allPathsSet].find(p => p === fe.path || p.endsWith(fe.path));
        if (match) explanationByPath[match] = fe;
      });

      const fileExplanationForNode = {};
      simNodes.forEach(n => {
        fileExplanationForNode[n.id] = explanationByPath[n.id] || null;
      });

      setResult({
        owner, repo, repoData, analysis,
        nodes: simNodes, edges: simEdges,
        width, height, colorScale, folders,
        explanationByPath: fileExplanationForNode,
        totalFiles: allFiles.length,
        sampledFiles: selected.length,
        truncatedTree: !!treeData.truncated,
      });
      setViewMode('architecture'); // Default to architecture view when done
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const groupedFiles = useMemo(() => {
    if (!result) return {};
    const groups = {};
    result.nodes.forEach(n => {
      if (!groups[n.folder]) groups[n.folder] = [];
      groups[n.folder].push(n);
    });
    return groups;
  }, [result]);

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-accent-red';
    if (score >= 60) return 'text-accent-orange';
    if (score >= 30) return 'text-accent-amber';
    return 'text-accent-green';
  };
  
  const getRiskBg = (score) => {
    if (score >= 80) return 'bg-accent-red';
    if (score >= 60) return 'bg-accent-orange';
    if (score >= 30) return 'bg-accent-amber';
    return 'bg-accent-green';
  };

  return (
    <div className="w-full text-zinc-100 font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-5xl mx-auto py-8">

        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center">
            <Cpu size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Repo Auditor & Architect</h1>
        </div>
        <p className="text-text-secondary text-sm mb-6 ml-12">Powered by Gemini. Paste a GitHub repo to map its architecture and perform a deep security audit.</p>

        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 mb-5 shadow-lg shadow-black/20">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-bg-tertiary border border-border-default rounded-lg px-3 focus-within:border-border-hover transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                <path d="M9 18c-4.51 2-5-2-7-2"/>
              </svg>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && analyze()}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder-text-muted"
              />
            </div>
            <button
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-accent-orange to-accent-red hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-2 transition-all shrink-0"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Analyzing' : 'Analyze Repo'}
            </button>
          </div>
          <button
            onClick={() => setShowToken(s => !s)}
            className="text-xs text-text-muted hover:text-text-secondary mt-3 flex items-center gap-1 transition-colors"
          >
            {showToken ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Private repo or hitting GitHub rate limits? Add a GitHub token
          </button>
          {showToken && (
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="GitHub personal access token (kept only in this session, never stored)"
              type="password"
              className="w-full mt-2 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-white outline-none placeholder-text-muted focus:border-border-hover transition-colors"
            />
          )}
        </div>

        {(loading || (steps.length > 0 && !result)) && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 mb-5 space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {s.status === 'done' ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> :
                  s.status === 'active' ? <Loader2 size={15} className="animate-spin text-accent-orange shrink-0" /> :
                  <Circle size={15} className="text-text-muted shrink-0" />}
                <span className={s.status === 'done' ? 'text-text-secondary' : 'text-text-primary'}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-4 mb-5 flex items-start gap-3">
            <AlertCircle size={18} className="text-accent-red shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <a href={result.repoData.html_url} target="_blank" rel="noopener noreferrer"
                  className="text-lg font-semibold text-white hover:text-accent-orange flex items-center gap-1.5 transition-colors">
                  {result.owner}/{result.repo}
                  <ExternalLink size={14} className="text-text-muted" />
                </a>
                <p className="text-text-secondary text-sm mt-1 max-w-2xl">{result.repoData.description || 'No description provided.'}</p>
                <div className="flex gap-4 text-xs text-text-muted mt-2">
                  <span className="flex items-center gap-1"><Star size={13} /> {result.repoData.stargazers_count}</span>
                  <span className="flex items-center gap-1"><Eye size={13} /> {result.repoData.watchers_count}</span>
                  <span className="flex items-center gap-1"><GitBranch size={13} /> {result.repoData.default_branch}</span>
                  <span>Sampled {result.sampledFiles} / {result.totalFiles} files</span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <div className="bg-bg-tertiary p-1 rounded-lg inline-flex border border-border-default shadow-sm self-end">
                <button
                  onClick={() => setViewMode('architecture')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                    viewMode === 'architecture' 
                      ? 'bg-bg-secondary text-white shadow-sm border border-border-default' 
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary/50'
                  }`}
                >
                  <Cpu size={14} /> Map
                </button>
                <button
                  onClick={() => setViewMode('security')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                    viewMode === 'security' 
                      ? 'bg-bg-secondary text-white shadow-sm border border-border-default' 
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary/50'
                  }`}
                >
                  <ShieldAlert size={14} /> Security
                </button>
              </div>
            </div>

            {viewMode === 'architecture' && (
              <div className="animate-in fade-in space-y-5">
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 bg-bg-secondary border border-border-default rounded-xl p-5 shadow-lg">
                    <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                      <Layers size={14} className="text-accent-orange" /> What this actually does
                    </h2>
                    <p className="text-sm text-text-primary leading-relaxed">{result.analysis.projectPurpose}</p>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-4 mb-1.5">Architecture</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{result.analysis.architecture}</p>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-4 mb-1.5">Data flow</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{result.analysis.dataFlow}</p>
                  </div>
                  <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-lg">
                    <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Package size={14} className="text-accent-orange" /> Tech stack
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {(result.analysis.techStack || []).map((t, i) => (
                        <span key={i} className="text-xs bg-bg-tertiary text-text-primary px-2.5 py-1 rounded-md border border-border-default shadow-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-lg">
                  <h2 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
                    <GitBranch size={14} className="text-accent-orange" /> File dependency graph
                  </h2>
                  <p className="text-xs text-text-muted mb-3">Click a node to see what that file does. Lines show import/connection relationships.</p>
                  <div className="grid lg:grid-cols-[1fr_280px] gap-4">
                    <div ref={svgWrapRef} className="bg-bg-tertiary rounded-lg border border-border-default overflow-auto relative">
                      <svg width={result.width} height={result.height}>
                        {result.edges.map((e, i) => {
                          const s = typeof e.source === 'object' ? e.source : result.nodes.find(n => n.id === e.source);
                          const t = typeof e.target === 'object' ? e.target : result.nodes.find(n => n.id === e.target);
                          if (!s || !t) return null;
                          return (
                            <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                              stroke={e.semantic ? '#f97362' : '#3f3f46'} strokeWidth={e.semantic ? 1.4 : 1}
                              strokeOpacity={0.55} />
                          );
                        })}
                        {result.nodes.map(n => (
                          <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedNode(n.id)}>
                            {selectedNode === n.id && (
                              <circle r={14} fill={result.colorScale(n.folder)} fillOpacity={0.2} className="animate-pulse" />
                            )}
                            <circle r={selectedNode === n.id ? 9 : 6.5}
                              fill={result.colorScale(n.folder)}
                              stroke={selectedNode === n.id ? '#fff' : 'rgba(0,0,0,0.5)'} strokeWidth={selectedNode === n.id ? 2 : 1}
                              fillOpacity={1} />
                            <text x={11} y={4} fontSize={10} fill={selectedNode === n.id ? "#fff" : "#888"} fontWeight={selectedNode === n.id ? 600 : 400} style={{ userSelect: 'none' }}>
                              {n.name}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>

                    <div className="bg-bg-tertiary rounded-lg border border-border-default p-4 min-h-[200px]">
                      {selectedNode ? (
                        <div className="animate-in fade-in">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white break-all">{selectedNode}</h3>
                            <button onClick={() => setSelectedNode(null)} className="text-text-muted hover:text-white shrink-0 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                          {result.explanationByPath[selectedNode] ? (
                            <>
                              <span className="inline-block text-[10px] uppercase tracking-wide bg-accent-orange/10 text-accent-orange px-2 py-0.5 rounded mt-2 font-medium border border-accent-orange/20">
                                {result.explanationByPath[selectedNode].role}
                              </span>
                              <p className="text-xs text-text-secondary mt-3 leading-relaxed">{result.explanationByPath[selectedNode].explanation}</p>
                            </>
                          ) : (
                            <p className="text-xs text-text-muted mt-2">No detailed explanation was generated for this file — it wasn't part of the sampled core set.</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted">Select a node in the graph to see details about that file.</p>
                      )}
                      <div className="mt-6 pt-4 border-t border-border-default">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted mb-3 font-semibold">Folders</p>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2">
                          {result.folders.map(f => (
                            <div key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: result.colorScale(f) }} />
                              <span className="truncate" title={f}>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-lg">
                  <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <FileCode size={14} className="text-accent-orange" /> File-by-file breakdown
                  </h2>
                  <div className="space-y-2">
                    {Object.entries(groupedFiles).map(([folder, files]) => (
                      <div key={folder} className="border border-border-default rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFolders(p => ({ ...p, [folder]: !p[folder] }))}
                          className="w-full flex items-center justify-between px-3 py-2 bg-bg-tertiary hover:bg-border-default text-sm text-text-primary transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            {expandedFolders[folder] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            {folder} <span className="text-text-muted">({files.length})</span>
                          </span>
                        </button>
                        {expandedFolders[folder] && (
                          <div className="divide-y divide-border-default bg-bg-secondary">
                            {files.map(f => {
                              const exp = result.explanationByPath[f.id];
                              return (
                                <div key={f.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-bg-tertiary transition-colors">
                                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: result.colorScale(f.folder) }} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-mono text-text-primary">{f.name}</p>
                                    {exp ? (
                                      <p className="text-xs text-text-secondary mt-0.5">
                                        <span className="text-accent-orange font-medium">{exp.role}</span> — {exp.explanation}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-text-muted mt-0.5">Not part of the AI-sampled core set.</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'security' && (
              <div className="animate-in fade-in space-y-6">
                <div className="bg-bg-secondary border border-border-default rounded-xl p-8 text-center shadow-lg relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1 ${getRiskBg(result.analysis.risk_score)}`} />
                  <div className="text-6xl font-bold mb-2 font-mono">
                    <span className={getRiskColor(result.analysis.risk_score)}>{result.analysis.risk_score}</span>
                    <span className="text-text-muted text-2xl">/100</span>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border bg-bg-tertiary ${getRiskColor(result.analysis.risk_score)} border-current/20`}>
                    {result.analysis.overall_risk} Risk
                  </div>
                  <p className="text-text-primary max-w-2xl mx-auto leading-relaxed">
                    {result.analysis.summary}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-accent-orange w-5 h-5" /> 
                    Repository Vulnerabilities ({result.analysis.vulnerabilities?.length || 0})
                  </h3>
                  {result.analysis.vulnerabilities?.length > 0 ? (
                    <div className="space-y-4">
                      {result.analysis.vulnerabilities.map((vuln, idx) => (
                        <VulnerabilityCard key={idx} vuln={vuln} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-bg-secondary border border-border-default rounded-xl p-8 text-center shadow-lg">
                      <CheckCircle2 className="w-12 h-12 text-accent-green mx-auto mb-3 opacity-80" />
                      <h4 className="text-white font-medium mb-1">No major vulnerabilities detected</h4>
                      <p className="text-sm text-text-muted max-w-md mx-auto">
                        The AI did not find any critical security flaws in the sampled source code files for this repository.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && steps.length === 0 && (
          <div className="text-center py-16 text-text-muted text-sm border border-dashed border-border-default rounded-xl bg-bg-secondary/50 shadow-inner">
            <Cpu className="w-8 h-8 text-border-default mx-auto mb-3" />
            Paste a public GitHub repo URL above to get started.
          </div>
        )}
      </div>
    </div>
  );
}
