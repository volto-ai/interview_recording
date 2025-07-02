"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, HelpCircle, Globe, Mic, Info, Shield, Lock, CheckCircle } from "lucide-react"
import DemographicsForm from "@/components/demographics-form"
import ScreenoutForm from "@/components/screenout-form"
import VoiceInterview from "@/components/voice-interview"
import Captcha from "@/components/captcha"
import { getApiUrl, getApiHeaders } from "@/utils/api"
import LandingPage from "@/components/landing-page"

interface Campaign {
  id: string
  researchName: string
  campaignDescription?: string
  customerName: string
  screenoutUrl: string
  qualityUrl: string
  completedUrl: string
  questions: Array<{ id: string; text: string; time_limit_sec: number }>
  demographicFields: Array<{
    id: string
    label: string
    type: "text" | "select" | "slider"
    options?: string[]
    min?: number
    max?: number
  }>
  screenoutQuestions: Array<{ id: string; text: string; options?: string[]; screenoutValue?: string }>
}

type InterviewStep = "screenout" | "interview" | "demographics" | "completed"

function mapBackendCampaignToCampaign(backend: any): Campaign {
  return {
    id: backend.id,
    researchName: backend.campaign_name,
    campaignDescription: backend.campaign_description,
    customerName: backend.customer_name,
    screenoutUrl: backend.screenout_url,
    qualityUrl: backend.quality_url,
    completedUrl: backend.completed_url,
    questions: backend.questions || [],
    demographicFields: backend.demographic_fields || [],
    screenoutQuestions: backend.screenout_questions || [],
  }
}

