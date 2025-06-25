#!/usr/bin/env python3
"""
CLI Testing Tool for Interview Recording Backend
Run this script to test all backend endpoints interactively.
"""

import requests
import json
import uuid
from datetime import datetime
import argparse
import sys
from typing import Dict, List

# Backend URL - adjust if needed
BASE_URL = "http://localhost:8000/api"

class BackendTester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
    
    def test_health(self) -> bool:
        """Test the health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            print(f"🏥 Health Check: {response.status_code}")
            print(f"   Response: {response.json()}")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False
    
    def create_test_campaign(self, campaign_name: str = None) -> str:
        """Create a test campaign"""
        campaign_id = f"test_campaign_{uuid.uuid4().hex[:8]}"
        campaign_name = campaign_name or f"Test Campaign {datetime.now().strftime('%H:%M:%S')}"
        campaign_data = {
            "id": campaign_id,
            "campaign_name": campaign_name,
            "campaign_description": "A test campaign created by the CLI tester.",
            "campaign_type": "interview",
            "questions": [
                {
                    "id": "q1",
                    "text": "What is your name and professional background?",
                    "time_limit_sec": 120,
                    "order": 1
                },
                {
                    "id": "q2", 
                    "text": "Describe a challenging project you've worked on.",
                    "time_limit_sec": 180,
                    "order": 2
                },
                {
                    "id": "q3",
                    "text": "What are your career goals for the next 5 years?",
                    "time_limit_sec": 90,
                    "order": 3
                }
            ],
            "customer_name": "CLI Test Corp",
            "completed_url": "http://example.com/completed",
            "quality_url": "http://example.com/quality",
            "screenout_url": "http://example.com/screened-out",
            "demographic_fields": [
                {"id": "age", "label": "Age", "type": "slider", "min": 18, "max": 99},
                {"id": "country", "label": "Country", "type": "text"}
            ],
            "screenout_questions": [
                {"id": "sq1", "text": "Do you have experience with Python?", "options": ["Yes", "No"]}
            ],
            "voice_capability": False
        }
        
        try:
            print(f"📝 Creating campaign: {campaign_name}")
            response = self.session.post(f"{self.base_url}/campaigns", json=campaign_data)
            print(f"   Status: {response.status_code}")
            result = response.json()
            print(f"   Response: {result}")
            
            if response.status_code == 201:
                print(f"✅ Campaign created successfully: {campaign_id}")
                return campaign_id
            else:
                print(f"❌ Failed to create campaign")
                return None
        except Exception as e:
            print(f"❌ Error creating campaign: {e}")
            return None
    
    def list_campaigns(self) -> List[Dict]:
        """List all campaigns"""
        try:
            print("📋 Listing all campaigns...")
            response = self.session.get(f"{self.base_url}/campaigns")
            print(f"   Status: {response.status_code}")
            result = response.json()
            
            if response.status_code == 200:
                campaigns = result.get('campaigns', [])
                print(f"   Found {len(campaigns)} campaigns:")
                for i, campaign in enumerate(campaigns, 1):
                    print(f"   {i}. {campaign.get('campaign_name', 'Unknown')} (ID: {campaign.get('id', 'Unknown')})")
                return campaigns
            else:
                print(f"❌ Failed to list campaigns: {result}")
                return []
        except Exception as e:
            print(f"❌ Error listing campaigns: {e}")
            return []
    
    def get_campaign(self, campaign_id: str) -> Dict:
        """Get a specific campaign"""
        try:
            print(f"🔍 Getting campaign: {campaign_id}")
            response = self.session.get(f"{self.base_url}/campaigns/{campaign_id}")
            print(f"   Status: {response.status_code}")
            result = response.json()
            
            if response.status_code == 200:
                print(f"✅ Campaign retrieved:")
                print(f"   Name: {result.get('campaign_name', 'Unknown')}")
                print(f"   Questions: {len(result.get('questions', []))}")
                print(f"   Created: {result.get('created_at', 'Unknown')}")
                return result
            else:
                print(f"❌ Failed to get campaign: {result}")
                return {}
        except Exception as e:
            print(f"❌ Error getting campaign: {e}")
            return {}
    
    def submit_test_interview(self, campaign_id: str) -> str:
        """Submit a test interview response"""
        participant_id = f"participant_{uuid.uuid4().hex[:8]}"
        
        interview_data = {
            "campaign_id": campaign_id,
            "participant_id": participant_id,
            "demographics": {
                "age": 28,
                "city": "San Francisco",
                "income_range": "75k-100k",
                "occupation": "Software Engineer"
            },
            "recordings": {
                "q1": [
                    {
                        "question_id": "q1",
                        "file_path": f"recordings/{campaign_id}/{participant_id}/q1/sample.wav",
                        "duration_sec": 85.5
                    }
                ],
                "q2": [
                    {
                        "question_id": "q2", 
                        "file_path": f"recordings/{campaign_id}/{participant_id}/q2/sample.wav",
                        "duration_sec": 165.2
                    }
                ],
                "q3": [
                    {
                        "question_id": "q3",
                        "file_path": f"recordings/{campaign_id}/{participant_id}/q3/sample.wav", 
                        "duration_sec": 78.9
                    }
                ]
            }
        }
        
        try:
            print(f"🎤 Submitting test interview for campaign: {campaign_id}")
            response = self.session.post(f"{self.base_url}/interviews/submit", json=interview_data)
            print(f"   Status: {response.status_code}")
            result = response.json()
            print(f"   Response: {result}")
            
            if response.status_code == 201:
                print(f"✅ Interview submitted successfully")
                return result.get('response_id', '')
            else:
                print(f"❌ Failed to submit interview")
                return None
        except Exception as e:
            print(f"❌ Error submitting interview: {e}")
            return None
    
    def get_campaign_responses(self, campaign_id: str) -> List[Dict]:
        """Get all responses for a campaign"""
        try:
            print(f"📊 Getting responses for campaign: {campaign_id}")
            response = self.session.get(f"{self.base_url}/campaigns/{campaign_id}/responses")
            print(f"   Status: {response.status_code}")
            result = response.json()
            
            if response.status_code == 200:
                responses = result.get('responses', [])
                print(f"✅ Found {len(responses)} responses")
                for i, resp in enumerate(responses, 1):
                    print(f"   {i}. Participant: {resp.get('participant_id', 'Unknown')}")
                    print(f"      Demographics: {resp.get('demographics', {})}")
                    recordings_count = sum(len(recs) for recs in resp.get('recordings', {}).values())
                    print(f"      Recordings: {recordings_count}")
                return responses
            else:
                print(f"❌ Failed to get responses: {result}")
                return []
        except Exception as e:
            print(f"❌ Error getting responses: {e}")
            return []
    
    def run_full_test_suite(self):
        """Run a complete test of all endpoints"""
        print("🧪 Running Full Test Suite")
        print("=" * 50)
        
        # 1. Health check
        if not self.test_health():
            print("❌ Backend is not running. Please start the backend first.")
            return False
        
        print()
        
        # 2. Create a test campaign
        campaign_id = self.create_test_campaign()
        if not campaign_id:
            print("❌ Test suite failed at campaign creation")
            return False
        
        print()
        
        # 3. List campaigns
        campaigns = self.list_campaigns()
        
        print()
        
        # 4. Get the specific campaign
        campaign = self.get_campaign(campaign_id)
        
        print()
        
        # 5. Submit a test interview
        response_id = self.submit_test_interview(campaign_id)
        
        print()
        
        # 6. Get campaign responses
        responses = self.get_campaign_responses(campaign_id)
        
        print()
        print("🎉 Full test suite completed!")
        print(f"   Created campaign: {campaign_id}")
        print(f"   Submitted interview response: {response_id}")
        print(f"   Total campaigns: {len(campaigns)}")
        print(f"   Total responses: {len(responses)}")
        
        return True

def interactive_menu():
    """Interactive CLI menu"""
    tester = BackendTester()
    
    while True:
        print("\n" + "="*60)
        print("🎯 Interview Recording Backend CLI Tester")
        print("="*60)
        print("1. 🏥 Test health endpoint")
        print("2. 📝 Create test campaign")
        print("3. 📋 List all campaigns")
        print("4. 🔍 Get specific campaign")
        print("5. 🎤 Submit test interview")
        print("6. 📊 Get campaign responses")
        print("7. 🧪 Run full test suite")
        print("8. 🚪 Exit")
        print()
        
        choice = input("Select an option (1-8): ").strip()
        
        if choice == '1':
            tester.test_health()
        
        elif choice == '2':
            name = input("Campaign name (or press Enter for auto-generated): ").strip()
            campaign_id = tester.create_test_campaign(name if name else None)
        
        elif choice == '3':
            tester.list_campaigns()
        
        elif choice == '4':
            campaign_id = input("Enter campaign ID: ").strip()
            if campaign_id:
                tester.get_campaign(campaign_id)
            else:
                print("❌ Campaign ID is required")
        
        elif choice == '5':
            campaign_id = input("Enter campaign ID: ").strip()
            if campaign_id:
                tester.submit_test_interview(campaign_id)
            else:
                print("❌ Campaign ID is required")
        
        elif choice == '6':
            campaign_id = input("Enter campaign ID: ").strip()
            if campaign_id:
                tester.get_campaign_responses(campaign_id)
            else:
                print("❌ Campaign ID is required")
        
        elif choice == '7':
            tester.run_full_test_suite()
        
        elif choice == '8':
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid option. Please select 1-8.")

def main():
    parser = argparse.ArgumentParser(description='CLI Testing Tool for Interview Recording Backend')
    parser.add_argument('--auto', action='store_true', help='Run full test suite automatically')
    parser.add_argument('--health', action='store_true', help='Just test health endpoint')
    parser.add_argument('--create-campaign', type=str, help='Create a campaign with given name')
    parser.add_argument('--list-campaigns', action='store_true', help='List all campaigns')
    
    args = parser.parse_args()
    
    tester = BackendTester()
    
    if args.health:
        tester.test_health()
    elif args.auto:
        tester.run_full_test_suite()
    elif args.create_campaign:
        tester.create_test_campaign(args.create_campaign)
    elif args.list_campaigns:
        tester.list_campaigns()
    else:
        interactive_menu()

if __name__ == "__main__":
    main() 