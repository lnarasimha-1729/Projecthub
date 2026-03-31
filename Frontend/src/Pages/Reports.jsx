
import React from 'react'

import Donut from '../Charts/Donut'
import { useContext } from 'react'
import { UsersContext } from '../Context/UserContext'
import DailyProgressChart from '../Charts/DailyProgressChart'
import WorkerStatsChart from '../Charts/WorkerStatsChart'
import BudgetChart from '../Charts/BudgetChart'
import Team_Allocation from '../Charts/Team_Allocation'
import ProjectProgressChart from '../Charts/ProjectProgressChart'

const Reports = () => {

  const {projects, workers} = useContext(UsersContext)

  const workerlist = workers.filter((item)=>item.workerType === "Worker")
  

  const active = projects.filter((item) => item.projectStatus === "active" || item.projectStatus === "completed")
  const onHold = projects.filter((item) => item.projectStatus === "hold")
  const activeProjects = projects.filter((item) => item.projectStatus === "active")
  

  return (
    <div className='w-full bg-gradient-to-br from-indigo-50 via-white to-purple-100 min-h-screen p-3 md:p-4 lg:p-6 pb-8'>
      <div className='text-center'>
        <div className='text-center bg-gradient-to-r from-blue-800 via-purple-700 to-blue-700 bg-clip-text text-transparent'>
        <span className='text-lg md:text-xl lg:text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent'>Reports & Analytics</span>
        </div>
        <p className='text-xs md:text-sm lg:text-sm text-gray-500 font-semibold'>Comprehensive insighs and performance metrics.</p>
      </div>

      <div className='flex flex-col gap-8 lg:mt-8'>
        <div className='flex flex-col md:flex-row gap-2 md:gap-2 lg:gap-4'>
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