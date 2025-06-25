import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, CheckCircle } from "lucide-react";
import React from "react";

interface Step {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface LandingPageProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  privacyTitle: string;
  privacyText: string;
  steps: Step[];
  onStart: () => void;
  startLabel?: string;
  buttonClassName?: string;
  buttonBelowCard?: boolean;
}

export default function LandingPage({
  icon,
  title,
  subtitle,
  privacyTitle,
  privacyText,
  steps,
  onStart,
  startLabel = "Starten",
  buttonClassName,
  buttonBelowCard = false,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          {icon && <div>{icon}</div>}
          <h1 className="text-4xl font-bold mt-4 mb-2 text-center">{title}</h1>
          <p className="text-lg text-muted-foreground text-center">{subtitle}</p>
        </div>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">{privacyTitle}</span>
            </div>
            <CardDescription className="mt-2 text-green-700">{privacyText}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>Was Sie erwartet:</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-4 mb-6">
              {steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  {step.icon ? (
                    <span className="mt-1">{step.icon}</span>
                  ) : (
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-1" />
                  )}
                  <div>
                    <span className="font-semibold">{step.title}</span>
                    {step.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {!buttonBelowCard && (
              <button
                onClick={onStart}
                className={buttonClassName || "w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold text-lg"}
              >
                {startLabel}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
      {buttonBelowCard && (
        <button
          onClick={onStart}
          className={
            (buttonClassName || "bg-blue-600 hover:bg-blue-700 text-white") +
            " w-full max-w-2xl mx-auto mt-8 py-4 rounded font-semibold text-lg"
          }
        >
          {startLabel}
        </button>
      )}
    </div>
  );
} 