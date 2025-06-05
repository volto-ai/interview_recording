"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, HelpCircle, Globe } from "lucide-react"
import DemographicsForm from "@/components/demographics-form"
import ScreenoutForm from "@/components/screenout-form"
import VoiceInterview from "@/components/voice-interview"

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

const BACKEND_URL = "http://localhost:8000"

function mapBackendCampaignToCampaign(backend: any): Campaign {
  return {
    id: backend.id || backend.campaign_id,
    researchName: backend.campaign_name || backend.researchName || "",
    customerName: backend.quality_params?.customerName || "",
    screenoutUrl: backend.screening_params?.screenoutUrl || "",
    qualityUrl: backend.quality_params?.qualityUrl || "",
    completedUrl: backend.quality_params?.completedUrl || "",
    questions: backend.questions?.map((q: any) => ({ 
      id: q.id, 
      text: q.text, 
      time_limit_sec: q.time_limit_sec || 60 
    })) || [],
    demographicFields: backend.screening_params?.demographicFields || [],
    screenoutQuestions: backend.screening_params?.screenoutQuestions || [],
  }
}

export default function InterviewPage() {
  const params = useParams()
  const campaignId = params.campaignId as string
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [currentStep, setCurrentStep] = useState<InterviewStep>("landing")
  const [demographicsData, setDemographicsData] = useState<Record<string, any>>({})
  const [screenoutData, setScreenoutData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) {
        setIsLoading(false);
        console.error("Campaign ID is missing.");
        // Optionally set an error state to display to the user
        return;
      }
      try {
        setIsLoading(true); // Ensure loading is true at the start of fetch
        const response = await fetch(`${BACKEND_URL}/api/campaigns/${campaignId}`);
        if (response.ok) {
          const data = await response.json();
          setCampaign(mapBackendCampaignToCampaign(data));
        } else {
          console.error("Campaign not found from API, status:", response.status);
          setCampaign(null); // Set campaign to null if not found or error
        }
      } catch (error) {
        console.error("Error fetching campaign from API:", error);
        setCampaign(null); // Set campaign to null on fetch error
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  const handleDemographicsSubmit = (data: Record<string, any>) => {
    setDemographicsData(data)
    setCurrentStep("screenout")
  }

  const handleScreenoutSubmit = (data: Record<string, string>) => {
    setScreenoutData(data)

    // Check if any answer matches the screenout value
    const isScreenedOut = campaign?.screenoutQuestions.some((q) =>
      q.screenoutValue && data[q.id] === q.screenoutValue
    )

    if (isScreenedOut && campaign?.screenoutUrl) {
      window.location.href = campaign.screenoutUrl
      return
    }

    setCurrentStep("interview")
  }

  const handleInterviewComplete = () => {
    if (campaign?.completedUrl) {
      window.location.href = campaign.completedUrl
    } else {
      setCurrentStep("completed")
    }
  }

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
            <CardTitle>Interview Not Found</CardTitle>
            <CardDescription>The interview you're looking for doesn't exist or has been removed.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (currentStep === "landing") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                DE
              </Button>
            </div>
            <CardTitle className="text-2xl mb-4">
              Willkommen, Sie sind eingeladen, an einer Forschung teilzunehmen
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Ihnen werden einige Fragen gestellt – bitte antworten Sie basierend auf Ihrer persönlichen Perspektive und
              Erfahrung. Dies ist eine vollständig anonyme Umfrage. Es werden keine persönlichen Daten erfasst, und
              keine Ihrer Antworten kann auf Sie zurückgeführt werden. Bitte antworten Sie so offen, umfassend und
              natürlich wie möglich.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4">Umfrageinformationen</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">Geschätzte Zeit</div>
                    <div className="text-gray-600">3 Minuten</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">Anzahl der Fragen</div>
                    <div className="text-gray-600">{campaign.questions.length} Fragen</div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3"
              onClick={() => setCurrentStep("demographics")}
            >
              Weiter
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentStep === "demographics") {
    return <DemographicsForm fields={campaign.demographicFields} onSubmit={handleDemographicsSubmit} />
  }

  if (currentStep === "screenout") {
    return <ScreenoutForm questions={campaign.screenoutQuestions} onSubmit={handleScreenoutSubmit} />
  }

  if (currentStep === "interview") {
    return <VoiceInterview questions={campaign.questions} campaignId={campaignId} onComplete={handleInterviewComplete} />
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
