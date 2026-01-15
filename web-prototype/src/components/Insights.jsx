import { motion } from 'framer-motion'
import { Brain, Sparkles, Target, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import AIOutputs from './MLOutputs'

const Insights = ({ data }) => {
  const mlOutputs = data.mlOutputs || {}
  const mlInsights = [
    {
      type: 'stress',
      title: 'Stress Level: Moderate',
      score: data.stressScore,
      message: 'Your stress levels are manageable today. Consider a 10-minute meditation break.',
      color: 'from-yellow-500 to-orange-500',
      icon: AlertTriangle,
      action: 'Try meditation',
      isPositive: false, // Moderate stress - neutral/negative
    },
    {
      type: 'illness',
      title: 'Illness Risk: Low',
      score: data.illnessRisk,
      message: 'No signs of illness detected. Your body is in good shape!',
      color: 'from-green-500 to-emerald-500',
      icon: CheckCircle,
      action: null,
      isPositive: true, // Low risk is positive
    },
    {
      type: 'sleep',
      title: 'Sleep Optimization',
      score: 85,
      message: 'Your optimal bedtime is 10:30 PM tonight for best recovery.',
      color: 'from-purple-500 to-indigo-500',
      icon: Target,
      action: 'Set reminder',
      isPositive: true, // Good sleep optimization is positive
    },
    {
      type: 'recovery',
      title: 'Recovery Status',
      score: data.recovery,
      message: 'You\'re 75% recovered. Light activity recommended today.',
      color: 'from-blue-500 to-cyan-500',
      icon: TrendingUp,
      action: 'View plan',
      isPositive: data.recovery >= 70, // 70%+ is positive
    },
  ]

  return (
    <div className="min-h-screen pb-28">
      {/* Hero Header with Digital Brain Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-64 mb-8 mx-5 rounded-3xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-cyan-900">
          {/* Digital Brain Visualization - Abstract 3D nodes */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            {/* Glowing nodes */}
            {[...Array(12)].map((_, i) => {
              const x = 50 + (i % 4) * 100
              const y = 50 + Math.floor(i / 4) * 100
              return (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="8"
                  fill="url(#nodeGradient)"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2 + i * 0.2,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              )
            })}
            
            {/* Connections between nodes */}
            <motion.path
              d="M 50 50 L 150 50 L 250 50 L 350 50 M 50 150 L 150 150 L 250 150 L 350 150 M 50 250 L 150 250 L 250 250 L 350 250 M 50 50 L 50 150 L 50 250 M 150 50 L 150 150 L 150 250 M 250 50 L 250 150 L 250 250 M 350 50 L 350 150 L 350 250"
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 2, delay: 0.5 }}
            />
            
            <defs>
              <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-end px-8 pb-8">
          <motion.h1 
            className="text-5xl font-bold text-white leading-tight mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            AI Insights
          </motion.h1>
          <motion.p 
            className="text-white/80 text-lg font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Powered by <span className="text-cyan-400 font-bold">advanced AI</span>
          </motion.p>
        </div>
      </motion.div>

      {/* AI Outputs Section - Detailed View */}
      {mlOutputs && Object.keys(mlOutputs).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <AIOutputs mlOutputs={mlOutputs} />
        </motion.div>
      )}

      {/* AI Insights Cards */}
      <div className="px-5 space-y-4">
        {mlInsights.map((insight, index) => (
          <motion.div
            key={insight.type}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6, 
              delay: 1.0 + index * 0.1,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ scale: 1.01, y: -2 }}
            className={`glass-card rounded-3xl overflow-hidden border-2 transition-all duration-300 card-hover group relative ${
              insight.isPositive 
                ? 'border-green-500/50 hover:border-green-400/80 shadow-lg shadow-green-500/20' 
                : 'border-red-500/50 hover:border-red-400/80 shadow-lg shadow-red-500/20'
            }`}
          >
            {/* Color-coded glow effect */}
            <div className={`absolute inset-0 rounded-3xl ${
              insight.isPositive 
                ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5' 
                : 'bg-gradient-to-br from-red-500/10 to-pink-500/5'
            } opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative z-10 p-6">
              <div className="flex items-start gap-6">
                {/* Large icon in glass circle */}
                <motion.div 
                  className={`p-5 rounded-full bg-white/10 backdrop-blur-xl border-2 border-white/20 group-hover:scale-110 transition-transform ${
                    insight.isPositive ? 'shadow-lg shadow-green-500/30' : 'shadow-lg shadow-red-500/30'
                  }`}
                  whileHover={{ rotate: 5 }}
                >
                  <insight.icon className={`w-10 h-10 text-white ${
                    insight.isPositive ? 'drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                  }`} />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-white">{insight.title}</h3>
                    <div className="text-2xl font-bold text-white/90">{insight.score}%</div>
                  </div>
                  <p className="text-white/70 mb-4 leading-relaxed">{insight.message}</p>
                  {insight.action && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/50 neon-pink"
                    >
                      {insight.action} →
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.4 }}
        className="mt-8 mx-5 glass-card rounded-3xl p-6 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-lg text-white">How It Works</h3>
        </div>
        <p className="text-white/70 text-sm leading-relaxed">
          Our advanced AI analyzes your health data (Heart Rate, Heart Rhythm, Blood Oxygen, Blood Pressure, Temperature, Sleep) 
          to provide personalized insights. The AI learns your unique patterns and detects changes before 
          they become problems.
        </p>
      </motion.div>
    </div>
  )
}

export default Insights
