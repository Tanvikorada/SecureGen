import { ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <div className="relative text-center py-16 px-4 mb-8 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-blue/20 rounded-full blur-[100px] pointer-events-none -z-10 animate-blob"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-glass-border bg-white/5 backdrop-blur-md mb-8 text-sm font-medium text-gray-300 shadow-lg"
      >
        <Sparkles className="w-4 h-4 text-accent-amber" />
        AI Code Auditor
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-6 tracking-tight drop-shadow-sm"
      >
        Find the vulnerabilities <br className="hidden sm:block" /> Copilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-red to-orange-500">doesn't warn you about.</span>
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light"
      >
        SecureGen acts as your automated security engineer, instantly scanning AI-generated code for flaws, explaining exploit scenarios, and providing secure alternatives.
      </motion.p>
    </div>
  );
}
