"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ClipboardList, UserX, Loader2 } from "lucide-react"
import { getApiUrl, getApiHeaders } from "@/utils/api"

interface AdminStats {
  total_campaigns: number
  total_participants: number
  total_screenouts: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(getApiUrl("/api/stats"), {
          headers: getApiHeaders()
        })
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats")
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: React.ReactNode, icon: React.ElementType, description: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard 
          title="Total Campaigns"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total_campaigns ?? 'N/A'}
          icon={ClipboardList}
          description="Number of campaigns created"
        />
        <StatCard 
          title="Total Participants"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total_participants ?? 'N/A'}
          icon={Users}
          description="Total number of submissions"
        />
        <StatCard 
          title="Total Screenouts"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total_screenouts ?? 'N/A'}
          icon={UserX}
          description="Number of screened out submissions"
        />
      </div>
    </div>
  )
} 