// Helper function to generate a unique participant ID
function generateParticipantId(): string {
  return `sayit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default function ShoutItOutInterviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  // For tell-us campaigns, we don't require uid in URL - it will be generated
  const urlParticipantId = searchParams.get('uid')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [currentStep, setCurrentStep] = useState<InterviewStep>("interview")
  const [demographicsData, setDemographicsData] = useState<Record<string, any>>({})
  const [screenoutData, setScreenoutData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [generatedParticipantId, setGeneratedParticipantId] = useState<string | null>(null)

  // Use either URL participant ID (for backward compatibility) or generated one
  const participantId = urlParticipantId || generatedParticipantId

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) {
        setIsLoading(false);
        console.error("Campaign ID is missing.");
        return;
      }
      try {
        setIsLoading(true);
        const response = await fetch(getApiUrl(`/api/campaigns/${campaignId}`), {
          headers: getApiHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          console.log('=== CAMPAIGN DATA LOADED ===')
          console.log('Raw campaign data:', data)
          console.log('Demographic fields in raw data:', data.demographic_fields)
          console.log('Questions in raw data:', data.questions)
          
          const mappedCampaign = mapBackendCampaignToCampaign(data);
          console.log('Mapped campaign:', mappedCampaign)
          console.log('Mapped demographic fields:', mappedCampaign.demographicFields)
          
          setCampaign(mappedCampaign);
          // Generate participant ID immediately when campaign loads
          if (!generatedParticipantId && !urlParticipantId) {
            const newParticipantId = generateParticipantId()
            setGeneratedParticipantId(newParticipantId)
            console.log('Generated participant ID:', newParticipantId)
          }
          // Check if we should start with screenout or interview
          if (data.screenout_questions && data.screenout_questions.length > 0) {
            setCurrentStep("screenout")
          } else {
            setCurrentStep("interview")
          }
        } else {
          console.error("Campaign not found from API, status:", response.status);
          setCampaign(null);
        }
      } catch (error) {
        console.error("Error fetching campaign from API:", error);
        setCampaign(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, generatedParticipantId, urlParticipantId]);

  const handleScreenoutSubmit = async (data: Record<string, string>) => {
    setScreenoutData(data)

    // Check if any answer matches the screenout value
    const isScreenedOut = campaign?.screenoutQuestions.some((q) =>
      q.screenoutValue && data[q.id] === q.screenoutValue
    )

    if (isScreenedOut && campaign?.screenoutUrl) {
      if (!participantId) {
        console.error('Participant ID is missing')
        return
      }

      try {
        // Call screenout endpoint
        const response = await fetch(getApiUrl('/api/screenout'), {
          method: 'POST',
          headers: {
            ...getApiHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            participant_id: participantId,
            demographics: demographicsData,
            screenout_url: campaign.screenoutUrl
          })
        })

        if (!response.ok) {
          console.error('Failed to record screenout:', await response.text())
          // If screenout fails, continue to interview
          setCurrentStep("interview")
          return
        }

        // Fire screenout URL and redirect
        fireUrlInIframe(campaign.screenoutUrl).then(() => {
      window.location.href = campaign.screenoutUrl
        })
      } catch (error) {
        console.error('Error recording screenout:', error)
        // If there's an error, continue to interview
        setCurrentStep("interview")
      }
      return
    }

    setCurrentStep("interview")
  }

  const handleInterviewComplete = async () => {
    console.log('=== INTERVIEW COMPLETE HANDLER ===')
    console.log('Campaign demographic fields:', campaign?.demographicFields)
    console.log('Demographic fields length:', campaign?.demographicFields?.length)
    
    // For tell-us, go to demographics after interview
    if (campaign?.demographicFields && campaign.demographicFields.length > 0) {
      console.log('✅ Going to demographics step')
      setCurrentStep("demographics")
    } else {
      console.log('❌ No demographic fields, completing interview directly')
      // If no demographics, complete the interview
      await submitInterviewData()
    }
  }

  const handleDemographicsSubmit = async (data: Record<string, any>) => {
    
    setDemographicsData(data)
    await submitInterviewData(data) // Pass the data directly
  }

  const submitInterviewData = async (demographicsOverride?: Record<string, any>) => {
    const demographicsToUse = demographicsOverride || demographicsData
    
    if (!participantId || !campaign) {
      console.error('Participant ID or campaign is missing')
      return
    }

    try {
      const submissionData = {
        campaign_id: campaign.id,
        participant_id: participantId,
        demographics: demographicsToUse,
        completed_url: campaign.completedUrl
      }

      console.log('Submitting interview data:', {
        campaignId: campaign.id,
        participantId,
        demographicsCount: Object.keys(demographicsData).length,
        completedUrl: campaign.completedUrl
      })
      console.log('Full submission data:', submissionData)

      // Submit interview data
      const response = await fetch(getApiUrl('/api/interviews/submit'), {
        method: 'POST',
        headers: {
          ...getApiHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        console.error('Failed to submit interview:', await response.text())
        // If submission fails, show completion page
        setCurrentStep("completed")
        return
      }

      // If submission is successful and we have a completed URL
      if (campaign.completedUrl) {
        // Fire completed URL and redirect
        fireUrlInIframe(campaign.completedUrl).then(() => {
      window.location.href = campaign.completedUrl
        })
    } else {
        // If no completed URL is provided, show completion page
        setCurrentStep("completed")
      }
    } catch (error) {
      console.error('Error submitting interview:', error)
      // If there's an error, show completion page
      setCurrentStep("completed")
    }
  }

  // Helper function to fire URL with backend logging
  const fireUrlInIframe = async (url: string) => {
    if (!url) return;
    
    try {
      // Log in backend via API endpoint
      const response = await fetch('/api/redirect', {
        method: 'POST',
        headers: {
          ...getApiHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
        }),
      });
    } catch (error) {
      console.error('Error tracking URL:', error);
    }
  };

  // Privacy information for the small card
  const privacyTitle = "Datenschutz & Anonymität"
  const privacyText =
    "Diese Umfrage ist vollständig anonym. Es werden keine personenbezogenen Daten erhoben " +
    "und keine Informationen gespeichert, die Rückschlüsse auf Ihre Identität zulassen. " +
    "Ziel der Befragung ist es, allgemeine Haltungen und Auffassungen zu bestimmten Themen besser zu verstehen. " +
    "Sollten Sie dennoch unbeabsichtigt personenbezogene Angaben machen, werden diese vor der Auswertung entfernt."

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Interview Link</CardTitle>
            <CardDescription>The interview link is missing required parameters.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (currentStep === "screenout") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <ScreenoutForm
            questions={campaign.screenoutQuestions}
            onSubmit={handleScreenoutSubmit}
          />
          {/* Privacy Card */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                {privacyTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 leading-relaxed">
                {privacyText}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentStep === "interview") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <VoiceInterview
            questions={campaign.questions}
            campaignId={campaign.id}
            participantId={participantId!}
            onComplete={handleInterviewComplete}
          />
          {/* Privacy Card */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                {privacyTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 leading-relaxed">
                {privacyText}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentStep === "demographics") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Fast geschafft!</CardTitle>
              <CardDescription>
                Bitte beantworten Sie noch ein paar kurze Fragen zu Ihrer Person. 
                Diese Informationen helfen uns, die Ergebnisse besser zu verstehen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemographicsForm
                fields={campaign.demographicFields}
                onSubmit={handleDemographicsSubmit}
              />
            </CardContent>
          </Card>
          {/* Privacy Card */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                {privacyTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-600 leading-relaxed">
                {privacyText}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentStep === "completed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Umfrage abgeschlossen</CardTitle>
            <CardDescription>Vielen Dank für Ihre Teilnahme an unserer Umfrage!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 text-sm">
                Ihre Antworten wurden erfolgreich übermittelt und werden zur Verbesserung unserer Services verwendet.
              </p>
            </div>
            <Button onClick={() => window.close()} className="w-full bg-blue-600 hover:bg-blue-700">
              Schließen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null;
}