import { useEffect, useState } from 'react';
import VulnerabilityCard from './VulnerabilityCard';
import SecureVersion from './SecureVersion';
import { Download } from 'lucide-react';
import { downloadReport } from '../utils/export';

import { motion } from 'framer-motion';

function RiskGauge({ score }) {
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFill(score), 300);
    return () => clearTimeout(t);
  }, [score]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fill / 100) * circumference;

  let colorClass = 'text-accent-green';
  let strokeColor = '#10B981'; 
  if (score > 20) { colorClass = 'text-accent-amber'; strokeColor = '#F59E0B'; }
  if (score > 50) { colorClass = 'text-accent-orange'; strokeColor = '#F97316'; }
  if (score > 80) { colorClass = 'text-accent-red'; strokeColor = '#f43f5e'; }

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          fill="transparent" 
          stroke={strokeColor} 
          strokeWidth="8" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${strokeColor}80)` }}
        />
      </svg>
      <div className={`absolute text-3xl font-black ${colorClass} tracking-tighter`} style={{ textShadow: `0 0 20px ${strokeColor}40` }}>
        {score}
      </div>
    </div>
  );
}

export default function AnalysisResult({ result, duration, language, originalCode }) {
  const getBadgeColor = (risk) => {
    switch(risk?.toLowerCase()) {
      case 'critical': return 'bg-accent-red/10 text-accent-red border-accent-red/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
      case 'high': return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
      case 'medium': return 'bg-accent-amber/10 text-accent-amber border-accent-amber/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
      case 'low': return 'bg-accent-green/10 text-accent-green border-accent-green/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
      case 'safe': return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const sortedVulns = [...(result.vulnerabilities || [])].sort((a, b) => 
    (severityOrder[b.severity?.toLowerCase()] || 0) - (severityOrder[a.severity?.toLowerCase()] || 0)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto mt-12 space-y-8"
    >
      {/* Header Card */}
      <div className="glass-panel rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>
        
        <button
          onClick={() => downloadReport(result, originalCode, language)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md border border-glass-border backdrop-blur-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Download Report
        </button>
        
        <RiskGauge score={result.risk_score || 0} />
        <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
            <h2 className="text-2xl font-semibold text-white">Security Posture</h2>
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getBadgeColor(result.overall_risk)}`}>
              {result.overall_risk}
            </span>
          </div>
          <p className="text-lg text-gray-300 mb-2 sm:pr-24">{result.summary}</p>
          <p className="text-xs text-gray-500">Analyzed in {duration.toFixed(2)}s</p>
        </div>
      </div>

      {/* Vulnerabilities */}
      {sortedVulns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white px-1">Detected Vulnerabilities</h3>
          {sortedVulns.map((vuln, i) => (
            <VulnerabilityCard key={vuln.id || i} vuln={vuln} />
          ))}
        </div>
      )}

      {/* Secure Version */}
      <SecureVersion result={result} language={language} originalCode={originalCode} />
    </motion.div>
  );
}