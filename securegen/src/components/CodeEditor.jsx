import { Loader2, ShieldAlert, Code2 } from 'lucide-react';
import { examples } from '../data/examples';
import { motion } from 'framer-motion';

export default function CodeEditor({ 
  code, setCode, 
  language, setLanguage, 
  onAnalyze, isAnalyzing, hasApiKey 
}) {
  const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Java', 'SQL', 'Bash', 'Go'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full max-w-4xl mx-auto glass-panel rounded-xl overflow-hidden flex flex-col relative z-10"
    >
      <div className="bg-white/5 border-b border-glass-border p-3 flex justify-between items-center">
        <div className="flex gap-2 px-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-gray-400" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent border border-glass-border hover:border-gray-500 text-gray-300 text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all"
          >
            {LANGUAGES.map(l => (
              <option key={l.toLowerCase()} value={l.toLowerCase()} className="bg-bg-primary">{l}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="relative group">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          className="w-full h-80 bg-transparent text-gray-200 font-mono p-6 resize-y focus:outline-none text-sm md:text-base leading-relaxed"
          spellCheck={false}
        />
        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-transparent group-focus-within:ring-accent-blue/30 transition-all rounded-b-xl"></div>
      </div>

      <div className="p-6 bg-white/5 border-t border-glass-border flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-semibold">Try an example snippet</p>
          <div className="flex flex-wrap gap-2">
            {examples.map(ex => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={ex.id}
                onClick={() => {
                  setCode(ex.code);
                  setLanguage(ex.language);
                }}
                className="px-3 py-1.5 bg-white/5 border border-glass-border text-gray-300 text-xs rounded-full hover:bg-white/10 hover:text-white transition-colors"
              >
                {ex.label}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: (hasApiKey && code.trim() && !isAnalyzing) ? 1.02 : 1 }}
          whileTap={{ scale: (hasApiKey && code.trim() && !isAnalyzing) ? 0.98 : 1 }}
          onClick={onAnalyze}
          disabled={!hasApiKey || !code.trim() || isAnalyzing}
          className="w-full md:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-lg font-bold text-white transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:shadow-none disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-accent-red to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-800 border border-transparent disabled:border-gray-600"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scanning Vectors...
            </>
          ) : (
            <>
              <ShieldAlert className="w-5 h-5" />
              Audit Code
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}