import { Shield, Clock, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Header({ history = [], onLoadHistory }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getScoreColor = (score) => {
    if (score <= 20) return 'text-accent-green';
    if (score <= 50) return 'text-accent-amber';
    if (score <= 80) return 'text-accent-orange';
    return 'text-accent-red';
  };

  return (
    <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-2xl px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent-blue" aria-hidden="true" />
            <span className="text-xl font-semibold text-white tracking-tight">SecureGen</span>
          </div>
          
          <div className="flex items-center gap-6">
            <p className="text-sm text-gray-400 font-normal hidden md:block">
              Security auditor for AI-generated code
            </p>

            {history.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 text-gray-300 transition-colors border border-transparent hover:border-gray-700"
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:block">History</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-bg-card border border-gray-700 rounded-md shadow-xl overflow-hidden z-50">
                    <div className="px-4 py-2 border-b border-gray-700 bg-gray-900">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Analyses</h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {history.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onLoadHistory(item);
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors flex flex-col gap-1 last:border-0"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-medium">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                            <span className={`text-xs font-bold ${getScoreColor(item.risk_score)}`}>
                              Score: {item.risk_score}
                            </span>
                          </div>
                          <code className="text-xs text-gray-300 bg-bg-primary px-1.5 py-0.5 rounded truncate block font-mono border border-gray-800">
                            {item.codeSnippet}
                          </code>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}