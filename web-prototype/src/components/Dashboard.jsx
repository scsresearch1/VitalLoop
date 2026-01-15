import { motion } from 'framer-motion'
import { Heart, Activity, Moon, TrendingUp, Zap, Shield, Play } from 'lucide-react'
import MetricCard from './MetricCard'
import QuickStats from './QuickStats'
import HealthRing from './HealthRing'
import AIOutputs from './MLOutputs'

const Dashboard = ({ data }) => {
  // Determine which metrics need attention (low values)
  const needsAttention = (value, threshold, isHigherBetter = true) => {
    return isHigherBetter ? value < threshold : value > threshold
  }

  const metrics = [
    {
      icon: Heart,
      label: 'Heart Rate',
      value: data.currentHR,
      unit: 'bpm',
      trend: '+2',
      color: 'from-red-500 to-pink-500',
      glow: 'glow-pink',
      backgroundImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&q=80', // Heart rate monitor with pulse
      needsAttention: needsAttention(data.currentHR, 60, false) || data.currentHR > 100, // Too low or too high
    },
    {
      icon: Activity,
      label: 'Steps',
      value: data.steps,
      unit: '',
      trend: '+1.2k',
      color: 'from-blue-500 to-cyan-500',
      glow: 'glow-cyan',
      backgroundImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', // Running shoes and fitness trackers
      needsAttention: needsAttention(data.steps, 5000), // Less than 5000 steps
    },
    {
      icon: Moon,
      label: 'Sleep',
      value: data.sleepHours,
      unit: 'hrs',
      trend: '+0.5',
      color: 'from-purple-500 to-indigo-500',
      glow: 'glow',
      backgroundImage: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80', // Peaceful bedroom with soft lighting
      needsAttention: needsAttention(data.sleepHours, 7), // Less than 7 hours
    },
    {
      icon: TrendingUp,
      label: 'Recovery',
      value: data.recovery,
      unit: '%',
      trend: '+5',
      color: 'from-green-500 to-emerald-500',
      glow: '',
      backgroundImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80', // Person meditating for recovery
      needsAttention: needsAttention(data.recovery, 80), // Less than 80%
    },
  ]

  // Get user name from data or use default
  const userName = data.userName || 'John'
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="min-h-screen pb-28">
      {/* The Daily Focus Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative h-[220px] sm:h-[260px] md:h-[300px] mb-4 sm:mb-5 md:mb-6 mx-3 sm:mx-4 md:mx-5 rounded-2xl sm:rounded-3xl overflow-hidden cinematic-card"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80)`, // Runner stretching/warming up
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
        
        {/* Gradient overlay blending into grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-cyan-900/40" />
        
        <div className="cinematic-card-content h-full flex items-center px-4 sm:px-6 md:px-8">
          {/* Left Side - Text and Button */}
          <div className="flex-1 z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                {getGreeting()}, {userName}.
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white/90 mb-3 sm:mb-4 md:mb-5 lg:mb-6 font-medium">
                Ready to crush your cardio?
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm sm:text-base md:text-lg shadow-2xl shadow-purple-500/50 neon-pink hover:from-purple-600 hover:to-pink-600 transition-all"
                onClick={() => {
                  // Navigate to workout tab - you can implement navigation logic here
                  console.log('Start Workout clicked')
                }}
              >
                <Play className="w-6 h-6" />
                <span>Start Workout</span>
              </motion.button>
            </motion.div>
          </div>

          {/* Right Side - Runner Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden md:block flex-1 relative z-10 h-full"
          >
            <div className="absolute right-0 bottom-0 h-full w-full max-w-md">
              <img
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80"
                alt="Runner stretching"
                className="h-full w-full object-contain object-right-bottom"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.5))',
                }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Health Ring - Main Focus - Bigger and bolder */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.4 }}
        className="mb-4 sm:mb-6 md:mb-8 flex justify-center px-3 sm:px-4 md:px-5"
      >
        <HealthRing
          stressScore={data.stressScore}
          illnessRisk={data.illnessRisk}
          overallHealth={data.overallHealth}
        />
      </motion.div>

      {/* Quick Stats - More prominent */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mb-4 sm:mb-5 md:mb-6 px-3 sm:px-4 md:px-5"
      >
        <QuickStats data={data} />
      </motion.div>

      {/* AI Outputs Section - Prominent Display */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mb-8"
      >
        <AIOutputs mlOutputs={data.mlOutputs} />
      </motion.div>

      {/* Metrics Grid - Better spacing with horizontal scroll */}
      <div className="mb-8">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
          className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 px-3 sm:px-4 md:px-5"
        >
          Today's Metrics
        </motion.h2>
        <div className="flex gap-3 sm:gap-4 px-3 sm:px-4 md:px-5 overflow-x-auto pb-3 sm:pb-4 scrollbar-hide">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 1.0 + index * 0.1,
                type: "spring",
                stiffness: 200
              }}
              className="flex-shrink-0 w-36 sm:w-40 md:w-44"
            >
              <MetricCard {...metric} needsAttention={metric.needsAttention} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Insights Cards - More exciting with image backgrounds */}
      <div className="px-5">
        <motion.h2 
          className="text-3xl font-bold text-white mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2 }}
        >
          AI Insights <span className="gradient-text">🧠</span>
        </motion.h2>
        
        <div className="space-y-4">
          {data.insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: 1.3 + index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="glass-card rounded-3xl overflow-hidden border border-white/10 hover:border-purple-400/40 transition-all duration-300 card-hover group relative"
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${insight.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              
              <div className="relative z-10 p-6">
                <div className="flex items-start gap-5">
                  <motion.div 
                    className={`p-4 rounded-2xl bg-gradient-to-br ${insight.color} neon-purple group-hover:scale-110 transition-transform`}
                    whileHover={{ rotate: 5 }}
                  >
                    {insight.icon === 'zap' && <Zap className="w-6 h-6 text-white" />}
                    {insight.icon === 'shield' && <Shield className="w-6 h-6 text-white" />}
                    {insight.icon === 'trending' && <TrendingUp className="w-6 h-6 text-white" />}
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 text-white">{insight.title}</h3>
                    <p className="text-white/70 text-base leading-relaxed mb-4">{insight.message}</p>
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
      </div>
    </div>
  )
}

export default Dashboard
