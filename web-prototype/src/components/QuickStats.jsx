import { motion } from 'framer-motion'
import { Droplet, Wind, Thermometer, Gauge } from 'lucide-react'

const QuickStats = ({ data }) => {
  const stats = [
    {
      icon: Droplet,
      label: 'SpO₂',
      value: data.spo2,
      unit: '%',
      color: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Gauge,
      label: 'BP',
      value: `${data.bp.systolic}/${data.bp.diastolic}`,
      unit: '',
      color: 'from-red-400 to-pink-500',
    },
    {
      icon: Thermometer,
      label: 'Temp',
      value: data.temperature,
      unit: '°C',
      color: 'from-orange-400 to-red-500',
    },
    {
      icon: Wind,
      label: 'HRV',
      value: data.hrv,
      unit: 'ms',
      color: 'from-purple-400 to-indigo-500',
    },
  ]

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.5, x: 30 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: index * 0.1,
            type: "spring",
            stiffness: 200
          }}
          whileHover={{ scale: 1.05, y: -3 }}
          className="flex-shrink-0 glass-card rounded-2xl p-4 text-center border border-white/10 hover:border-white/30 transition-all card-hover group w-24"
        >
          <motion.div 
            className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-3 group-hover:scale-110 transition-transform neon-purple`}
            whileHover={{ rotate: 10 }}
          >
            <stat.icon className="w-5 h-5 text-white" />
          </motion.div>
          <div className="text-lg font-bold text-white leading-tight">
            {stat.value}
            {stat.unit && <span className="text-xs text-white/60 ml-0.5">{stat.unit}</span>}
          </div>
          <div className="text-xs text-white/50 mt-1.5 font-semibold uppercase tracking-wide">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  )
}

export default QuickStats
