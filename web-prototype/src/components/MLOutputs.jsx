import { motion } from 'framer-motion'
import { Brain, AlertTriangle, Moon, TrendingUp, Activity, Heart, Wind, Gauge } from 'lucide-react'

const AIOutputs = ({ mlOutputs }) => {
  const getStressColor = (score) => {
    if (score < 30) return 'from-green-500 to-emerald-500'
    if (score < 60) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  const getRiskColor = (score) => {
    if (score < 20) return 'from-green-500 to-emerald-500'
    if (score < 40) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  const getANSStateColor = (state) => {
    switch(state) {
      case 'rest': return 'from-green-500 to-emerald-500'
      case 'stress': return 'from-red-500 to-pink-500'
      case 'recovery': return 'from-blue-500 to-cyan-500'
      case 'overreaching': return 'from-orange-500 to-red-500'
      default: return 'from-purple-500 to-indigo-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Outputs Header */}
      <div className="flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 neon-purple">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">AI Predictions</h2>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
          <span className="text-xs font-bold text-green-400">LIVE</span>
        </div>
      </div>

      {/* Stress & Illness Row */}
      <div className="grid grid-cols-2 gap-4 px-5">
        {/* Stress Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="cinematic-card rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80)`, // Mountain landscape for stress relief and calm
          }}
        >
          <div className="cinematic-card-content">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Stress</span>
            </div>
            <span className="text-xs font-bold text-green-400 bg-green-400/20 px-2 py-1 rounded-full">
              {mlOutputs.stressTrend}
            </span>
          </div>
            <div className="relative">
              <div className="text-4xl font-bold text-white mb-1">{mlOutputs.stressScore}</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mlOutputs.stressScore}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className={`h-full bg-gradient-to-r ${getStressColor(mlOutputs.stressScore)} rounded-full`}
                />
              </div>
            </div>
            <div className="mt-3 text-xs text-white/50">
              Recovery in: <span className="text-white font-semibold">{mlOutputs.recoveryTime}</span>
            </div>
          </div>
        </motion.div>

        {/* Illness Risk */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="cinematic-card rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=80)`, // Medical stethoscope and health checkup
          }}
        >
          <div className="cinematic-card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Illness Risk</span>
            </div>
            {mlOutputs.illnessRisk < 20 && (
              <span className="text-xs font-bold text-green-400 bg-green-400/20 px-2 py-1 rounded-full">
                Low
              </span>
            )}
          </div>
          <div className="relative">
            <div className="text-4xl font-bold text-white mb-1">{mlOutputs.illnessRisk}%</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mlOutputs.illnessRisk}%` }}
                transition={{ duration: 1, delay: 0.4 }}
                className={`h-full bg-gradient-to-r ${getRiskColor(mlOutputs.illnessRisk)} rounded-full`}
              />
            </div>
          </div>
            {mlOutputs.illnessType && (
              <div className="mt-3 text-xs text-white/50">
                Type: <span className="text-white font-semibold capitalize">{mlOutputs.illnessType}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sleep Optimization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="cinematic-card rounded-3xl p-6 mx-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80)`, // Starry night sky for optimal sleep timing
        }}
      >
        <div className="cinematic-card-content">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 neon-purple">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Sleep Optimization</h3>
            <p className="text-sm text-white/60">AI-Predicted Optimal Sleep</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{mlOutputs.sleepReadiness}</div>
            <div className="text-xs text-white/50">Readiness</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-2">Optimal Bedtime</div>
            <div className="text-xl font-bold text-white">{mlOutputs.optimalBedtime}</div>
            <div className="text-xs text-white/40 mt-1">{mlOutputs.sleepWindow.start} - {mlOutputs.sleepWindow.end}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-2">Predicted Quality</div>
            <div className="text-xl font-bold text-white">{mlOutputs.predictedSleepQuality}%</div>
            <div className="text-xs text-white/40 mt-1">Expected score</div>
          </div>
        </div>
        </div>
      </motion.div>

      {/* Recovery & Nervous System Balance */}
      <div className="grid grid-cols-2 gap-4 px-5">
        {/* Recovery Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="cinematic-card rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80)`, // Wellness and recovery visualization
          }}
        >
          <div className="cinematic-card-content">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Recovery</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{mlOutputs.recoveryScore}%</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mlOutputs.recoveryScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              />
            </div>
            <div className="text-xs text-white/50">
              Back to normal in: <span className="text-white font-semibold">{mlOutputs.hoursToBaseline}h</span>
            </div>
          </div>
        </motion.div>

        {/* Nervous System Balance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="cinematic-card rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80)`, // Abstract neural network/brain visualization
          }}
        >
          <div className="cinematic-card-content">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold text-white/70 uppercase tracking-wide">Nervous System</span>
          </div>
          <div className="text-xl font-bold text-white mb-3 capitalize">
            {mlOutputs.ansState === 'rest' ? 'Resting' : 
             mlOutputs.ansState === 'stress' ? 'Stressed' :
             mlOutputs.ansState === 'recovery' ? 'Recovering' :
             mlOutputs.ansState === 'overreaching' ? 'Overworked' : mlOutputs.ansState}
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">Stress Response</span>
                <span className="text-white font-semibold">{mlOutputs.sympatheticBalance}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mlOutputs.sympatheticBalance}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">Rest & Recovery</span>
                <span className="text-white font-semibold">{mlOutputs.parasympatheticBalance}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mlOutputs.parasympatheticBalance}%` }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      </div>

      {/* Health Risk Scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-3xl p-6 mx-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
      >
        <h3 className="text-lg font-bold text-white mb-5">Health Risk Assessment</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(mlOutputs.healthRisks).map(([key, value], index) => {
            const riskLabels = {
              cardiovascular: 'Heart Health',
              metabolic: 'Metabolism',
              respiratory: 'Breathing',
              immune: 'Immune System',
            }
            return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                  {riskLabels[key] || key}
                </span>
                <span className={`text-lg font-bold ${value < 20 ? 'text-green-400' : value < 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {value}%
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                  className={`h-full bg-gradient-to-r ${getRiskColor(value)} rounded-full`}
                />
              </div>
            </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Heart & Lungs Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-3 px-5"
      >
        <div className="glass-card rounded-xl p-4 border border-white/10 text-center">
          <Wind className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{mlOutputs.respiratoryRate}</div>
          <div className="text-xs text-white/50 mt-1">Breathing Rate</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/10 text-center">
          <Gauge className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{(mlOutputs.hrSpo2Coherence * 100).toFixed(0)}%</div>
          <div className="text-xs text-white/50 mt-1">Heart-Breath Balance</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/10 text-center">
          <Heart className="w-5 h-5 text-pink-400 mx-auto mb-2" />
          <div className="text-lg font-bold text-white capitalize">{mlOutputs.perfusionQuality}</div>
          <div className="text-xs text-white/50 mt-1">Blood Flow</div>
        </div>
      </motion.div>
    </div>
  )
}

export default AIOutputs
