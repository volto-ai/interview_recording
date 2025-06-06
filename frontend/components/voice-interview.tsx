"use client"

import { Label } from "@/components/ui/label"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff } from "lucide-react"

interface Question {
  id: string
  text: string
}

interface VoiceInterviewProps {
  questions: Question[]
  onComplete: () => void
}

export default function VoiceInterview({ questions, onComplete }: VoiceInterviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const waveformIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentQuestion = questions[currentQuestionIndex]

  useEffect(() => {
    const generateWaveform = () => {
        const newData = Array.from({ length: 50 }, () => Math.random() * 100)
        setWaveformData(newData)
    }

    if (isRecording) {
      generateWaveform()
      waveformIntervalRef.current = setInterval(generateWaveform, 50)
    } else {
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current)
      }
      setWaveformData([])
    }

    return () => {
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current)
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" })
        console.log("Recording completed:", blob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }

  const nextQuestion = () => {
    if (isRecording) stopRecording()
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setRecordingTime(0)
    } else {
      onComplete()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">
            Question {currentQuestionIndex + 1} of {questions.length}
          </CardTitle>
          <CardDescription className="text-lg">{currentQuestion.text}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-8">
          {/* Recording Button */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full ${
                isRecording ? "bg-red-500 hover:bg-red-600" : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {isRecording ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
            </Button>

            <div className="text-lg font-medium">Aufnahme läuft: {formatTime(recordingTime)}</div>
          </div>

          {/* Waveform Visualization */}
          {isRecording && (
            <div className="flex items-center justify-center space-x-1 h-20">
              {waveformData.map((height, index) => (
                <div
                  key={index}
                  className="bg-gray-400 rounded-full transition-all duration-75"
                  style={{
                    width: "4px",
                    height: `${Math.max(4, height * 0.6)}px`,
                  }}
                />
              ))}
            </div>
          )}

          

          {/* Navigation */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" disabled={currentQuestionIndex === 0 || isRecording}>
              Previous
            </Button>
            <Button className="flex-1 bg-slate-800 hover:bg-slate-700" onClick={nextQuestion} disabled={isRecording && currentQuestionIndex < questions.length -1}>
              {currentQuestionIndex === questions.length - 1 ? "Complete" : "Next Question"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
