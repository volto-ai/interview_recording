"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ReCAPTCHA from "react-google-recaptcha"
import { RECAPTCHA_CONFIG } from "@/lib/recaptcha"

interface CaptchaProps {
  onVerify: (isValid: boolean) => void
}

export default function Captcha({ onVerify }: CaptchaProps) {
  const [isVerified, setIsVerified] = useState(false)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  const handleCaptchaChange = (token: string | null) => {
    if (token) {
      setIsVerified(true)
      onVerify(true)
    } else {
      setIsVerified(false)
      onVerify(false)
    }
  }

  const handleRefresh = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset()
    }
    setIsVerified(false)
    onVerify(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Sicherheitsüberprüfung</CardTitle>
        <CardDescription className="text-center">
          Bitte bestätigen Sie, dass Sie kein Roboter sind, um fortzufahren
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={RECAPTCHA_CONFIG.siteKey}
            onChange={handleCaptchaChange}
            theme="light"
            size="normal"
          />
        </div>
        
        {isVerified && (
          <div className="text-green-600 text-center text-sm">
            ✓ Verifizierung erfolgreich! Sie können fortfahren.
          </div>
        )}

        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="text-sm"
          >
            Neue Überprüfung
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          Diese Website ist durch reCAPTCHA geschützt und unterliegt der 
          <a 
            href="https://policies.google.com/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline ml-1"
          >
            Datenschutzerklärung
          </a> und den 
          <a 
            href="https://policies.google.com/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline ml-1"
          >
            Nutzungsbedingungen
          </a> von Google.
        </div>
      </CardContent>
    </Card>
  )
} 