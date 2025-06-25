"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import CampaignForm from "@/components/campaign-form"

function PanelInterviewCampaignPageContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId')

  return (
    <CampaignForm
      campaignType="interview"
      campaignId={campaignId}
      onBack={() => window.history.back()}
      backUrl="/panel-interview"
      title="Interview Campaign"
      description="Set up the basic details for your research campaign"
    />
  )
}

export default function PanelInterviewCampaignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PanelInterviewCampaignPageContent />
    </Suspense>
  )
}