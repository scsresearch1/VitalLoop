import { motion } from 'framer-motion'

const MetricCard = ({ icon: Icon, label, value, unit, trend, color, glow, backgroundImage, needsAttention = false }) => {
  const cardStyle = backgroundImage ? {
    backgroundImage: `url(${backgroundImage})`,
  } : {}

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className={`${backgroundImage ? 'cinematic-card' : 'glass-card'} rounded-3xl p-5 border border-white/10 hover:border-white/30 transition-all duration-300 card-hover group relative overflow-hidden h-full`}
      style={cardStyle}
    >
      {/* Animated background gradient with neon effect (only if no background image) */}
      {!backgroundImage && (
        <>
          <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
          <div className={`absolute inset-0 ${glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </>
      )}
      
      <div className="cinematic-card-content">
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            className={`p-3.5 rounded-2xl bg-gradient-to-br ${color} ${glow} group-hover:scale-110 transition-transform relative`}
            whileHover={{ rotate: 10 }}
          >
            {/* Glow Pulse Effect for metrics needing attention */}
            {needsAttention && (
              <motion.div 
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color}`}
                style={{
                  filter: 'blur(12px)',
                  zIndex: -1,
                }}
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
            <Icon className="w-6 h-6 text-white relative z-10" />
          </motion.div>
          {trend && (
            <motion.span 
              className="text-xs font-bold text-green-400 bg-green-400/20 px-3 py-1.5 rounded-full border border-green-400/40"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              {trend}
            </motion.span>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-4xl font-bold text-white leading-none">
            {value}
            {unit && <span className="text-xl text-white/60 ml-1 font-medium">{unit}</span>}
          </div>
          <div className="text-sm text-white/50 font-semibold uppercase tracking-wide">{label}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default MetricCard
