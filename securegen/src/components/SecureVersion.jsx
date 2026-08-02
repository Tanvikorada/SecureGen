import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Lightbulb, Wrench, SplitSquareHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SecureVersion({ result, language, originalCode }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('secure'); // 'secure' | 'diff'

  if (!result.secure_version) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.secure_version);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6 mt-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <h3 className="text-xl font-semibold text-white">Secure Alternative</h3>
        <div className="flex bg-white/5 backdrop-blur-sm border border-glass-border rounded-lg p-1 shadow-lg">
          <button
            onClick={() => setViewMode('secure')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'secure' ? 'bg-accent-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Secure Code
          </button>
          <button
            onClick={() => setViewMode('diff')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'diff' ? 'bg-accent-blue text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            Diff View
          </button>
        </div>
      </div>
      
      {viewMode === 'secure' ? (
        <div className="glass-panel bg-[#0d1117]/80 rounded-xl overflow-hidden relative group">
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-md border border-glass-border backdrop-blur-md transition-all z-10 flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-accent-green" />
                <span className="text-xs font-bold text-accent-green">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
              </>
            )}
          </button>
          
          <SyntaxHighlighter 
            language={language} 
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.875rem' }}
            wrapLines={true}
          >
            {result.secure_version}
          </SyntaxHighlighter>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel bg-[#0d1117]/80 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Original (Vulnerable)
            </div>
            <SyntaxHighlighter 
              language={language} 
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.875rem', flex: 1 }}
              wrapLines={true}
            >
              {originalCode}
            </SyntaxHighlighter>
          </div>
          <div className="glass-panel bg-[#0d1117]/80 rounded-xl overflow-hidden flex flex-col relative">
            <div className="bg-green-500/10 border-b border-green-500/20 px-5 py-3 text-xs font-bold text-green-400 uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Secure Version
              </div>
              <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors" title="Copy secure code">
                {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <SyntaxHighlighter 
              language={language} 
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '0.875rem', flex: 1 }}
              wrapLines={true}
            >
              {result.secure_version}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6 pt-4">
        {result.changes_made && result.changes_made.length > 0 && (
          <div className="glass-panel bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-4 text-white font-semibold">
              <Wrench className="w-5 h-5 text-gray-400" />
              <h4>Changes Made</h4>
            </div>
            <ol className="list-decimal list-outside ml-5 space-y-3 text-sm text-gray-300">
              {result.changes_made.map((change, i) => (
                <li key={i} className="pl-1 leading-relaxed">{change}</li>
              ))}
            </ol>
          </div>
        )}

        {result.ai_generation_patterns && result.ai_generation_patterns.length > 0 && (
          <div className="glass-panel bg-accent-blue/5 border-accent-blue/20 rounded-xl p-6 hover:bg-accent-blue/10 transition-colors">
            <div className="flex items-center gap-2 mb-4 text-white font-semibold">
              <Lightbulb className="w-5 h-5 text-accent-blue" />
              <h4>Why AI Generates This</h4>
            </div>
            <ul className="list-disc list-outside ml-5 space-y-3 text-sm text-gray-300">
              {result.ai_generation_patterns.map((pattern, i) => (
                <li key={i} className="pl-1 leading-relaxed">{pattern}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}