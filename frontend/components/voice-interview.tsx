"use client"

import { Label } from "@/components/ui/label"
import { getApiUrl } from "@/utils/api"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff, Upload, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface Question {
  id: string
  text: string
  time_limit_sec: number
}

interface VoiceInterviewProps {
  questions: Question[]
  campaignId: string
  participantId: string
  onComplete: () => void
}

interface Recording {
  questionId: string
  filePath: string
  duration: number
  uploaded: boolean
  error?: string
}

export default function VoiceInterview({ questions, campaignId, participantId, onComplete }: VoiceInterviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [hasJustRecorded, setHasJustRecorded] = useState(false)
  const [isFirstRecordingForQuestion, setIsFirstRecordingForQuestion] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)
  const waveformIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

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

  const uploadRecording = async (blob: Blob, questionId: string): Promise<boolean> => {
    try {
      setIsUploading(true)
      setUploadStatus('uploading')

      const formData = new FormData()
      formData.append('audio', blob, `recording_${questionId}_${Date.now()}.wav`)
      formData.append('campaign_id', campaignId)
      formData.append('participant_id', participantId)
      formData.append('question_id', questionId)

      const response = await fetch(getApiUrl(`/api/recordings/upload`), {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Recording uploaded successfully:', result)
        
        // Add to recordings list
        const newRecording: Recording = {
          questionId,
          filePath: result.file_path,
          duration: blob.size / 1000, // Approximate duration
          uploaded: true
        }
        
        setRecordings(prev => [...prev.filter(r => r.questionId !== questionId), newRecording])
        setUploadStatus('success')
        setHasJustRecorded(true)
        
        // Check if this was the first recording for this question
        const hadPreviousRecording = recordings.some(r => r.questionId === questionId)
        setIsFirstRecordingForQuestion(!hadPreviousRecording)
        
        // Auto-hide success message after 2 seconds
        setTimeout(() => setUploadStatus('idle'), 2000)
        
        return true
      } else {
        const error = await response.json()
        console.error('Upload failed:', error)
        setUploadStatus('error')
        
        // Auto-hide error message after 3 seconds
        setTimeout(() => setUploadStatus('idle'), 3000)
        
        return false
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      
      // Auto-hide error message after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000)
      
      return false
    } finally {
      setIsUploading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" })
        console.log("Recording completed:", blob)
        
        // Upload the recording
        await uploadRecording(blob, currentQuestion.id)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setTimeRemaining(currentQuestion.time_limit_sec)
      setUploadStatus('idle')

      // Clear any existing timers
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      
      // Start recording time counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      // Start countdown timer
      countdownTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
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

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
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
      setTimeRemaining(0)
      setUploadStatus('idle')
      setHasJustRecorded(false)
      setIsFirstRecordingForQuestion(false)
    } else {
      onComplete()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Check if current question has a recording
  const currentQuestionRecording = recordings.find(r => r.questionId === currentQuestion.id)
  const canProceed = currentQuestionRecording?.uploaded || false

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current)
    }
  }, [])

  // Auto-stop recording when countdown reaches zero
  useEffect(() => {
    if (isRecording && timeRemaining === 0) {
      stopRecording()
    }
  }, [timeRemaining, isRecording])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">
            Frage {currentQuestionIndex + 1} von {questions.length}
          </CardTitle>
          <CardDescription className="text-lg">{currentQuestion.text}</CardDescription>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
            <Clock className="h-4 w-4" />
            <span>Zeit-Limit: {formatTime(currentQuestion.time_limit_sec)}</span>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-8">
          {/* Countdown Timer */}
          {isRecording && (
            <div className="flex flex-col items-center space-y-2">
              <div className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-500">Zeit verbleibt</div>
            </div>
          )}

          {/* Recording Button */}
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
              className={`w-24 h-24 rounded-full ${
                isRecording ? "bg-red-500 hover:bg-red-600" : "bg-slate-800 hover:bg-slate-700"
              } disabled:opacity-50`}
            >
              {isRecording ? <MicOff className="h-8 w-8 text-white" /> : <Mic className="h-8 w-8 text-white" />}
            </Button>

            <div className="text-lg font-medium">
              {isRecording ? 'Aufnahme läuft' : 'Bereit für Aufnahme'}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {!currentQuestionRecording && uploadStatus === 'uploading' && (
              <>
                <Upload className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-blue-600">Aufnahme wird hochgeladen...</span>
              </>
            )}
            {currentQuestionRecording && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600">Die Antwort wurde übermittelt</span>
              </>
            )}
            {uploadStatus === 'error' && (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600">Fehler beim Hochladen. Bitte versuchen Sie es erneut.</span>
              </>
            )}
            {!currentQuestionRecording && uploadStatus === 'idle' && !isRecording && (
              <>
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span className="text-orange-600">Bitte nehmen Sie eine Antwort auf, bevor Sie fortfahren</span>
              </>
            )}
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
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled={currentQuestionIndex === 0 || isRecording || isUploading}
              onClick={() => {
                setCurrentQuestionIndex(prev => prev - 1)
                setUploadStatus('idle')
                setHasJustRecorded(false)
                setIsFirstRecordingForQuestion(false)
                setTimeRemaining(0)
              }}
            >
              Zurück
            </Button>
            <Button 
              className="flex-1 bg-slate-800 hover:bg-slate-700" 
              onClick={nextQuestion} 
              disabled={isRecording || isUploading || !canProceed}
            >
              {currentQuestionIndex === questions.length - 1 ? "Abschließen" : "Nächste Frage"}
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="text-sm text-gray-500">
            Gespeicherte Antworten: {recordings.filter(r => r.uploaded).length} von {questions.length}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
