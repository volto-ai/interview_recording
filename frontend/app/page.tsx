"use client"; // This directive marks the component as a Client Component

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Edit } from "lucide-react"
import { useState, useEffect } from "react"

// Define an interface for the campaign data
interface Campaign {
  id: string;
  name: string;
  // Add other campaign properties if needed
}

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/campaigns")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setCampaigns(data)
      } catch (e: any) {
        console.error("Failed to fetch campaigns:", e)
        setError("Failed to load campaigns. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, []) // Empty dependency array means this effect runs once on mount

  const handleCampaignChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCampaign(event.target.value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Voice Interview Platform</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Create and manage voice-based customer research interviews with ease. Set up campaigns, collect
            demographics, and conduct recorded interviews.
          </p>
        </div>

        <div className="grid gap-8 max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Edit className="h-8 w-8 text-slate-600" />
                <div>
                  <CardTitle>Existing Interviews</CardTitle>
                  <CardDescription>Select and update existing interview campaigns</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="space-y-3 mb-6">
                <select
                  className="w-full p-3 border rounded-md bg-white disabled:opacity-50"
                  value={selectedCampaign}
                  onChange={handleCampaignChange}
                  disabled={loading || campaigns.length === 0}
                >
                  <option value="">
                    {loading ? "Loading campaigns..." : campaigns.length === 0 ? "No campaigns found" : "Select an existing interview to edit..."}
                  </option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
              <Link href={selectedCampaign ? `/admin/edit/${selectedCampaign}` : "#"} passHref legacyBehavior>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  disabled={!selectedCampaign || loading}
                >
                  <a>Edit Selected Interview</a>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-slate-600" />
                <div>
                  <CardTitle>Create New Interview</CardTitle>
                  <CardDescription>Set up a new research campaign and configure interview questions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li>• Configure research details and URLs</li>
                <li>• Define demographic fields</li>
                <li>• Set up screening questions</li>
                <li>• Create voice interview questions</li>
                <li>• Generate participant URLs</li>
              </ul>
              <Link href="/admin">
                <Button className="w-full">Generate Interview</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
