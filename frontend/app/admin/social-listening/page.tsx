'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus } from 'lucide-react';

export default function SocialListeningPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Listening</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze social media conversations and trends.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Social Listening Projects
          </CardTitle>
          <CardDescription>
            Track brand mentions, analyze sentiment, and gather insights from social media platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="text-muted-foreground mt-1">
              Get started by creating a new social listening project.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 