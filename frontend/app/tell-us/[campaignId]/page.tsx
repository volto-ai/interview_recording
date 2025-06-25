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

type InterviewStep = "landing" | "captcha" | "screenout" | "interview" | "demographics" | "completed"

function mapBackendCampaignToCampaign(backend: any): Campaign {
  return {
    id: backend.id,
    researchName: backend.campaign_name || backend.researchName || "",
    campaignDescription: backend.campaign_description || "",
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

export default function ShoutItOutInterviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const campaignId = params.campaignId as string
  const participantId = searchParams.get('uid')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [currentStep, setCurrentStep] = useState<InterviewStep>("landing")
  const [demographicsData, setDemographicsData] = useState<Record<string, any>>({})
  const [screenoutData, setScreenoutData] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [captchaVerified, setCaptchaVerified] = useState(false)

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

  const handleCaptchaVerify = (isValid: boolean) => {
    setCaptchaVerified(isValid)
    if (isValid) {
      // Check if there are screenout questions, otherwise go directly to interview
      if (campaign?.screenoutQuestions && campaign.screenoutQuestions.length > 0) {
        setCurrentStep("screenout")
      } else {
        setCurrentStep("interview")
      }
    }
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
    // For tell-us, go to demographics after interview
    if (campaign?.demographicFields && campaign.demographicFields.length > 0) {
      setCurrentStep("demographics")
    } else {
      // If no demographics, complete the interview
      await submitInterviewData()
    }
  }

  const handleDemographicsSubmit = async (data: Record<string, any>) => {
    setDemographicsData(data)
    await submitInterviewData()
  }

  const submitInterviewData = async () => {
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

  // Individuelle Inhalte für Tell-us Landing Page
  const landingTitle = "Ihre Meinung zählt"
  const landingSubtitle = ""
  const privacyTitle = "Datenschutz & Anonymität"
  const privacyText =
    "Diese Umfrage ist vollständig anonym. Es werden keine personenbezogenen Daten erhoben " +
    "und keine Informationen gespeichert, die Rückschlüsse auf Ihre Identität zulassen. " +
    "Ziel der Befragung ist es, allgemeine Haltungen und Auffassungen zu bestimmten Themen besser zu verstehen. " +
    "Sollten Sie dennoch unbeabsichtigt personenbezogene Angaben machen, werden diese vor der Auswertung entfernt."
  const stepsRaw = [
    {
      title: "Kurze Sicherheitsüberprüfung",
      description: "Schnelle Verifizierung für optimale Aufnahmequalität.",
      icon: <Lock className="h-5 w-5 text-gray-600" />,
    },
    campaign?.screenoutQuestions && campaign.screenoutQuestions.length > 0
      ? {
          title: "Qualifikationsfragen",
          description: "Kurze Fragen zur Teilnahmeberechtigung.",
          icon: <CheckCircle className="h-5 w-5 text-gray-600" />,
        }
      : null,
    {
      title: "Sprachaufnahmen",
      description: "Ihre Meinung zählt – sprechen Sie frei zu den gestellten Fragen.",
      icon: <Mic className="h-5 w-5 text-gray-600" />,
    },
    campaign?.demographicFields && campaign.demographicFields.length > 0
      ? {
          title: "Demographische Fragen am Ende",
          description: "Einige allgemeine Angaben helfen uns, die Ergebnisse besser einzuordnen.",
          icon: <Shield className="h-5 w-5 text-gray-600" />,
        }
      : null,
    {
      title: "Dauer: ca. 2-3 Minuten",
      description: undefined,
      icon: <Clock className="h-5 w-5 text-gray-500" />,
    },
  ];
  const steps = stepsRaw.filter((s): s is NonNullable<typeof s> => Boolean(s));

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
        icon={<Mic className="h-10 w-10 text-gray-600" />}
        title={landingTitle}
        subtitle={landingSubtitle}
        privacyTitle={privacyTitle}
        privacyText={privacyText}
        steps={steps}
        onStart={() => setCurrentStep("captcha")}
        startLabel="Weiter"
        buttonClassName="bg-black hover:bg-neutral-800 text-white"
        buttonBelowCard={true}
      />
    )
  }

  if (currentStep === "captcha") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Captcha onVerify={handleCaptchaVerify} />
        </div>
      </div>
    )
  }

  if (currentStep === "screenout") {
    return (
      <ScreenoutForm
        questions={campaign.screenoutQuestions}
        onSubmit={handleScreenoutSubmit}
      />
    )
  }

  if (currentStep === "interview") {
    return (
      <VoiceInterview
        questions={campaign.questions}
        campaignId={campaign.id}
        participantId={participantId}
        onComplete={handleInterviewComplete}
      />
    )
  }

  if (currentStep === "demographics") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
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