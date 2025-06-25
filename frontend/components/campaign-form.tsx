"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, Edit, Eye, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { getApiUrl, getApiHeaders } from "@/utils/api"
import { Switch } from "@/components/ui/switch"

// --- Interfaces ---
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
  id: string;
  campaign_name: string;
  campaign_description?: string;
  campaign_type: string;
  questions: BackendQuestion[];
  customer_name?: string;
  completed_url?: string;
  quality_url?: string;
  screenout_url?: string;
  demographic_fields?: any[];
  screenout_questions?: any[];
  voice_capability?: boolean;
  created_at: string;
  updated_at?: string | null;
}

interface CampaignFormProps {
  campaignType: 'interview' | 'tell-us'
  campaignId?: string | null
  onBack: () => void
  backUrl: string
  title: string
  description: string
}

// --- Mappers ---
function mapBackendCampaignToFormState(backend: BackendCampaign) {
  const campaignType = backend.campaign_type || 'interview'
  
  return {
    researchName: backend.campaign_name || "",
    campaignDescription: backend.campaign_description || "",
    customerName: backend.customer_name || "",
    screenoutUrl: campaignType === 'interview' ? (backend.screenout_url || "") : "",
    qualityUrl: campaignType === 'interview' ? (backend.quality_url || "") : "",
    completedUrl: campaignType === 'interview' ? (backend.completed_url || "") : "",
    voiceCapability: backend.voice_capability || false,
    questions: backend.questions?.map(q => ({
      id: q.id,
      text: q.text,
      time_limit_sec: q.time_limit_sec
    })) || [{ id: "1", text: "", time_limit_sec: 60 }],
    demographicFields: backend.demographic_fields || [
      { id: "age", label: "Alter", type: "slider", min: 16, max: 100 },
      { id: "gender", label: "Geschlecht", type: "select", options: ["Männlich", "Weiblich", "Divers"] },
      { id: "occupation", label: "Beruf", type: "text" },
      { id: "income", label: "Einkommensbereich", type: "select", options: [
        "Unter €25.000",
        "€25.000 - €49.999",
        "€50.000 - €74.999",
        "€75.000 - €99.999",
        "€100.000 - €149.999",
        "€150.000+"
      ] },
      { id: "city", label: "Stadt", type: "text" },
    ],
    screenoutQuestions: campaignType === 'interview' ? (backend.screenout_questions || [{ id: "1", text: "", options: ["Ja", "Nein"] }]) : []
  }
}

function mapFormStateToBackendPayload(form: {
  researchName: string,
  campaignDescription: string,
  customerName: string,
  screenoutUrl: string,
  qualityUrl: string,
  completedUrl: string,
  voiceCapability: boolean,
  questions: Question[],
  demographicFields: DemographicField[],
  screenoutQuestions: ScreenoutQuestion[]
}, campaignType: 'interview' | 'tell-us') {
  
  const payload: any = {
    campaign_name: form.researchName,
    campaign_description: form.campaignDescription,
    campaign_type: campaignType,
    customer_name: form.customerName,
    voice_capability: form.voiceCapability,
    questions: form.questions
      .filter((q) => q.text.trim())
      .map((q, index) => ({
        id: q.id,
        text: q.text,
        time_limit_sec: q.time_limit_sec || 60,
        order: index
      })),
    demographic_fields: form.demographicFields.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type,
      ...(field.options && { options: field.options }),
      ...(field.min !== undefined && { min: field.min }),
      ...(field.max !== undefined && { max: field.max }),
    })),
  };

  if (campaignType === 'interview') {
    payload.screenout_url = form.screenoutUrl;
    payload.quality_url = form.qualityUrl;
    payload.completed_url = form.completedUrl;
    payload.screenout_questions = form.screenoutQuestions
      .filter((q) => q.text.trim())
      .map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        screenoutValue: q.screenoutValue,
      }));
  }

  return payload;
}

