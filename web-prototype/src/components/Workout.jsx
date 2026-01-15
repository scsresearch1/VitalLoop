import { useState } from 'react'
import WorkoutSelection from './WorkoutSelection'
import ActiveWorkout from './ActiveWorkout'

const Workout = ({ data = {} }) => {
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [isActive, setIsActive] = useState(false)

  if (isActive && activeWorkout) {
    return <ActiveWorkout workout={activeWorkout} onStop={() => { setIsActive(false); setActiveWorkout(null) }} />
  }

  return <WorkoutSelection onStartWorkout={(workout) => { setActiveWorkout(workout); setIsActive(true) }} data={data} />
}

export default Workout
