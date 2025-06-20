"use client"; // This directive marks the component as a Client Component

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Edit, PlusCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { getApiUrl } from "@/utils/api"

// Simplified campaign type for the homepage dropdown
interface HomePageCampaign {
  campaign_id: string;
  campaign_name: string;
  // Add any other fields if needed for display, though only id and name are used in dropdown
}

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<HomePageCampaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(getApiUrl('/api/campaigns'))
        if (!response.ok) {
          const errorResult = await response.json().catch(() => ({})); // Try to get error from backend
          throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setCampaigns(data.campaigns || []) // MODIFIED: Expect { campaigns: [...] } structure
        console.log("Fetched campaigns for homepage:", data.campaigns);
      } catch (e: any) {
        console.error("Failed to fetch campaigns for homepage:", e)
        setError(e.message || "Failed to load campaigns. Please try again later.")
        setCampaigns([]); // Clear campaigns on error
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, []) 

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
                    <option key={campaign.campaign_id} value={campaign.campaign_id}> {/* MODIFIED: Use campaign_id and campaign_name */}
                      {campaign.campaign_name}
                    </option>
                  ))}
                </select>
              </div>
              <Link href={selectedCampaign ? `/admin?campaignId=${selectedCampaign}` : "#"} passHref legacyBehavior>
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
                <PlusCircle className="h-8 w-8 text-slate-600" />
                <div>
                  <CardTitle>Create New Interview</CardTitle>
                  <CardDescription>Design a new interview campaign from scratch</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/admin" passHref legacyBehavior>
                <Button asChild className="w-full">
                  <a>Create New Campaign</a>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
