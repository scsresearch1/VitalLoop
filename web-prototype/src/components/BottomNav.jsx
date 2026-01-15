import { motion } from 'framer-motion'
import { LayoutDashboard, BarChart3, Brain, User, Play } from 'lucide-react'

const BottomNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'workout', icon: Play, label: 'Workout' },
    { id: 'metrics', icon: BarChart3, label: 'Metrics' },
    { id: 'insights', icon: Brain, label: 'Insights' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring" }}
      className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 p-5 z-50 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl transition-all relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl border border-purple-400/50 neon-purple"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1.3 : 1,
                }}
                transition={{ duration: 0.3, type: "spring" }}
                className="relative z-10"
              >
                <tab.icon 
                  className={`w-6 h-6 ${isActive ? 'text-white' : 'text-white/40'}`}
                />
              </motion.div>
              <span
                className={`text-xs relative z-10 transition-all duration-200 ${isActive ? 'text-white font-bold text-[13px]' : 'text-white/50 font-medium text-[11px]'}`}
              >
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default BottomNav
