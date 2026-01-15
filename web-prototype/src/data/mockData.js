export const mockData = {
  // User info
  userName: 'John Doe',
  userEmail: 'john.doe@example.com',
  
  // Current metrics
  currentHR: 72,
  steps: 8420,
  sleepHours: 7.5,
  recovery: 75,
  stressScore: 35,
  illnessRisk: 15,
  overallHealth: 82,

  // Detailed metrics
  spo2: 98,
  bp: {
    systolic: 120,
    diastolic: 80,
  },
  temperature: 36.6,
  hrv: 45,
  calories: 2150,
  distance: 6.2,

  // Historical data
  hrHistory: [68, 70, 72, 71, 73, 75, 74, 72, 70, 68, 69, 71, 73, 75, 74, 72, 70, 68, 69, 71, 73, 75, 74, 72],
  sleepHistory: [
    { hour: '22:00', quality: 20 },
    { hour: '23:00', quality: 45 },
    { hour: '00:00', quality: 80 },
    { hour: '01:00', quality: 90 },
    { hour: '02:00', quality: 85 },
    { hour: '03:00', quality: 75 },
    { hour: '04:00', quality: 70 },
    { hour: '05:00', quality: 60 },
    { hour: '06:00', quality: 40 },
    { hour: '07:00', quality: 25 },
  ],

  // ML Outputs
  mlOutputs: {
    // Stress Detection
    stressScore: 35,
    stressType: 'low', // low, moderate, high
    stressTrend: 'decreasing',
    recoveryTime: '2 hours',
    
    // Illness Prediction
    illnessRisk: 15,
    illnessType: null, // 'viral', 'respiratory', 'fatigue', null
    timeToSymptom: null, // hours until symptoms (if predicted)
    
    // Sleep Optimization
    sleepReadiness: 85,
    optimalBedtime: '10:30 PM',
    predictedSleepQuality: 88,
    sleepWindow: { start: '10:30 PM', end: '11:00 PM' },
    
    // Recovery Status
    recoveryScore: 75,
    recoveryTrajectory: 'improving',
    hoursToBaseline: 4,
    
    // Health Risk Scores
    healthRisks: {
      cardiovascular: 12,
      metabolic: 8,
      respiratory: 5,
      immune: 15,
    },
    
    // ANS State
    ansState: 'rest', // rest, stress, recovery, overreaching
    sympatheticBalance: 30, // 0-100
    parasympatheticBalance: 70, // 0-100
    
    // Cardiopulmonary
    respiratoryRate: 14,
    hrSpo2Coherence: 0.85,
    perfusionQuality: 'excellent',
    
    // Circadian Rhythm
    chronotype: 'moderate', // early, moderate, late
    circadianPhase: 'afternoon',
    temperatureMinimum: '4:30 AM',
  },

  // Workouts
  workouts: {
    recent: [
      {
        id: 'running',
        name: 'Running',
        icon: 'Running',
        color: 'from-red-500 to-pink-500',
        duration: '30 min',
        lastUsed: '2 days ago',
      },
      {
        id: 'strength',
        name: 'Strength',
        icon: 'Dumbbell',
        color: 'from-purple-500 to-indigo-500',
        duration: '60 min',
        lastUsed: '1 week ago',
      },
    ],
    history: [
      {
        id: 1,
        type: 'running',
        name: 'Morning Run',
        date: '2024-01-15',
        duration: 32,
        calories: 285,
        distance: 5.2,
        avgHR: 145,
        maxHR: 168,
      },
      {
        id: 2,
        type: 'strength',
        name: 'Upper Body',
        date: '2024-01-14',
        duration: 58,
        calories: 320,
        avgHR: 125,
        maxHR: 145,
      },
    ],
  },

  // ML Insights
  insights: [
    {
      title: 'Stress Level: Low',
      message: 'Your stress levels are well-managed today. Keep up the good work!',
      color: 'from-green-500 to-emerald-500',
      glow: '',
      icon: 'shield',
      action: null,
    },
    {
      title: 'Optimal Bedtime',
      message: 'Based on your circadian rhythm, your best sleep window is 10:30 PM - 11:00 PM tonight.',
      color: 'from-purple-500 to-indigo-500',
      glow: 'glow',
      icon: 'trending',
      action: 'Set reminder',
    },
    {
      title: 'Recovery Status',
      message: 'You\'re 75% recovered. Light activity recommended for optimal recovery.',
      color: 'from-blue-500 to-cyan-500',
      glow: 'glow-cyan',
      icon: 'zap',
      action: 'View plan',
    },
  ],
}
