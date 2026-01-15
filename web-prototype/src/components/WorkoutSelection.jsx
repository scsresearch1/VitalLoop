import { motion } from 'framer-motion'
import { Play, Footprints, Dumbbell, Bike, Waves, Activity, Zap, Clock, Flame } from 'lucide-react'

// Icon mapping for recent workouts
const iconMap = {
  Running: Footprints,
  Dumbbell: Dumbbell,
  Bike: Bike,
  Waves: Waves,
  Activity: Activity,
  Zap: Zap,
}

const WorkoutSelection = ({ onStartWorkout, data = {} }) => {
  const workoutTypes = [
    {
      id: 'running',
      name: 'Running',
      icon: Footprints,
      color: 'from-red-500 to-pink-500',
      duration: '30 min',
      calories: '~300',
      intensity: 'High',
      description: 'Outdoor or treadmill running',
      backgroundImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', // Running shoes
    },
    {
      id: 'cycling',
      name: 'Cycling',
      icon: Bike,
      color: 'from-blue-500 to-cyan-500',
      duration: '45 min',
      calories: '~400',
      intensity: 'Moderate',
      description: 'Indoor or outdoor cycling',
      backgroundImage: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', // Cycling
    },
    {
      id: 'strength',
      name: 'Strength Training',
      icon: Dumbbell,
      color: 'from-purple-500 to-indigo-500',
      duration: '60 min',
      calories: '~250',
      intensity: 'Moderate',
      description: 'Weight training & resistance',
      backgroundImage: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80', // Dumbbells and weights
    },
    {
      id: 'yoga',
      name: 'Yoga',
      icon: Waves,
      color: 'from-green-500 to-emerald-500',
      duration: '30 min',
      calories: '~120',
      intensity: 'Low',
      description: 'Flexibility & mindfulness',
      backgroundImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', // Person in yoga pose
    },
    {
      id: 'hiit',
      name: 'HIIT',
      icon: Zap,
      color: 'from-orange-500 to-red-500',
      duration: '20 min',
      calories: '~250',
      intensity: 'Very High',
      description: 'High-intensity interval training',
      backgroundImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80', // High intensity gym workout
    },
    {
      id: 'walking',
      name: 'Walking',
      icon: Activity,
      color: 'from-cyan-500 to-blue-500',
      duration: '45 min',
      calories: '~180',
      intensity: 'Low',
      description: 'Casual or power walking',
      backgroundImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', // Walking path in nature
    },
  ]

  const recentWorkouts = data.workouts?.recent || []

  return (
    <div className="min-h-screen pb-28">
      {/* Featured Workout Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-[280px] sm:h-[320px] md:h-[400px] mb-4 sm:mb-6 md:mb-8 mx-3 sm:mx-4 md:mx-5 rounded-2xl sm:rounded-3xl overflow-hidden cinematic-card"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80)`, // Gym interior with moody lighting - unique to featured workout
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 z-10" />
        
        {/* Content */}
        <div className="cinematic-card-content h-full flex flex-col justify-end p-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-3">
              Workout of the Day
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
              High Intensity Interval
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 mb-4 sm:mb-5 md:mb-6 max-w-md">
              Push your limits with this intense 20-minute session designed to maximize your calorie burn.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const hiitWorkout = workoutTypes.find(w => w.id === 'hiit')
                if (hiitWorkout) onStartWorkout(hiitWorkout)
              }}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm sm:text-base md:text-lg shadow-2xl shadow-orange-500/50 hover:from-orange-600 hover:to-red-600 transition-all"
            >
              <Play className="w-6 h-6" />
              <span>Start Now</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Start - Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <div className="px-5 mb-6">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl font-bold text-white mb-4"
          >
            Quick Start
          </motion.h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentWorkouts.map((workout, index) => {
              const fullWorkout = workoutTypes.find(w => w.id === workout.id)
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onStartWorkout(fullWorkout || {
                      id: workout.id,
                      name: workout.name,
                      icon: iconMap[workout.icon] || Activity,
                      color: workout.color,
                      duration: workout.duration,
                      description: `${workout.name} workout session`,
                      backgroundImage: fullWorkout?.backgroundImage,
                    })
                  }}
                  className="flex-shrink-0 workout-card rounded-2xl p-4 w-32 h-40"
                  style={{
                    backgroundImage: fullWorkout?.backgroundImage ? `url(${fullWorkout.backgroundImage})` : undefined,
                  }}
                >
                  <div className="workout-card-content h-full flex flex-col justify-between">
                    <div className={`p-2.5 rounded-lg bg-gradient-to-br ${workout.color} shadow-lg`}>
                      {(() => {
                        const IconComponent = iconMap[workout.icon] || Activity
                        return <IconComponent className="w-5 h-5 text-white" />
                      })()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white mb-1 drop-shadow-lg">{workout.name}</div>
                      <div className="text-xs text-white/90 drop-shadow-md">{workout.duration}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Workout Types Grid */}
      <div className="px-3 sm:px-4 md:px-5">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4"
        >
          Select Workout
        </motion.h2>
        
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
          {workoutTypes.map((workout, index) => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.7 + index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartWorkout(workout)}
              className="workout-card p-3 sm:p-4 md:p-5 lg:p-6 h-[220px] sm:h-[240px] md:h-[260px] lg:h-[280px]"
              style={{
                backgroundImage: workout.backgroundImage ? `url(${workout.backgroundImage})` : undefined,
              }}
            >
              <div className="workout-card-content h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <motion.div 
                    className={`p-3 rounded-xl bg-gradient-to-br ${workout.color} shadow-lg`}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <workout.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm"
                  >
                    <Play className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
                
                <div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">{workout.name}</h3>
                  <p className="text-xs sm:text-sm text-white/90 mb-2 sm:mb-3 md:mb-4 drop-shadow-md">{workout.description}</p>
                  
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 text-white/90 font-semibold">
                      <Clock className="w-4 h-4" />
                      <span>{workout.duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/90 font-semibold">
                      <Flame className="w-4 h-4" />
                      <span>{workout.calories}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/70 uppercase tracking-wide font-semibold">Intensity</span>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm ${
                        workout.intensity === 'Very High' ? 'bg-red-500/30 text-red-200 border border-red-400/50' :
                        workout.intensity === 'High' ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50' :
                        workout.intensity === 'Moderate' ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/50' :
                        'bg-green-500/30 text-green-200 border border-green-400/50'
                      }`}>
                        {workout.intensity}
                      </span>
                    </div>
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

export default WorkoutSelection
