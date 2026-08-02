import { CheckCircle2, KeyRound } from 'lucide-react';
import { useEffect } from 'react';

export default function ApiKeyInput({ apiKey, setApiKey }) {
  useEffect(() => {
    const saved = localStorage.getItem('securegen_groq_key');
    if (saved) setApiKey(saved);
  }, [setApiKey]);

  const handleChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    if (val) {
      localStorage.setItem('securegen_groq_key', val);
    } else {
      localStorage.removeItem('securegen_groq_key');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8 bg-bg-card p-6 rounded-lg border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Groq API Key</h2>
      </div>
      <div className="flex items-center gap-3">
        <input 
          type="password" 
          value={apiKey} 
          onChange={handleChange}
          placeholder="gsk_..."
          className="flex-1 bg-bg-primary border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-accent-blue font-mono"
        />
        {apiKey && (
          <div className="flex items-center gap-1 text-accent-green bg-accent-green/10 px-3 py-2 rounded-md border border-accent-green/20">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Get a free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">console.groq.com</a>
      </p>
    </div>
  );
}