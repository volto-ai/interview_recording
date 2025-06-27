"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Eye, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { getApiUrl, getApiHeaders } from "@/utils/api"
import { useToast } from "@/hooks/use-toast"

interface Campaign {
  id: string
  campaign_name: string
  campaign_type: string
  created_at: string
}

export default function ShoutItOutPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(getApiUrl("/api/campaigns"), {
        headers: getApiHeaders()
      })
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns")
      }
      const data = await response.json()
      // Filter for tell-us campaigns
      const tellUsCampaigns = (data.campaigns || []).filter((campaign: Campaign) => 
        campaign.campaign_type === 'tell-us'
      )
      setCampaigns(tellUsCampaigns)
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not fetch campaigns.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    try {
      const response = await fetch(getApiUrl(`/api/campaigns/${campaignToDelete}`), {
        method: 'DELETE',
        headers: getApiHeaders()
      })
      if (!response.ok) {
        throw new Error("Failed to delete campaign")
      }
      toast({
        title: "Success",
        description: "Campaign deleted successfully.",
      })
      fetchCampaigns() // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not delete campaign.",
        variant: "destructive",
      })
    } finally {
        setCampaignToDelete(null);
    }
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Context Listening Campaigns</h1>
            <p className="text-muted-foreground">Manage your existing campaigns or create a new one.</p>
          </div>
          <Link href="/tell-us/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create New Context Listening
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Existing Campaigns</CardTitle>
            <CardDescription>
              Here are all the context listening campaigns you have created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{campaign.campaign_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created on: {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/tell-us/${campaign.id}?uid=preview`} target="_blank">
                        <Button variant="outline" size="icon"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link href={`/tell-us/create?campaignId=${campaign.id}`}>
                        <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="destructive" size="icon" onClick={() => setCampaignToDelete(campaign.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold">No campaigns found</h3>
                <p className="text-muted-foreground mt-1">Get started by creating a new context listening campaign.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              campaign and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 