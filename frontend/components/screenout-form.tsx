"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ScreenoutQuestion {
  id: string
  text: string
  options?: string[]
}

interface ScreenoutFormProps {
  questions: ScreenoutQuestion[]
  onSubmit: (data: Record<string, string>) => void
}

export default function ScreenoutForm({ questions, onSubmit }: ScreenoutFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(answers)
  }

  const updateAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const allQuestionsAnswered = questions.every((q) => answers[q.id] !== undefined)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Screening Questions</CardTitle>
          <CardDescription>Please answer the following questions with Yes or No.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="space-y-3">
                <Label className="text-base font-medium">{question.text}</Label>
                <RadioGroup
                  value={answers[question.id]}
                  onValueChange={(value) => updateAnswer(question.id, value)}
                >
                  {(question.options || ["Yes", "No"]).map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                      <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}

            <div className="flex gap-4 pt-6">
              <Button type="button" variant="outline" className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-700" disabled={!allQuestionsAnswered}>
                Continue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
