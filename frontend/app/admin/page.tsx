"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Copy, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Question {
  id: string
  text: string
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
}

interface Campaign {
  id: string
  researchName: string
  customerName: string
  screenoutUrl: string
  qualityUrl: string
  completedUrl: string
  questions: Question[]
  demographicFields: DemographicField[]
  screenoutQuestions: ScreenoutQuestion[]
  createdAt: string
}

export default function AdminPage() {
  const { toast } = useToast()
  const [researchName, setResearchName] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [screenoutUrl, setScreenoutUrl] = useState("")
  const [qualityUrl, setQualityUrl] = useState("")
  const [completedUrl, setCompletedUrl] = useState("")
  const [questions, setQuestions] = useState<Question[]>([{ id: "1", text: "" }])
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

  const addQuestion = () => {
    const newId = (questions.length + 1).toString()
    setQuestions([...questions, { id: newId, text: "" }])
  }

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id))
    }
  }

  const updateQuestion = (id: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)))
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
    setScreenoutQuestions([...screenoutQuestions, { id: newId, text: "", options: ["Yes", "No"] }])
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
      q.id === id ? { ...q, options: optionsString.split(",").map(opt => opt.trim()) } : q
    ))
  }

  const generateCampaign = async () => {
    setIsLoading(true)
    setGeneratedUrl("")
    try {
      const campaignId = Math.random().toString(36).substring(2, 15)
      const campaignData: Campaign & { campaign_id: string } = {
        id: campaignId,
        campaign_id: campaignId,
        researchName,
        customerName,
        screenoutUrl,
        qualityUrl,
        completedUrl,
        questions: questions.filter((q) => q.text.trim()),
        demographicFields: demographicFields.map(field => ({ 
          id: field.id,
          label: field.label,
          type: field.type,
          ...(field.options && { options: field.options }),
          ...(field.min !== undefined && { min: field.min }),
          ...(field.max !== undefined && { max: field.max }),
        })),
        screenoutQuestions: screenoutQuestions.filter((q) => q.text.trim()),
        createdAt: new Date().toISOString(),
      }

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      const url = `${window.location.origin}/interview/${campaignId}`;
      setGeneratedUrl(url);
      toast({
        title: "Interview campaign submitted!",
        description: "Campaign data sent to the server. URL generated.",
      });
      console.log("Campaign submission response from server:", result);

    } catch (error: any) {
      console.error("Failed to generate campaign:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl)
    toast({
      title: "URL copied!",
      description: "Interview URL has been copied to clipboard.",
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Voice Interview Administration</h1>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
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
              />
            </div>
            <div>
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
          </CardContent>
        </Card>

        {/* URLs */}
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
              />
            </div>
            <div>
              <Label htmlFor="quality-url">Quality URL</Label>
              <Input
                id="quality-url"
                value={qualityUrl}
                onChange={(e) => setQualityUrl(e.target.value)}
                placeholder="https://example.com/quality"
              />
            </div>
            <div>
              <Label htmlFor="completed-url">Completed URL</Label>
              <Input
                id="completed-url"
                value={completedUrl}
                onChange={(e) => setCompletedUrl(e.target.value)}
                placeholder="https://example.com/completed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Demographics Fields (Collapsible) */}
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
                    />
                  </div>
                  <div className="w-32">
                    <Label>Type</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={field.type}
                      onChange={(e) => updateDemographicField(field.id, { type: e.target.value as any })}
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
                        />
                      </div>
                      <div className="w-20">
                        <Label>Max</Label>
                        <Input
                          type="number"
                          value={field.max || 100}
                          onChange={(e) => updateDemographicField(field.id, { max: Number.parseInt(e.target.value) })}
                        />
                      </div>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeDemographicField(field.id)}
                    disabled={demographicFields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addDemographicField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Demographic Field
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Screenout Questions (as select with options) */}
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
                  />
                </div>
                <div className="flex-1">
                  <Label>Options (comma separated)</Label>
                  <Input
                    value={question.options?.join(", ") || ""}
                    onChange={(e) => updateScreenoutQuestionOptions(question.id, e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeScreenoutQuestion(question.id)}
                  disabled={screenoutQuestions.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addScreenoutQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Screenout Question
            </Button>
          </CardContent>
        </Card>

        {/* Interview Questions */}
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
                    onChange={(e) => updateQuestion(question.id, e.target.value)}
                    placeholder="Enter interview question"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeQuestion(question.id)}
                  disabled={questions.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardContent>
        </Card>

        {/* Generate Campaign */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Interview</CardTitle>
            <CardDescription>Create the campaign and get the participant URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={generateCampaign}
              disabled={isLoading || !researchName || !customerName}
              className="w-full"
            >
              {isLoading ? "Generating Interview..." : "Generate Interview"}
            </Button>

            {generatedUrl && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label>Generated Interview URL:</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={generatedUrl} readOnly />
                  <Button variant="outline" size="icon" onClick={copyUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
