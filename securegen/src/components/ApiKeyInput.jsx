import { CheckCircle2, Key, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ApiKeyInput({ apiKey, setApiKey }) {
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('securegen_gemini_key');
    if (saved) setApiKey(saved);
  }, [setApiKey]);

  const handleChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    if (val) {
      localStorage.setItem('securegen_gemini_key', val);
    } else {
      localStorage.removeItem('securegen_gemini_key');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8 bg-bg-card p-6 rounded-lg border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
          <Key className="w-4 h-4 text-accent-orange" />
          Gemini API Key
        </label>
        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-text-muted hover:text-accent-orange flex items-center gap-1 transition-colors"
        >
          Get a free key <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="relative group">
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={handleChange}
          placeholder="AIzaSy..."
          className="w-full bg-bg-primary border border-border-default rounded-lg py-3 px-4 text-sm text-white placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-orange/50 focus:border-accent-orange transition-all duration-200"
        />
        {apiKey && (
          <div className="absolute right-2 top-2 flex items-center gap-1 text-accent-green bg-accent-green/10 px-3 py-1 rounded-md border border-accent-green/20">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>
    </div>
  );
}