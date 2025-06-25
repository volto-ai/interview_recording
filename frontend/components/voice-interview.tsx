"use client"

import { Label } from "@/components/ui/label"
import { getApiUrl, getApiHeaders } from "@/utils/api"

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
        headers: getApiHeaders(),
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
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  // Determine mic button state
  const isUploaded = !!currentQuestionRecording?.uploaded

  let micButtonClass = "w-28 h-28 rounded-full bg-slate-800 hover:bg-slate-700 p-0"
  let micButtonIcon = <Mic className="h-12 w-12 text-white" />
  if (isRecording) {
    micButtonClass = "w-28 h-28 rounded-full bg-red-500 hover:bg-red-600 p-0"
    micButtonIcon = <MicOff className="h-12 w-12 text-white" />
  } else if (isUploaded) {
    micButtonClass = "w-28 h-28 rounded-full bg-green-600 hover:bg-green-700 p-0"
    micButtonIcon = <CheckCircle className="h-12 w-12 text-white" />
  }

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
    <div className="max-w-2xl mx-auto w-full pt-8 pb-12">
      {/* Zeit-Limit Card */}
      <div className="flex justify-end mb-4">
        <Card className="py-1 px-4 flex items-center gap-2 shadow-none border border-gray-200 bg-white">
          <Clock className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-700 font-mono">Zeit-Limit: <b>{formatTime(currentQuestion.time_limit_sec)}</b></span>
        </Card>
      </div>

      {/* Frage Card */}
      <Card className="mb-6 bg-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Frage {currentQuestionIndex + 1} von {questions.length}</CardTitle>
        </CardHeader>
        <CardContent className="text-lg text-gray-900">
          {currentQuestion.text}
        </CardContent>
      </Card>

      {/* Aufnahme Card */}
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center py-10">
          {/* Countdown Timer (if recording) */}
          {isRecording && (
            <div className="flex flex-col items-center space-y-2 mb-4">
              <div className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-black'}`}>{formatTime(timeRemaining)}</div>
              <div className="text-sm text-gray-500">Zeit verbleibt</div>
            </div>
          )}

          {/* Mic Button */}
          <div className="rounded-full w-28 h-28 flex items-center justify-center mb-6 shadow-md" style={{ background: 'transparent' }}>
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
              className={micButtonClass}
              style={{ boxShadow: 'none' }}
            >
              {micButtonIcon}
            </Button>
          </div>
          <div className="text-xl font-semibold text-slate-800 mb-2">{isRecording ? 'Aufnahme läuft' : 'Bereit für Aufnahme'}</div>
          <div className="text-gray-500 text-center text-sm mb-2">Klicken Sie auf das Mikrofon, um Ihre Antwort aufzunehmen.</div>

          {/* Status Indicator */}
          <div className="flex items-center justify-center space-x-2 mb-2">
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
          </div>

          {/* Waveform Visualization */}
          {isRecording && (
            <div className="flex items-center justify-center space-x-1 h-20 mb-2">
              {waveformData.map((height, index) => (
                <div
                  key={index}
                  className="bg-gray-400 rounded-full transition-all duration-75"
                  style={{ width: "4px", height: `${Math.max(4, height * 0.6)}px` }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 gap-4">
        <Button
          variant="outline"
          className="px-8"
          disabled={currentQuestionIndex === 0 || isRecording || isUploading}
          onClick={() => {
            setCurrentQuestionIndex(prev => prev - 1)
            setUploadStatus('idle')
            setHasJustRecorded(false)
            setIsFirstRecordingForQuestion(false)
            setTimeRemaining(0)
          }}
        >
          ← Zurück
        </Button>
        <Button
          className="bg-slate-800 hover:bg-slate-900 text-white px-8"
          onClick={nextQuestion}
          disabled={isRecording || isUploading || !canProceed}
        >
          {isLastQuestion ? "Abschließen" : "Nächste Frage"} {isLastQuestion && <span className="ml-2">✓</span>}
        </Button>
      </div>
    </div>
  )
}
