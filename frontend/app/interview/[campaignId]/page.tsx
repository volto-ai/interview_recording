"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, HelpCircle, Globe, Mic, Info } from "lucide-react"
import DemographicsForm from "@/components/demographics-form"
import ScreenoutForm from "@/components/screenout-form"
import VoiceInterview from "@/components/voice-interview"
import { getApiUrl, getApiHeaders } from "@/utils/api"
import LandingPage from "@/components/landing-page"

interface Campaign {
  id: string
  researchName: string
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

type InterviewStep = "landing" | "demographics" | "screenout" | "interview" | "completed"

function mapBackendCampaignToCampaign(backend: any): Campaign {
  return {
    id: backend.id,
    researchName: backend.campaign_name || backend.researchName || "",
    customerName: backend.customer_name || "",
    screenoutUrl: backend.screenout_url || "",
    qualityUrl: backend.quality_url || "",
    completedUrl: backend.completed_url || "",
    questions: backend.questions?.map((q: any) => ({ 
      id: q.id, 
      text: q.text, 
      time_limit_sec: q.time_limit_sec || 60 
    })) || [],
    demographicFields: backend.demographic_fields || [],
    screenoutQuestions: backend.screenout_questions || [],
  }
}

export default function InterviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const participantId = searchParams.get('uid')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [currentStep, setCurrentStep] = useState<InterviewStep>("landing")
  const [demographicsData, setDemographicsData] = useState<Record<string, any>>({})
  const [screenoutData, setScreenoutData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId || !participantId) {
        setIsLoading(false);
        console.error("Campaign ID or Participant ID is missing.");
        return;
      }
      try {
        setIsLoading(true);
        const response = await fetch(getApiUrl(`/api/campaigns/${campaignId}`), {
          headers: getApiHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setCampaign(mapBackendCampaignToCampaign(data));
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
  }, [campaignId, participantId]);

  const handleDemographicsSubmit = (data: Record<string, any>) => {
    setDemographicsData(data)
    setCurrentStep("screenout")
  }

  const handleScreenoutSubmit = async (data: Record<string, string>) => {
    setScreenoutData(data)

    // Check if any answer matches the screenout value
    const isScreenedOut = campaign?.screenoutQuestions.some((q) =>
      q.screenoutValue && data[q.id] === q.screenoutValue
    )

    if (isScreenedOut && campaign?.screenoutUrl) {
      if (!participantId) {
        console.error('Participant ID is missing from URL')
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
    if (!participantId || !campaign) {
      console.error('Participant ID or campaign is missing')
      return
    }

    try {
      const submissionData = {
        campaign_id: campaign.id,
        participant_id: participantId,
        demographics: demographicsData,
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

  // Individuelle Inhalte für Interview Landing Page
  const landingTitle = "Willkommen, Sie sind eingeladen, an einer Forschung teilzunehmen"
  const landingSubtitle = "Bitte nehmen Sie sich ein paar Minuten Zeit, um an dieser anonymen Sprachstudie teilzunehmen."
  const privacyTitle = "Wichtige Hinweise"
  const privacyText =
    "Ihnen werden einige Fragen gestellt – bitte antworten Sie basierend auf Ihrer persönlichen Perspektive und Erfahrung. " +
    "Dies ist eine vollständig anonyme Umfrage. Es werden keine persönlichen Daten erfasst, und keine Ihrer Antworten kann auf Sie zurückgeführt werden. " +
    "Bitte antworten Sie so offen, umfassend und natürlich wie möglich."
  const steps = [
    {
      title: "Geschätzte Zeit",
      description: "3 Minuten",
      icon: <Clock className="h-5 w-5 text-gray-600" />,
    },
    {
      title: "Anzahl der Fragen",
      description: `${campaign?.questions.length ?? 0} Fragen`,
      icon: <HelpCircle className="h-5 w-5 text-gray-600" />,
    },
    {
      title: "Sprachaufnahme-Anleitung",
      description: "Sobald Sie eine Frage sehen und das Mikrofonsymbol erscheint, klicken Sie darauf, erlauben Sie den Mikrofonzugriff und starten Sie die Aufnahme. Zum Stoppen einfach erneut klicken.",
      icon: <Mic className="h-5 w-5 text-slate-800" />,
    },
  ]

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

  if (!campaign || !participantId) {
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

  if (currentStep === "landing") {
    return (
      <LandingPage
        icon={<Mic className="h-10 w-10 text-black" />}
        title={landingTitle}
        subtitle={landingSubtitle}
        privacyTitle={privacyTitle}
        privacyText={privacyText}
        steps={steps}
        onStart={() => setCurrentStep("demographics")}
        startLabel="Umfrage starten"
        buttonClassName="bg-black hover:bg-neutral-800 text-white"
        buttonBelowCard={true}
      />
    )
  }

  if (currentStep === "demographics") {
    return <DemographicsForm fields={campaign.demographicFields} onSubmit={handleDemographicsSubmit} />
  }

  if (currentStep === "screenout") {
    return <ScreenoutForm questions={campaign.screenoutQuestions} onSubmit={handleScreenoutSubmit} />
  }

  if (currentStep === "interview") {
    return <VoiceInterview 
      questions={campaign.questions} 
      campaignId={campaignId} 
      participantId={participantId}
      onComplete={handleInterviewComplete} 
    />
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Interview Completed</CardTitle>
          <CardDescription>Thank you for participating in our research!</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
