"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Copy, Sparkles, ChevronDown, ChevronUp, Edit, Eye, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"

interface Question {
  id: string
  text: string
  time_limit_sec: number
}

interface DemographicField {
  id: string
  label: string
  type: "text" | "select" | "slider"
  options?: string[]
  min?: number
  max?: number
}

interface ScreenoutQuestion {
  id: string
  text: string
  options?: string[]
  screenoutValue?: string
}

interface BackendQuestion {
  id: string;
  text: string;
  time_limit_sec: number;
  order: number;
}

interface BackendCampaign {
  campaign_id: string;
  campaign_name: string;
  questions: BackendQuestion[];
  quality_params?: { [key: string]: any };
  screening_params?: { [key: string]: any };
  created_at: string;
  updated_at?: string | null;
}

const BACKEND_URL = "http://localhost:8000"; // Define backend URL

// Utility: Map backend campaign to flat form state
function mapBackendCampaignToFormState(backend: BackendCampaign) {
  return {
    researchName: backend.campaign_name || "",
    customerName: backend.quality_params?.customerName || "",
    screenoutUrl: backend.screening_params?.screenoutUrl || "",
    qualityUrl: backend.quality_params?.qualityUrl || "",
    completedUrl: backend.quality_params?.completedUrl || "",
    questions: backend.questions?.map(q => ({
      id: q.id,
      text: q.text,
      time_limit_sec: q.time_limit_sec
    })) || [{ id: "1", text: "", time_limit_sec: 60 }],
    demographicFields: backend.screening_params?.demographicFields || [
      { id: "1", label: "Gender", type: "select", options: ["Male", "Female", "Diverse"] },
      { id: "2", label: "Occupation", type: "text" },
      { id: "3", label: "Income Range", type: "select", options: [
        "Under €25,000", "€25,000 - €49,999", "€50,000 - €74,999",
        "€75,000 - €99,999", "€100,000 - €149,999", "€150,000+"
      ] },
      { id: "4", label: "Location", type: "text" },
    ],
    screenoutQuestions: backend.screening_params?.screenoutQuestions || [{ id: "1", text: "", options: ["Yes", "No"] }]
  }
}

// Utility: Map flat form state to backend payload
function mapFormStateToBackendPayload(form: {
  researchName: string,
  customerName: string,
  screenoutUrl: string,
  qualityUrl: string,
  completedUrl: string,
  questions: Question[],
  demographicFields: DemographicField[],
  screenoutQuestions: ScreenoutQuestion[]
}) {
  return {
    campaign_name: form.researchName,
    questions: form.questions
      .filter((q) => q.text.trim())
      .map((q, index) => ({
        id: q.id,
        text: q.text,
        time_limit_sec: q.time_limit_sec || 60,
        order: index
      })),
    quality_params: {
      customerName: form.customerName,
      qualityUrl: form.qualityUrl,
      completedUrl: form.completedUrl,
    },
    screening_params: {
      screenoutUrl: form.screenoutUrl,
      demographicFields: form.demographicFields.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type,
        ...(field.options && { options: field.options }),
        ...(field.min !== undefined && { min: field.min }),
        ...(field.max !== undefined && { max: field.max }),
      })),
      screenoutQuestions: form.screenoutQuestions.filter((q) => q.text.trim()).map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        screenoutValue: q.screenoutValue,
      })),
    }
  }
}

