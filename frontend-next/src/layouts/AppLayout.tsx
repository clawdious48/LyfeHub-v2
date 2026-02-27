import { Outlet } from 'react-router-dom'
import Sidebar from '@/layouts/Sidebar'
import Header from '@/layouts/Header'

export default function AppLayout() {
  return (
    <div className="h-screen flex bg-bg-app">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
