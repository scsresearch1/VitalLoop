import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Calendar, Clock, Moon } from 'lucide-react'

const Metrics = ({ data }) => {
  const hrData = data.hrHistory.map((hr, index) => ({
    time: `${index * 5}min`,
    hr: hr,
  }))

  const sleepData = data.sleepHistory.map((sleep, index) => ({
    hour: `${index}:00`,
    quality: sleep.quality,
  }))

  return (
    <div className="min-h-screen pb-28">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-48 mb-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-6">
          <motion.h1 
            className="text-5xl font-bold mb-2 text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Your Metrics
          </motion.h1>
          <motion.p 
            className="text-white/80 text-lg font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Deep dive into your <span className="text-cyan-400 font-bold">health data</span>
          </motion.p>
        </div>
      </motion.div>

      {/* Heart Rate Chart - More exciting */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
        className="cinematic-card rounded-3xl p-6 mb-6 mx-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover relative overflow-hidden"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&q=80)`, // EKG heart monitor with red pulse lines
        }}
      >
        {/* Red pulse gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-pink-900/20 to-transparent" />
        
        <div className="cinematic-card-content relative z-10">
          {/* Metric Header */}
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">Heart Rate</h2>
            <p className="text-white/70 text-lg font-medium">Last 24 hours</p>
          </div>
          
          <div className="flex items-center justify-between mb-5">
            <motion.div 
              className="flex items-center gap-2 text-green-400 bg-green-400/20 px-4 py-2 rounded-xl border border-green-400/30"
              whileHover={{ scale: 1.05 }}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold">+5%</span>
            </motion.div>
          </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={hrData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#ffffff40" fontSize={11} />
            <YAxis stroke="#ffffff40" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '16px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="hr"
              stroke="url(#hrGradient)"
              fill="url(#hrGradientFill)"
              strokeWidth={4}
              dot={false}
            />
            <defs>
              <linearGradient id="hrGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              {/* Vertical gradient fill */}
              <linearGradient id="hrGradientFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Sleep Quality Chart - More exciting */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
        className="cinematic-card rounded-3xl p-6 mb-6 mx-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover relative overflow-hidden"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1522771739844-6a9f47d43b8d?w=1200&q=80)`, // Moonlit bedroom window for sleep quality tracking
        }}
      >
        {/* Blue calm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-transparent" />
        
        <div className="cinematic-card-content relative z-10">
          {/* Metric Header */}
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">Sleep Quality</h2>
            <p className="text-white/70 text-lg font-medium">Last 7 days</p>
          </div>
          
          <div className="flex items-center justify-between mb-5">
            <motion.div 
              className="flex items-center gap-2 text-purple-400 bg-purple-400/20 px-4 py-2 rounded-xl border border-purple-400/30"
              whileHover={{ scale: 1.05 }}
            >
              <Moon className="w-5 h-5" />
              <span className="font-bold">{data.sleepHours}hrs</span>
            </motion.div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={sleepData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" stroke="#ffffff40" fontSize={11} />
            <YAxis stroke="#ffffff40" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '16px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="quality"
              stroke="url(#sleepGradient)"
              fill="url(#sleepGradientFill)"
              strokeWidth={3}
            />
            <defs>
              <linearGradient id="sleepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              {/* Vertical gradient fill - enhanced */}
              <linearGradient id="sleepGradientFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                <stop offset="50%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Workout History */}
      {data.workouts?.history && data.workouts.history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6 px-5"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Recent Workouts</h2>
          <div className="space-y-3">
            {data.workouts.history.map((workout, index) => (
              <motion.div
                key={workout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.01, x: 5 }}
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all card-hover"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{workout.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span>{workout.date}</span>
                      <span>{workout.duration} min</span>
                      {workout.distance && <span>{workout.distance} km</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{workout.calories}</div>
                    <div className="text-xs text-white/50">calories</div>
                  </div>
                </div>
                {workout.avgHR && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4 text-xs text-white/60">
                    <span>Avg HR: <span className="text-white font-semibold">{workout.avgHR} bpm</span></span>
                    {workout.maxHR && <span>Max HR: <span className="text-white font-semibold">{workout.maxHR} bpm</span></span>}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Activity Summary - More exciting */}
      <div className="px-5">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="text-2xl font-bold text-white mb-4"
        >
          Activity Summary
        </motion.h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { label: 'Steps', value: data.steps, color: 'from-cyan-500 to-blue-500' },
            { label: 'Calories', value: data.calories, color: 'from-pink-500 to-purple-500' },
            { label: 'km', value: data.distance, color: 'from-orange-500 to-pink-500' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.1, type: "spring" }}
              whileHover={{ scale: 1.05, y: -3 }}
              className={`flex-shrink-0 glass-card rounded-2xl p-5 text-center border border-white/10 hover:border-white/30 transition-all card-hover w-32`}
            >
              <div className={`text-3xl font-bold text-white mb-2 leading-none`}>{item.value}</div>
              <div className="text-sm text-white/60 font-semibold uppercase tracking-wide">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Metrics
