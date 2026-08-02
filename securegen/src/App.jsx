import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ApiKeyInput from './components/ApiKeyInput';
import CodeEditor from './components/CodeEditor';
import AnalysisResult from './components/AnalysisResult';
import RepoArchitect from './components/RepoArchitect';
import { analyzeCode } from './utils/gemini';
import { AlertCircle, X, Terminal } from 'lucide-react';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisDuration, setAnalysisDuration] = useState(0);
  const [history, setHistory] = useState([]);

  const [currentTab, setCurrentTab] = useState('snippet');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('securegen_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const saveToHistory = (result, currentCode, currentLanguage) => {
    const newEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      codeSnippet: currentCode.slice(0, 50) + (currentCode.length > 50 ? '...' : ''),
      originalCode: currentCode,
      language: currentLanguage,
      risk_score: result.risk_score,
      fullResult: result
    };
    
    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, 5);
      localStorage.setItem('securegen_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnalyze = async () => {
    setError(null);
    setAnalysisResult(null);
    setIsAnalyzing(true);
    
    const startTime = Date.now();
    try {
      const result = await analyzeCode(code, language, apiKey);
      setAnalysisResult(result);
      setAnalysisDuration((Date.now() - startTime) / 1000);
      saveToHistory(result, code, language);
    } catch (err) {
      setError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistoryItem = (item) => {
    setCode(item.originalCode || item.codeSnippet);
    setLanguage(item.language);
    setAnalysisResult(item.fullResult);
    setAnalysisDuration(0); 
    setError(null);
    setCurrentTab('snippet');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-white pb-20">
      <Header history={history} onLoadHistory={loadHistoryItem} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analysisResult && !isAnalyzing && currentTab === 'snippet' && <Hero />}

        <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />

        <div className="flex justify-center mb-8">
          <div className="bg-bg-secondary p-1 rounded-lg inline-flex border border-border-default shadow-sm">
            <button
              onClick={() => setCurrentTab('snippet')}
              className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                currentTab === 'snippet' 
                  ? 'bg-bg-tertiary text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50'
              }`}
            >
              Snippet Scanner
            </button>
            <button
              onClick={() => setCurrentTab('repo')}
              className={`px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                currentTab === 'repo' 
                  ? 'bg-bg-tertiary text-white shadow-sm' 
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary/50'
              }`}
            >
              Repo Architect
            </button>
          </div>
        </div>

        {currentTab === 'snippet' ? (
          <>
            <div className="max-w-4xl mx-auto">
              {error && (
                <div className="mb-6 bg-accent-red/10 border border-accent-red/20 rounded-md p-4 flex items-start gap-3 relative animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-accent-red font-medium">
                      {error.message || 'An unexpected error occurred.'}
                    </div>
                    {error.fix && (
                      <div className="text-red-400 text-sm mt-1 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        {error.fix}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="text-accent-red hover:text-red-400 p-1 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <CodeEditor 
                code={code}
                setCode={setCode}
                language={language}
                setLanguage={setLanguage}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                hasApiKey={!!apiKey}
              />
            </div>
            
            {analysisResult && (
              <AnalysisResult 
                result={analysisResult} 
                duration={analysisDuration}
                language={language}
                originalCode={code}
              />
            )}
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RepoArchitect apiKey={apiKey} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;