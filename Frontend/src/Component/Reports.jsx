
import React from 'react'

import Donut from './Donut'
import { useContext } from 'react'
import { UsersContext } from '../Context/UserContext'
import DailyProgressChart from './DailyProgressChart'
import WorkerStatsChart from './WorkerStatsChart'
import BudgetChart from './BudgetChart'
import Team_Allocation from './Team_Allocation'

const Reports = () => {

  const {projects, workers} = useContext(UsersContext)

  const workerlist = workers.filter((item)=>item.workerType === "Worker")
  

  const active = projects.filter((item) => item.projectStatus === "active" || item.projectStatus === "completed")
  const onHold = projects.filter((item) => item.projectStatus === "hold")
  const activeProjects = projects.filter((item) => item.projectStatus === "active")
  

  return (
    <div className='mt-26 w-full bg-gray-100 min-h-screen p-8'>
      <div className='text-center'>
        <div className='text-center bg-gradient-to-r from-blue-800 via-purple-700 to-blue-700 bg-clip-text text-transparent'>
        <p className='text-3xl font-semibold mb-4'>Reports & Analytics</p>
        </div>
        <p className='text-gray-700 font-semibold'>Comprehensive insighs and performance metrics.</p>
      </div>

      <div className='flex flex-col gap-8'>
        <div className='flex gap-4'>
        <Donut active = {activeProjects} onHold = {onHold}/>
        <Team_Allocation projects={activeProjects}/>
        </div>
      <WorkerStatsChart/>
      <BudgetChart/>
      </div>
    </div>
  )
}

export default Reports