export default function CampaignForm({ campaignType, campaignId, onBack, backUrl, title, description }: CampaignFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  
  // Form State
  const [researchName, setResearchName] = useState("")
  const [campaignDescription, setCampaignDescription] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [screenoutUrl, setScreenoutUrl] = useState("")
  const [qualityUrl, setQualityUrl] = useState("")
  const [completedUrl, setCompletedUrl] = useState("")
  const [voiceCapability, setVoiceCapability] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([{ id: "1", text: "", time_limit_sec: 60 }])
  const [demographicFields, setDemographicFields] = useState<DemographicField[]>([
    { id: "age", label: "Alter", type: "slider", min: 16, max: 100 },
    { id: "gender", label: "Geschlecht", type: "select", options: ["Männlich", "Weiblich", "Divers"] },
    { id: "occupation", label: "Beruf", type: "text" },
    { id: "income", label: "Einkommensbereich", type: "select", options: [
      "Unter €25.000",
      "€25.000 - €49.999",
      "€50.000 - €74.999",
      "€75.000 - €99.999",
      "€100.000 - €149.999",
      "€150.000+"
    ] },
    { id: "city", label: "Stadt", type: "text" },
  ])
  const [demographicsOpen, setDemographicsOpen] = useState(false)
  const [screenoutQuestions, setScreenoutQuestions] = useState<ScreenoutQuestion[]>([
    { id: "1", text: "", options: ["Ja", "Nein"] }
  ])
  
  // UI State
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<BackendCampaign | null>(null)
  const [isLoadingCampaignDetails, setIsLoadingCampaignDetails] = useState(false)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(campaignId ? 'view' : 'create')

  // --- Effects ---
  useEffect(() => {
    if (campaignId) {
      setIsLoadingCampaignDetails(true)
      fetch(getApiUrl(`/api/campaigns/${campaignId}`), {
        headers: {
          ...getApiHeaders(),
          'Content-Type': 'application/json'
        }
      })
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
          setCampaignDescription(formState.campaignDescription)
          setCustomerName(formState.customerName)
          setScreenoutUrl(formState.screenoutUrl)
          setQualityUrl(formState.qualityUrl)
          setCompletedUrl(formState.completedUrl)
          setVoiceCapability(formState.voiceCapability)
          setQuestions(formState.questions)
          setDemographicFields(formState.demographicFields)
          setScreenoutQuestions(formState.screenoutQuestions)
          // Set the correct interview URL for view/edit mode
          const url = `${window.location.origin}/${campaignData.campaign_type === 'tell-us' ? 'tell-us' : 'interview'}/${campaignData.id}`
          setGeneratedUrl(url)
          toast({ title: "Editing Campaign", description: `Loaded '${campaignData.campaign_name}'` })
        })
        .catch((error) => {
          toast({
            title: "Error Loading Campaign",
            description: error.message || `Could not load campaign ${campaignId}.`,
            variant: "destructive",
          })
          setEditingCampaign(null)
        })
        .finally(() => setIsLoadingCampaignDetails(false))
    } else {
      setEditingCampaign(null)
    }
  }, [campaignId, campaignType, toast])

  useEffect(() => {
    setMode(campaignId ? 'view' : 'create')
  }, [campaignId])

  // --- Handlers ---
  const isViewMode = mode === 'view'
  const handleEdit = () => setMode('edit')

  const handleCancelEdit = () => {
    if (editingCampaign) {
      const formState = mapBackendCampaignToFormState(editingCampaign)
      setResearchName(formState.researchName)
      setCampaignDescription(formState.campaignDescription)
      setCustomerName(formState.customerName)
      setScreenoutUrl(formState.screenoutUrl)
      setQualityUrl(formState.qualityUrl)
      setCompletedUrl(formState.completedUrl)
      setVoiceCapability(formState.voiceCapability)
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
    if (editingCampaign) {
      router.push(`${backUrl}?campaignId=${editingCampaign.id}`)
    }
    setMode('view')
  }

  const handleDelete = async () => {
    if (!editingCampaign) return
    if (!window.confirm('Are you sure you want to delete this campaign?')) return
    
    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl(`/api/campaigns/${editingCampaign.id}`), { 
        method: 'DELETE',
        headers: getApiHeaders()
      })
      if (!response.ok) throw new Error("Failed to delete")
      toast({ title: "Campaign Deleted", description: "The campaign has been successfully deleted." })
      router.push(backUrl)
      resetForm()
    } catch (error) {
      toast({ title: "Error", description: "Could not delete the campaign.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = () => setQuestions([...questions, { id: `${Date.now()}`, text: "", time_limit_sec: 60 }])
  const removeQuestion = (id: string) => setQuestions(questions.filter((q) => q.id !== id))
  const updateQuestion = (id: string, newValues: Partial<Omit<Question, 'id'>>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...newValues } : q)))
  }

  const addDemographicField = () => setDemographicFields([...demographicFields, { id: `${Date.now()}`, label: "", type: "text" }])
  const removeDemographicField = (id: string) => setDemographicFields(demographicFields.filter((field) => field.id !== id))
  const updateDemographicField = (id: string, updates: Partial<DemographicField>) => {
    setDemographicFields(demographicFields.map((field) => field.id === id ? { ...field, ...updates } : field))
  }

  const addScreenoutQuestion = () => setScreenoutQuestions([...screenoutQuestions, { id: `${Date.now()}`, text: "", options: ["Ja", "Nein"] }])
  const removeScreenoutQuestion = (id: string) => setScreenoutQuestions(screenoutQuestions.filter((q) => q.id !== id))
  const updateScreenoutQuestion = (id: string, text: string) => {
    setScreenoutQuestions(screenoutQuestions.map((q) => (q.id === id ? { ...q, text } : q)))
  }
  const updateScreenoutQuestionOptions = (id: string, optionsString: string) => {
    setScreenoutQuestions(screenoutQuestions.map((q) => (q.id === id ? { ...q, options: optionsString.split(",").map((s) => s.trim()) } : q)))
  }
  const updateScreenoutQuestionScreenoutValue = (id: string, value: string) => {
    setScreenoutQuestions(screenoutQuestions.map((q) => (q.id === id ? { ...q, screenoutValue: value } : q)))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setGeneratedUrl("")
    
    const payload = mapFormStateToBackendPayload({
      researchName, campaignDescription, customerName, screenoutUrl, qualityUrl, completedUrl, voiceCapability, questions, demographicFields, screenoutQuestions
    }, campaignType)

    const url = editingCampaign
      ? getApiUrl(`/api/campaigns/${editingCampaign.id}`)
      : getApiUrl('/api/campaigns')
    const method = editingCampaign ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          ...getApiHeaders(),
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "An unknown error occurred")

      const newCampaignId = result.id
      const newUrl = `${window.location.origin}/${campaignType === 'tell-us' ? 'tell-us' : 'interview'}/${newCampaignId}`
      setGeneratedUrl(newUrl)
      setCreatedCampaignId(newCampaignId)
      toast({ title: "Success!", description: `Campaign ${editingCampaign ? 'updated' : 'created'} successfully.` })

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save campaign.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyUrl = () => {
    if (!generatedUrl) return
    navigator.clipboard.writeText(generatedUrl)
    toast({ title: "Copied!", description: "Interview URL copied to clipboard." })
  }

  const resetForm = () => {
    setResearchName("")
    setCampaignDescription("")
    setCustomerName("")
    setScreenoutUrl("")
    setQualityUrl("")
    setCompletedUrl("")
    setVoiceCapability(false)
    setQuestions([{ id: "1", text: "", time_limit_sec: 60 }])
    setDemographicFields([
      { id: "age", label: "Alter", type: "slider", min: 16, max: 100 },
      { id: "gender", label: "Geschlecht", type: "select", options: ["Männlich", "Weiblich", "Divers"] },
      { id: "occupation", label: "Beruf", type: "text" },
      { id: "income", label: "Einkommensbereich", type: "select", options: [
        "Unter €25.000",
        "€25.000 - €49.999",
        "€50.000 - €74.999",
        "€75.000 - €99.999",
        "€100.000 - €149.999",
        "€150.000+"
      ] },
      { id: "city", label: "Stadt", type: "text" },
    ])
    setDemographicsOpen(false)
    setScreenoutQuestions([{ id: "1", text: "", options: ["Ja", "Nein"] }])
    setGeneratedUrl("")
    setEditingCampaign(null)
    setCreatedCampaignId(null)
    router.push(backUrl)
  }
  
  if (isLoadingCampaignDetails) {
    return <div className="text-center p-8">Loading campaign details...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {editingCampaign ? `Edit ${title}` : `Create ${title}`}
          </h1>
          <p className="text-muted-foreground">
            {editingCampaign
              ? `Editing "${editingCampaign.campaign_name}"`
              : description}
          </p>
        </div>
        {isViewMode && editingCampaign && (
          <Button onClick={handleEdit}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
        )}
        {!isViewMode && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoading}>Save Changes</Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Basic information about your campaign.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="researchName">Research Name</Label>
            <Input id="researchName" value={researchName} onChange={(e) => setResearchName(e.target.value)} placeholder="e.g., New Feature Feedback" disabled={isViewMode} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaignDescription">Campaign Description</Label>
            <Textarea id="campaignDescription" value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} placeholder="Enter campaign description" disabled={isViewMode} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., Acme Inc." disabled={isViewMode} />
          </div>
        </CardContent>
      </Card>

      {campaignType === 'interview' && (
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
      )}

      <Card>
        <CardHeader onClick={() => setDemographicsOpen((open) => !open)} className="cursor-pointer flex flex-row items-center justify-between">
          <div>
            <CardTitle>Demographics Fields</CardTitle>
            <CardDescription>
              {campaignType === 'tell-us' 
                ? "Define what demographic information to collect or enable voice recording" 
                : "Define what demographic information to collect"
              }
            </CardDescription>
          </div>
          <span>{demographicsOpen ? <ChevronUp /> : <ChevronDown />}</span>
        </CardHeader>
        {demographicsOpen && (
          <CardContent className="space-y-4">
            {campaignType === 'tell-us' && (
              <div className="flex items-center space-x-2 mb-4 p-4 bg-blue-50 rounded-lg">
                <Switch
                  id="voice-capability"
                  checked={voiceCapability}
                  onCheckedChange={setVoiceCapability}
                  disabled={isViewMode}
                />
                <Label htmlFor="voice-capability" className="font-medium">Enable Voice Recording</Label>
              </div>
            )}

            {campaignType === 'tell-us' && voiceCapability ? (
              // Voice recording configuration
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    When enabled, the user will be prompted to record their voice instead of filling out demographic fields.
                  </p>
                </div>
              </div>
            ) : (
              // Regular demographics fields
              <>
                {demographicFields.map((field) => (
                  <div key={field.id} className="grid grid-cols-6 gap-4 items-end">
                    <div className="col-span-2">
                      <Label>Field Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateDemographicField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div className="col-span-1">
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
                      <div className="col-span-2">
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
                        <div className="col-span-1">
                          <Label>Min</Label>
                          <Input
                            type="number"
                            value={field.min || 0}
                            onChange={(e) => updateDemographicField(field.id, { min: Number.parseInt(e.target.value) })}
                            readOnly={isViewMode}
                          />
                        </div>
                        <div className="col-span-1">
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
                    {field.type === "text" && (
                      <div className="col-span-2" />
                    )}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeDemographicField(field.id)}
                        disabled={isViewMode || demographicFields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addDemographicField} disabled={isViewMode}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Demographic Field
                </Button>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {campaignType === 'interview' && (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Interview Questions</CardTitle>
          <CardDescription>The questions you want to ask participants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="flex items-start gap-4 p-4 border rounded-md">
              <div className="font-semibold text-slate-600">{index + 1}</div>
              <div className="flex-1 space-y-2">
                <Label htmlFor={`q-text-${q.id}`}>Question Text</Label>
                <Textarea id={`q-text-${q.id}`} value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} placeholder="Type your question here..." disabled={isViewMode} />
                <div className="w-1/3">
                  <Label htmlFor={`q-time-${q.id}`}>Time Limit (seconds)</Label>
                  <Input id={`q-time-${q.id}`} type="number" value={q.time_limit_sec} onChange={(e) => updateQuestion(q.id, { time_limit_sec: parseInt(e.target.value, 10) || 60 })} disabled={isViewMode} />
                </div>
              </div>
              {!isViewMode && (
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
          {!isViewMode && (
            <Button variant="outline" onClick={addQuestion}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
          )}
        </CardContent>
      </Card>

      {!isViewMode && (
        <div className="flex justify-end">
          {/* Removed Update Campaign button - keeping Save Changes, Cancel, Edit buttons */}
        </div>
      )}

      {generatedUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Link</CardTitle>
            <CardDescription>Share this link with your participants.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Input value={generatedUrl} readOnly />
            <Button variant="outline" onClick={copyUrl}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
            <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary"><Eye className="mr-2 h-4 w-4" /> Preview</Button>
            </a>
          </CardContent>
        </Card>
      )}

      {editingCampaign && (
        <div className="flex justify-between items-center mt-8 pt-4 border-t">
          <Button variant="link" className="text-muted-foreground" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns List
          </Button>
          {!isViewMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Campaign
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 