"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Globe } from "lucide-react"

interface DemographicField {
  id: string
  label: string
  type: "text" | "select" | "slider"
  options?: string[]
  min?: number
  max?: number
}

interface DemographicsFormProps {
  fields: DemographicField[]
  onSubmit: (data: Record<string, any>) => void
}

export default function DemographicsForm({ fields, onSubmit }: DemographicsFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const updateField = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              DE
            </Button>
          </div>
          <CardTitle className="text-2xl">Bitte geben Sie weitere Details zu Ihrer Person an</CardTitle>
          <CardDescription>
            Diese Informationen helfen uns, unsere Umfrageteilnehmer besser zu verstehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((field) => (
              <div key={field.id}>
                <Label className="text-base font-medium">
                  {field.label} <span className="text-red-500">*</span>
                </Label>

                {field.type === "text" && (
                  <Input
                    className="mt-2"
                    value={formData[field.id] || ""}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    required
                  />
                )}

                {field.type === "select" && (
                  <select
                    className="w-full mt-2 p-3 border rounded-md"
                    value={formData[field.id] || ""}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    required
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "slider" && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{field.min}</span>
                      <span className="font-medium text-lg text-black">{formData[field.id] || field.min}</span>
                      <span>{field.max}</span>
                    </div>
                    <Slider
                      value={[formData[field.id] || field.min || 0]}
                      onValueChange={(value) => updateField(field.id, value[0])}
                      min={field.min || 0}
                      max={field.max || 100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-4 pt-6">
              <Button type="button" variant="outline" className="flex-1">
                Zurück
              </Button>
              <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-700">
                Weiter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
