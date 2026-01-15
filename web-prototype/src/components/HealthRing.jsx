import { motion } from 'framer-motion'
import { useMemo } from 'react'

const HealthRing = ({ stressScore, illnessRisk, overallHealth }) => {
  const ringSize = 200
  const strokeWidth = 12
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const healthOffset = useMemo(() => {
    return circumference - (overallHealth / 100) * circumference
  }, [overallHealth, circumference])

  const stressOffset = useMemo(() => {
    return circumference - (stressScore / 100) * circumference
  }, [stressScore, circumference])

  const getHealthColor = (score) => {
    if (score >= 80) return 'from-green-400 to-emerald-500'
    if (score >= 60) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-pink-500'
  }

  const getHealthStatus = (score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Attention'
  }

  return (
    <div className="flex justify-center mb-6">
      <motion.div 
        className="relative glass-card rounded-3xl p-8 border border-white/10"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {/* Outer Ring - Overall Health - Bigger */}
        <svg
          width={ringSize + 40}
          height={ringSize + 40}
          className="transform -rotate-90"
        >
          {/* Background Circle */}
          <circle
            cx={(ringSize + 40) / 2}
            cy={(ringSize + 40) / 2}
            r={radius + 10}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth + 2}
            fill="none"
          />
          {/* Health Progress Circle */}
          <motion.circle
            cx={(ringSize + 40) / 2}
            cy={(ringSize + 40) / 2}
            r={radius + 10}
            stroke="url(#healthGradient)"
            strokeWidth={strokeWidth + 2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference + 62.8}
            initial={{ strokeDashoffset: circumference + 62.8 }}
            animate={{ strokeDashoffset: (circumference + 62.8) - ((overallHealth / 100) * (circumference + 62.8)) }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner Content - More prominent */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.5, type: "spring", bounce: 0.5 }}
            className="text-center"
          >
            <div className="text-7xl font-bold text-white mb-2 leading-none">
              {overallHealth}
            </div>
            <div className="text-lg text-white/80 font-bold uppercase tracking-wide">
              {getHealthStatus(overallHealth)}
            </div>
          </motion.div>
        </div>

        {/* Stress Indicator - Small ring */}
        <div className="absolute -bottom-2 -right-2">
          <svg width={80} height={80} className="transform -rotate-90">
            <circle
              cx={40}
              cy={40}
              r={30}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={4}
              fill="none"
            />
            <motion.circle
              cx={40}
              cy={40}
              r={30}
              stroke="url(#stressGradient)"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 30}
              initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 30 - (stressScore / 100) * 2 * Math.PI * 30 }}
              transition={{ duration: 1.5, delay: 0.3 }}
            />
            <defs>
              <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-pink-400">
            {stressScore}
          </div>
        </div>

        {/* Illness Risk Badge - More prominent */}
        {illnessRisk > 30 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.7, type: "spring" }}
            className="absolute -top-3 -left-3 glass-strong rounded-full px-4 py-2 text-sm font-bold text-orange-400 border-2 border-orange-400/60 glow-orange"
          >
            ⚠️ Risk: {illnessRisk}%
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default HealthRing
