import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import Workout from './components/Workout'
import Metrics from './components/Metrics'
import Insights from './components/Insights'
import Profile from './components/Profile'
import BottomNav from './components/BottomNav'
import { mockData } from './data/mockData'

// Ensure mlOutputs exists in data
if (!mockData.mlOutputs) {
  mockData.mlOutputs = {
    stressScore: 35,
    stressType: 'low',
    stressTrend: 'decreasing',
    recoveryTime: '2 hours',
    illnessRisk: 15,
    illnessType: null,
    timeToSymptom: null,
    sleepReadiness: 85,
    optimalBedtime: '10:30 PM',
    predictedSleepQuality: 88,
    sleepWindow: { start: '10:30 PM', end: '11:00 PM' },
    recoveryScore: 75,
    recoveryTrajectory: 'improving',
    hoursToBaseline: 4,
    healthRisks: {
      cardiovascular: 12,
      metabolic: 8,
      respiratory: 5,
      immune: 15,
    },
    ansState: 'rest',
    sympatheticBalance: 30,
    parasympatheticBalance: 70,
    respiratoryRate: 14,
    hrSpo2Coherence: 0.85,
    perfusionQuality: 'excellent',
    chronotype: 'moderate',
    circadianPhase: 'afternoon',
    temperatureMinimum: '4:30 AM',
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = {
    dashboard: Dashboard,
    workout: Workout,
    metrics: Metrics,
    insights: Insights,
    profile: Profile,
  }

  const ActiveComponent = tabs[activeTab]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background - More dynamic */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ActiveComponent data={mockData} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

export default App
