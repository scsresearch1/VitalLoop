import { motion } from 'framer-motion'
import { User, Settings, Bell, Shield, HelpCircle, LogOut, Trophy, Award, Zap, Target } from 'lucide-react'

const Profile = ({ data = {} }) => {
  const userName = data.userName || 'John Doe'
  const userEmail = data.userEmail || 'john.doe@example.com'
  
  // Achievement badges
  const achievements = [
    { id: 1, name: '7 Day Streak', icon: Zap, color: 'from-yellow-500 to-orange-500', glow: 'shadow-yellow-500/50' },
    { id: 2, name: '100k Steps', icon: Target, color: 'from-blue-500 to-cyan-500', glow: 'shadow-cyan-500/50' },
    { id: 3, name: 'Early Bird', icon: Award, color: 'from-purple-500 to-pink-500', glow: 'shadow-pink-500/50' },
    { id: 4, name: 'Marathon', icon: Trophy, color: 'from-green-500 to-emerald-500', glow: 'shadow-green-500/50' },
  ]
  const menuItems = [
    { icon: User, label: 'Edit Profile', color: 'from-blue-500 to-cyan-500' },
    { icon: Settings, label: 'Settings', color: 'from-purple-500 to-pink-500' },
    { icon: Bell, label: 'Notifications', color: 'from-orange-500 to-red-500' },
    { icon: Shield, label: 'Privacy & Security', color: 'from-green-500 to-emerald-500' },
    { icon: HelpCircle, label: 'Help & Support', color: 'from-indigo-500 to-purple-500' },
    { icon: LogOut, label: 'Sign Out', color: 'from-red-500 to-pink-500' },
  ]

  return (
    <div className="min-h-screen pb-28">
      {/* Cover Photo - Twitter/LinkedIn Style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-64 mb-20 mx-5 rounded-3xl overflow-hidden cinematic-card"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80)`, // Abstract neon geometry/tech pattern
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-cyan-900/40" />
      </motion.div>

      {/* Profile Card with Overlapping Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
        className="mx-5 mb-6"
      >
        {/* Avatar - Overlapping cover photo */}
        <div className="relative -mt-32 mb-6 flex flex-col items-center">
          <motion.div 
            className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-5xl font-bold shadow-2xl shadow-purple-500/50 border-4 border-black z-20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", bounce: 0.5 }}
          >
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </motion.div>
          
          {/* Profile Info */}
          <div className="mt-6 text-center">
            <h2 className="text-4xl font-bold gradient-text mb-2">{userName}</h2>
            <p className="text-white/60 text-base font-medium mb-4">{userEmail}</p>
            <span className="text-sm text-white/50 font-medium">Member since Jan 2024</span>
          </div>
        </div>

        {/* Trophy Case - Achievement Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-3xl p-6 border border-white/10"
        >
          <h3 className="text-2xl font-bold text-white mb-5 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Trophy Case
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ 
                  delay: 0.7 + index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ scale: 1.05, y: -5, rotateY: 5 }}
                className="glass-card rounded-2xl p-4 border border-white/10 hover:border-white/30 transition-all cursor-pointer group relative overflow-hidden"
              >
                {/* 3D Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${achievement.color} opacity-0 group-hover:opacity-20 transition-opacity ${achievement.glow} blur-xl`} />
                
                <div className="relative z-10 flex items-center gap-4">
                  <motion.div 
                    className={`p-3 rounded-xl bg-gradient-to-br ${achievement.color} ${achievement.glow} shadow-lg`}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                  >
                    <achievement.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <div className="text-sm font-bold text-white">{achievement.name}</div>
                    <div className="text-xs text-white/60">Unlocked</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Menu Items - More exciting */}
      <div className="px-5 space-y-3">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: 0.5 + index * 0.08,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="glass-card rounded-2xl p-5 border border-white/10 hover:border-white/30 transition-all cursor-pointer card-hover group">
              <div className="flex items-center gap-5">
                <motion.div 
                  className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} neon-purple group-hover:scale-110 transition-transform`}
                  whileHover={{ rotate: 10 }}
                >
                  <item.icon className="w-6 h-6 text-white" />
                </motion.div>
                <span className="font-bold text-lg flex-1 text-white">{item.label}</span>
                <motion.span 
                  className="text-white/40 text-xl"
                  whileHover={{ x: 5 }}
                >
                  →
                </motion.span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8 text-center"
      >
        <p className="text-slate-400 text-sm">VitalLoop v1.0.0</p>
        <p className="text-slate-500 text-xs mt-1">Your Vital Loop to Better Health</p>
      </motion.div>
    </div>
  )
}

export default Profile
