
import React from 'react'

import Donut from './Donut'
import { useContext } from 'react'
import { UsersContext } from '../Context/UserContext'

const Reports = () => {

  const {projects} = useContext(UsersContext)

  const active = projects.filter((item) => item.projectStatus === "active" || item.projectStatus === "completed")
  const onHold = projects.filter((item) => item.projectStatus === "hold")
  const activeProjects = projects.filter((item) => item.projectStatus === "active")

  return (
    <div className='mt-26 w-full bg-gray-100 min-h-screen'>
      <div className='text-center'>
        <div className='text-center bg-gradient-to-r from-blue-800 via-purple-700 to-blue-700 bg-clip-text text-transparent'>
        <p className='text-4xl font-semibold mb-4'>Reports & Analytics</p>
        </div>
        <p className='text-gray-700 font-semibold'>Comprehensive insighs and performance metrics.</p>
      </div>
      <div>
        <Donut active = {activeProjects} onHold = {onHold}/>
      </div>
    </div>
  )
}

export default Reports