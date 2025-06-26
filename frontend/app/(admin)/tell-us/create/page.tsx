"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import CampaignForm from "@/components/campaign-form"

function TellUsCreatePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const campaignId = searchParams.get('campaignId')

  return (
    <CampaignForm
      campaignType="tell-us"
      campaignId={campaignId}
      onBack={() => router.push('/tell-us')}
      backUrl="/tell-us"
      title="Context Listening Campaign"
      description="Configure a new campaign for quick, direct feedback."
    />
  )
}

export default function TellUsCreatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TellUsCreatePageContent />
    </Suspense>
  )
} 