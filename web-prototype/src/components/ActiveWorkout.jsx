import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Square, Timer, Zap, Flame, Activity, Heart } from 'lucide-react'

const ActiveWorkout = ({ workout = {}, onStop }) => {
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentHR, setCurrentHR] = useState(72)
  const [calories, setCalories] = useState(0)
  const [distance, setDistance] = useState(0)
  const [steps, setSteps] = useState(0)

  // Ensure workout has required properties
  const workoutData = {
    name: workout?.name || 'Workout',
    description: workout?.description || 'Active workout session',
    id: workout?.id || 'general',
    ...workout
  }

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
        // Simulate real-time metrics
        setCurrentHR(prev => {
          const change = Math.floor(Math.random() * 3) - 1
          const newHR = prev + change
          // Keep HR in reasonable range (60-200)
          return Math.max(60, Math.min(200, newHR))
        })
        setCalories(prev => prev + Math.random() * 0.5)
        setDistance(prev => prev + Math.random() * 0.01)
        setSteps(prev => prev + Math.floor(Math.random() * 2))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isPaused])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getHRZone = (hr) => {
    // Simplified HR zones (adjust based on age/max HR)
    if (hr < 100) return { zone: 'Rest', color: 'text-green-400' }
    if (hr < 130) return { zone: 'Fat Burn', color: 'text-blue-400' }
    if (hr < 150) return { zone: 'Cardio', color: 'text-yellow-400' }
    if (hr < 170) return { zone: 'Peak', color: 'text-orange-400' }
    return { zone: 'Max', color: 'text-red-400' }
  }

  const hrZone = getHRZone(currentHR)

  return (
    <div className="min-h-screen pb-28 bg-black">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">{workoutData.name}</h1>
            <p className="text-white/60 text-sm">{workoutData.description}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onStop}
            className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 transition-colors"
          >
            <Square className="w-6 h-6 text-red-400" />
          </motion.button>
        </div>
      </motion.div>

      {/* Main Timer Display */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="flex justify-center mb-8"
      >
        <div className="glass-card rounded-3xl p-8 border border-white/10 text-center">
          <div className="text-6xl font-bold gradient-text mb-2 font-mono">
            {formatTime(elapsedTime)}
          </div>
          <div className="flex items-center justify-center gap-2 text-white/60">
            <Timer className="w-4 h-4" />
            <span className="text-sm">Elapsed Time</span>
          </div>
        </div>
      </motion.div>

      {/* Real-time Metrics */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Heart Rate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-5 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-red-400" />
              <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Heart Rate</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{currentHR}</div>
            <div className={`text-sm font-semibold ${hrZone.color}`}>{hrZone.zone}</div>
            <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
              <motion.div
                animate={{ width: `${Math.min((currentHR / 200) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full"
              />
            </div>
          </motion.div>

          {/* Calories */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-5 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Calories</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">{Math.floor(calories)}</div>
            <div className="text-sm text-white/50">kcal burned</div>
          </motion.div>

          {/* Distance (if applicable) */}
          {(workoutData.id === 'running' || workoutData.id === 'cycling' || workoutData.id === 'walking') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card rounded-2xl p-5 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Distance</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{distance.toFixed(2)}</div>
              <div className="text-sm text-white/50">km</div>
            </motion.div>
          )}

          {/* Steps (if applicable) */}
          {(workoutData.id === 'running' || workoutData.id === 'walking') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-2xl p-5 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Steps</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{steps}</div>
              <div className="text-sm text-white/50">steps</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Insights During Workout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-5 mb-6"
      >
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">AI Insights</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Workout Intensity</span>
              <span className="text-sm font-bold text-yellow-400">Optimal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Recovery Status</span>
              <span className="text-sm font-bold text-green-400">Good</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">HR Zone</span>
              <span className={`text-sm font-bold ${hrZone.color}`}>{hrZone.zone}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Control Buttons */}
      <div className="fixed bottom-24 left-0 right-0 px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-6"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsPaused(!isPaused)}
            className={`p-6 rounded-full ${
              isPaused 
                ? 'bg-gradient-to-br from-green-500 to-emerald-500 neon-cyan' 
                : 'bg-gradient-to-br from-purple-500 to-pink-500 neon-pink'
            } shadow-2xl`}
          >
            {isPaused ? (
              <Play className="w-8 h-8 text-white" />
            ) : (
              <Pause className="w-8 h-8 text-white" />
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export default ActiveWorkout