export default function AdminPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignIdFromQuery = searchParams.get('campaignId')
  const [researchName, setResearchName] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [screenoutUrl, setScreenoutUrl] = useState("")
  const [qualityUrl, setQualityUrl] = useState("")
  const [completedUrl, setCompletedUrl] = useState("")
  const [questions, setQuestions] = useState<Question[]>([{ id: "1", text: "", time_limit_sec: 60 }])
  const [demographicFields, setDemographicFields] = useState<DemographicField[]>([
    { id: "1", label: "Gender", type: "select", options: ["Male", "Female", "Diverse"] },
    { id: "2", label: "Occupation", type: "text" },
    { id: "3", label: "Income Range", type: "select", options: [
      "Under €25,000",
      "€25,000 - €49,999",
      "€50,000 - €74,999",
      "€75,000 - €99,999",
      "€100,000 - €149,999",
      "€150,000+"
    ] },
    { id: "4", label: "Location", type: "text" },
  ])
  const [demographicsOpen, setDemographicsOpen] = useState(false)
  const [screenoutQuestions, setScreenoutQuestions] = useState<ScreenoutQuestion[]>([
    { id: "1", text: "", options: ["Yes", "No"] }
  ])
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<BackendCampaign | null>(null)
  const [isLoadingCampaignDetails, setIsLoadingCampaignDetails] = useState(false)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(campaignIdFromQuery ? 'view' : 'create')

  useEffect(() => {
    if (campaignIdFromQuery) {
      setIsLoadingCampaignDetails(true)
      fetch(`${BACKEND_URL}/api/campaigns/${campaignIdFromQuery}`)
        .then(async (response) => {
          if (!response.ok) {
            const errorResult = await response.json().catch(() => ({}))
            throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then((campaignData: BackendCampaign) => {
          setEditingCampaign(campaignData)
          const formState = mapBackendCampaignToFormState(campaignData)
          setResearchName(formState.researchName)
          setCustomerName(formState.customerName)
          setScreenoutUrl(formState.screenoutUrl)
          setQualityUrl(formState.qualityUrl)
          setCompletedUrl(formState.completedUrl)
          setQuestions(formState.questions)
          setDemographicFields(formState.demographicFields)
          setScreenoutQuestions(formState.screenoutQuestions)
          setGeneratedUrl("")
          toast({ title: "Editing Campaign", description: `Loaded '${campaignData.campaign_name}' into the form.` })
        })
        .catch((error) => {
          toast({
            title: "Error Loading Campaign",
            description: error.message || `Could not load campaign ${campaignIdFromQuery}.`,
            variant: "destructive",
          })
          setEditingCampaign(null)
        })
        .finally(() => setIsLoadingCampaignDetails(false))
    } else {
      setEditingCampaign(null)
    }
  }, [campaignIdFromQuery])

  useEffect(() => {
    if (campaignIdFromQuery) {
      setMode('view')
    } else {
      setMode('create')
    }
  }, [campaignIdFromQuery])

  const isViewMode = mode === 'view'

  const handleEdit = () => setMode('edit')

  const handleCancelEdit = () => {
    if (editingCampaign) {
      const formState = mapBackendCampaignToFormState(editingCampaign)
      setResearchName(formState.researchName)
      setCustomerName(formState.customerName)
      setScreenoutUrl(formState.screenoutUrl)
      setQualityUrl(formState.qualityUrl)
      setCompletedUrl(formState.completedUrl)
      setQuestions(formState.questions)
      setDemographicFields(formState.demographicFields)
      setScreenoutQuestions(formState.screenoutQuestions)
      setGeneratedUrl("")
      setMode('view')
    } else {
      resetForm()
      setMode('create')
    }
  }

  const handleSave = async () => {
    await handleSubmit()
    setMode('view')
  }

  const handleDelete = async () => {
    if (!editingCampaign) return
    if (!window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) return
    setIsLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/campaigns/${editingCampaign.campaign_id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || result.message || `HTTP error! status: ${response.status}`)
      }
      toast({ title: 'Campaign Deleted', description: 'The campaign was deleted.' })
      router.push('/')
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete campaign.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = () => {
    const newId = (questions.length + 1).toString()
    setQuestions([...questions, { id: newId, text: "", time_limit_sec: 60 }])
  }

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id))
    }
  }

  const updateQuestion = (id: string, newValues: Partial<Omit<Question, 'id'>>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...newValues } : q)))
  }

  const addDemographicField = () => {
    const newId = (demographicFields.length + 1).toString()
    setDemographicFields([...demographicFields, { id: newId, label: "", type: "text" }])
  }

  const removeDemographicField = (id: string) => {
    if (demographicFields.length > 1) {
      setDemographicFields(demographicFields.filter((f) => f.id !== id))
    }
  }

  const updateDemographicField = (id: string, updates: Partial<DemographicField>) => {
    setDemographicFields(demographicFields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const addScreenoutQuestion = () => {
    const newId = (screenoutQuestions.length + 1).toString()
    setScreenoutQuestions([
      ...screenoutQuestions,
      { id: newId, text: "", options: ["Yes", "No"], screenoutValue: undefined },
    ])
  }

  const removeScreenoutQuestion = (id: string) => {
    if (screenoutQuestions.length > 1) {
      setScreenoutQuestions(screenoutQuestions.filter((q) => q.id !== id))
    }
  }

  const updateScreenoutQuestion = (id: string, text: string) => {
    setScreenoutQuestions(screenoutQuestions.map((q) => (q.id === id ? { ...q, text } : q)))
  }

  const updateScreenoutQuestionOptions = (id: string, optionsString: string) => {
    setScreenoutQuestions(screenoutQuestions.map((q) =>
      q.id === id
        ? {
            ...q,
            options: optionsString.split(",").map((opt) => opt.trim()),
            screenoutValue: undefined,
          }
        : q
    ))
  }

  const updateScreenoutQuestionScreenoutValue = (id: string, value: string) => {
    setScreenoutQuestions(screenoutQuestions.map((q) =>
      q.id === id
        ? { ...q, screenoutValue: value }
        : q
    ))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setGeneratedUrl("")
    const basePayload = mapFormStateToBackendPayload({
      researchName,
      customerName,
      screenoutUrl,
      qualityUrl,
      completedUrl,
      questions,
      demographicFields,
      screenoutQuestions
    })
    try {
      let response, result
      if (editingCampaign && editingCampaign.campaign_id) {
        const updatePayload = { ...basePayload, campaign_id: editingCampaign.campaign_id }
        response = await fetch(`${BACKEND_URL}/api/campaigns/${editingCampaign.campaign_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        })
        result = await response.json()
        if (!response.ok) throw new Error(result.error || result.message || `HTTP error! status: ${response.status}`)
        toast({ title: "Campaign Updated!", description: `Campaign '${researchName}' was successfully updated.` })
        // Fetch the updated campaign and set as editingCampaign
        fetch(`${BACKEND_URL}/api/campaigns/${editingCampaign.campaign_id}`)
          .then(async (response) => {
            if (!response.ok) throw new Error("Failed to fetch updated campaign")
            return response.json()
          })
          .then((updatedCampaignData: BackendCampaign) => {
            setEditingCampaign(updatedCampaignData)
            setCreatedCampaignId(null)
            setMode('view')
          })
          .catch(() => {
            setMode('view')
          })
        return
      } else {
        response = await fetch(`${BACKEND_URL}/api/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        })
        result = await response.json()
        if (!response.ok) throw new Error(result.error || result.message || `HTTP error! status: ${response.status}`)
        const backendCampaignId = result.campaign_id
        if (!backendCampaignId) throw new Error("Failed to create campaign: campaign_id missing from server response.")
        setGeneratedUrl(`${window.location.origin}/interview/${backendCampaignId}`)
        setCreatedCampaignId(backendCampaignId)
        toast({ title: "Interview Campaign Created!", description: "Campaign data sent to the Flask server. URL generated." })
        // Enter edit mode for the new campaign
        fetch(`${BACKEND_URL}/api/campaigns/${backendCampaignId}`)
          .then(async (response) => {
            if (!response.ok) {
              const errorResult = await response.json().catch(() => ({}))
              throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
            }
            return response.json()
          })
          .then((campaignData: BackendCampaign) => {
            setEditingCampaign(campaignData)
            const formState = mapBackendCampaignToFormState(campaignData)
            setResearchName(formState.researchName)
            setCustomerName(formState.customerName)
            setScreenoutUrl(formState.screenoutUrl)
            setQualityUrl(formState.qualityUrl)
            setCompletedUrl(formState.completedUrl)
            setQuestions(formState.questions)
            setDemographicFields(formState.demographicFields)
            setScreenoutQuestions(formState.screenoutQuestions)
            setGeneratedUrl("")
            toast({ title: "Editing Campaign", description: `Loaded '${campaignData.campaign_name}' into the form.` })
            setMode('view')
          })
          .catch((error) => {
            toast({
              title: "Error Loading Campaign",
              description: error.message || `Could not load campaign ${backendCampaignId}.`,
              variant: "destructive",
            })
            setEditingCampaign(null)
          })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit campaign. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl)
    toast({
      title: "URL copied!",
      description: "Interview URL has been copied to clipboard.",
    })
  }

  const resetForm = () => {
    setResearchName("")
    setCustomerName("")
    setScreenoutUrl("")
    setQualityUrl("")
    setCompletedUrl("")
    setQuestions([{ id: "1", text: "", time_limit_sec: 60 }])
    setDemographicFields([
      { id: "1", label: "Gender", type: "select", options: ["Male", "Female", "Diverse"] },
      { id: "2", label: "Occupation", type: "text" },
      { id: "3", label: "Income Range", type: "select", options: [
        "Under €25,000",
        "€25,000 - €49,999",
        "€50,000 - €74,999",
        "€75,000 - €99,999",
        "€100,000 - €149,999",
        "€150,000+"
      ] },
      { id: "4", label: "Location", type: "text" },
    ])
    setDemographicsOpen(false)
    setScreenoutQuestions([
      { id: "1", text: "", options: ["Yes", "No"] }
    ])
    setGeneratedUrl("")
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Interview Campaign</h1>
        <Button variant="outline" onClick={() => router.push('/')}> <ArrowLeft className="h-4 w-4 mr-2" /> Back to Homepage </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Set up the basic details for your research campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="research-name">Research Name</Label>
              <Input
                id="research-name"
                value={researchName}
                onChange={(e) => setResearchName(e.target.value)}
                placeholder="Enter research name"
                readOnly={isViewMode}
              />
            </div>
            <div>
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                readOnly={isViewMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redirect URLs</CardTitle>
            <CardDescription>Configure where participants should be redirected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="screenout-url">Screenout URL</Label>
              <Input
                id="screenout-url"
                value={screenoutUrl}
                onChange={(e) => setScreenoutUrl(e.target.value)}
                placeholder="https://example.com/screenout"
                readOnly={isViewMode}
              />
            </div>
            <div>
              <Label htmlFor="quality-url">Quality URL</Label>
              <Input
                id="quality-url"
                value={qualityUrl}
                onChange={(e) => setQualityUrl(e.target.value)}
                placeholder="https://example.com/quality"
                readOnly={isViewMode}
              />
            </div>
            <div>
              <Label htmlFor="completed-url">Completed URL</Label>
              <Input
                id="completed-url"
                value={completedUrl}
                onChange={(e) => setCompletedUrl(e.target.value)}
                placeholder="https://example.com/completed"
                readOnly={isViewMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader onClick={() => setDemographicsOpen((open) => !open)} className="cursor-pointer flex flex-row items-center justify-between">
            <div>
              <CardTitle>Demographics Fields</CardTitle>
              <CardDescription>Define what demographic information to collect</CardDescription>
            </div>
            <span>{demographicsOpen ? <ChevronUp /> : <ChevronDown />}</span>
          </CardHeader>
          {demographicsOpen && (
            <CardContent className="space-y-4">
              {demographicFields.map((field) => (
                <div key={field.id} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Field Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateDemographicField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      readOnly={isViewMode}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Type</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={field.type}
                      onChange={(e) => updateDemographicField(field.id, { type: e.target.value as any })}
                      disabled={isViewMode}
                    >
                      <option value="text">Text</option>
                      <option value="select">Select</option>
                      <option value="slider">Slider</option>
                    </select>
                  </div>
                  {field.type === "select" && (
                    <div className="flex-1">
                      <Label>Options (comma separated)</Label>
                      <Input
                        value={field.options?.join(", ") || ""}
                        onChange={(e) =>
                          updateDemographicField(field.id, {
                            options: e.target.value.split(",").map((s) => s.trim()),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        readOnly={isViewMode}
                      />
                    </div>
                  )}
                  {field.type === "slider" && (
                    <>
                      <div className="w-20">
                        <Label>Min</Label>
                        <Input
                          type="number"
                          value={field.min || 0}
                          onChange={(e) => updateDemographicField(field.id, { min: Number.parseInt(e.target.value) })}
                          readOnly={isViewMode}
                        />
                      </div>
                      <div className="w-20">
                        <Label>Max</Label>
                        <Input
                          type="number"
                          value={field.max || 100}
                          onChange={(e) => updateDemographicField(field.id, { max: Number.parseInt(e.target.value) })}
                          readOnly={isViewMode}
                        />
                      </div>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeDemographicField(field.id)}
                    disabled={isViewMode || demographicFields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addDemographicField} disabled={isViewMode}>
                <Plus className="h-4 w-4 mr-2" />
                Add Demographic Field
              </Button>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screenout Questions</CardTitle>
            <CardDescription>Screen participants with select questions and custom options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {screenoutQuestions.map((question) => (
              <div key={question.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Question</Label>
                  <Input
                    value={question.text}
                    onChange={(e) => updateScreenoutQuestion(question.id, e.target.value)}
                    placeholder="Enter screenout question"
                    readOnly={isViewMode}
                  />
                </div>
                <div className="flex-1">
                  <Label>Options (comma separated)</Label>
                  <Input
                    value={question.options?.join(", ") || ""}
                    onChange={(e) => updateScreenoutQuestionOptions(question.id, e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    readOnly={isViewMode}
                  />
                  {question.options && question.options.length > 0 && (
                    <div className="mt-2">
                      <Label className="text-xs">Screen out on answer</Label>
                      <select
                        className="w-full p-2 border rounded text-xs mt-1"
                        value={question.screenoutValue || ""}
                        onChange={(e) => updateScreenoutQuestionScreenoutValue(question.id, e.target.value)}
                        disabled={isViewMode}
                      >
                        <option value="">(None)</option>
                        {question.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeScreenoutQuestion(question.id)}
                  disabled={isViewMode || screenoutQuestions.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addScreenoutQuestion} disabled={isViewMode}>
              <Plus className="h-4 w-4 mr-2" />
              Add Screenout Question
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interview Questions</CardTitle>
            <CardDescription>Voice interview questions for participants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Question {question.id}</Label>
                  <Textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                    placeholder="Enter interview question"
                    readOnly={isViewMode}
                  />
                </div>
                <div className="w-40">
                  <Label htmlFor={`time-limit-${question.id}`}>Time Limit (sec)</Label>
                  <Input
                    id={`time-limit-${question.id}`}
                    type="number"
                    value={question.time_limit_sec}
                    onChange={(e) => updateQuestion(question.id, { time_limit_sec: parseInt(e.target.value, 10) || 60 })}
                    placeholder="e.g., 60"
                    readOnly={isViewMode}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeQuestion(question.id)}
                  disabled={isViewMode || questions.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addQuestion} disabled={isViewMode}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'view' && (
              <div className="flex flex-row gap-4 mb-4">
                <Button onClick={handleEdit} className="w-full"><Edit className="h-4 w-4 mr-2" />Edit</Button>
                <Button variant="destructive" onClick={handleDelete} className="w-full"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
              </div>
            )}
            {(mode === 'edit' || mode === 'create') && (
              <div className="flex flex-row gap-4 mb-4">
                <Button variant="outline" onClick={handleCancelEdit} className="w-full">Cancel</Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !researchName || !customerName}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {(editingCampaign || createdCampaignId) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Participant Interview URL</CardTitle>
              <CardDescription>This is the link for participants to access this interview campaign.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-center">
                <Input value={`http://localhost:3000/interview/${editingCampaign ? editingCampaign.campaign_id : createdCampaignId}`} readOnly />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(`http://localhost:3000/interview/${editingCampaign ? editingCampaign.campaign_id : createdCampaignId}`)
                  toast({ title: "URL copied!", description: "Interview URL has been copied to clipboard." })
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
