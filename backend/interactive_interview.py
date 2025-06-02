#!/usr/bin/env python3
"""
Interactive Interview Experience
A complete CLI-based interview tool that simulates the real user experience.
"""

import os
import requests
import uuid
import time
import threading
from datetime import datetime
from typing import Dict, Optional
import wave
import sounddevice as sd
import numpy as np

# Backend URL
BASE_URL = "http://localhost:8000/api"

class AudioRecorder:
    """
    Records audio from the default input device
    It supports starting/stopping recording and saving the recorded
    audio to a WAV file.
    
    Attributes:
        sample_rate (int): The sample rate for audio recording in Hz (default: 44100)
        channels (int): Number of audio channels (default: 1 for mono)
        dtype (numpy.dtype): Data type for audio samples (default: np.int16)
        recording (bool): Flag indicating if recording is in progress
        audio_data (list): List to store recorded audio chunks
        _recording_thread (Thread): Thread object for background recording
        _stream (sd.InputStream): The audio input stream
    """
    
    def __init__(self):
        """Initialize the AudioRecorder with default audio settings."""
        self.sample_rate = 44100
        self.channels = 1
        self.dtype = np.int16
        self.recording = False
        self.audio_data = []
        self._recording_thread = None
        self._stream = None
        self._lock = threading.Lock()
        
    def start_recording(self):
        """
        This method starts a new recording session in a background thread.
        The recording continues until stop_recording() is called or an error occurs.
        Audio data is collected through the _audio_callback method.
        """
        if self.recording:
            return
            
        with self._lock:
            self.recording = True
            self.audio_data = []
        
        def record_callback():
            try:
                print("🎤 Recording started... (Press ENTER to stop)")
                self._stream = sd.InputStream(
                    samplerate=self.sample_rate,
                    channels=self.channels,
                    dtype=self.dtype,
                    callback=self._audio_callback
                )
                with self._stream:
                    while self.recording:
                        # sleep for 100ms to avoid CPU overload
                        sd.sleep(100)
            except Exception as e:
                print(f"❌ Recording error: {e}")
                with self._lock:
                    self.recording = False
        
        self._recording_thread = threading.Thread(target=record_callback, daemon=True)
        self._recording_thread.start()
    
    def _audio_callback(self, indata: np.ndarray, *_):
        """
        Process incoming audio data.
        
        Args:
            indata (numpy.ndarray): Input audio data
            *_ : Unused parameters required by sounddevice callback interface
        """
        if self.recording:
            with self._lock:
                self.audio_data.append(indata.copy())
    
    def stop_recording(self):
        """Stop the current recording session.
        
        This method stops the recording and waits for the recording thread to finish
        (with a timeout of 1 second).
        """
        with self._lock:
            self.recording = False
            
        if self._stream:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception as e:
                print(f"⚠️ Error closing stream: {e}")
            finally:
                self._stream = None
                
        if self._recording_thread:
            try:
                self._recording_thread.join(timeout=1.0)
            except Exception as e:
                print(f"⚠️ Error joining thread: {e}")
            finally:
                self._recording_thread = None
                
        print("🛑 Recording stopped")
    
    def save_recording(self, filename: str) -> float:
        """Save the recorded audio to a WAV file.
        
        Args:
            filename (str): Path where the WAV file should be saved
            
        Returns:
            float: Duration of the recording in seconds, or 0.0 if saving failed
        """
        if not self.audio_data:
            return 0.0
        
        try:
            audio_array = np.concatenate(self.audio_data, axis=0)
            duration = len(audio_array) / self.sample_rate
            
            # Only save if we have at least 0.5 seconds of audio
            if duration < 0.5:
                print("❌ Recording too short (minimum 0.5 seconds)")
                return 0.0
            
            with wave.open(filename, 'wb') as wf:
                wf.setnchannels(self.channels)
                # 2 bytes per sample for 16-bit audio
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_array.tobytes())
            
            return duration
        except Exception as e:
            print(f"❌ Error saving: {e}")
            return 0.0


class CountdownTimer:
    """
    A countdown timer that can be started and stopped.
    It prints the remaining time to the console.
    """
    def __init__(self, seconds: int, callback=None):
        self.seconds = seconds
        self.remaining = seconds
        self.running = False
        self.callback = callback
        
    def start(self):
        """Start the countdown timer"""
        self.running = True
        self.remaining = self.seconds
        
        def countdown():
            while self.running and self.remaining > 0:
                mins, secs = divmod(self.remaining, 60)
                timer_str = f"\r⏱️  Time remaining: {mins:02d}:{secs:02d}"
                print(timer_str, end='', flush=True)
                time.sleep(1)
                self.remaining -= 1
                
            if self.remaining <= 0 and self.running:
                print(f"\n⏰ Time's up!")
                if self.callback:
                    self.callback()
                    
        threading.Thread(target=countdown, daemon=True).start()
        
    def stop(self):
        """Stop the countdown timer"""
        self.running = False

class InteractiveInterview:
    """
    An interactive interview experience that can be used to record answers to questions.
    """
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.campaign = None
        self.current_question_index = 0
        self.recordings = {}
        self.participant_id = f"participant_{uuid.uuid4().hex[:8]}"
        self.recordings_dir = f"temp_recordings_{self.participant_id}"
        os.makedirs(self.recordings_dir, exist_ok=True)
        
    def get_campaign(self, campaign_id: str) -> bool:
        """Fetch campaign details"""
        try:
            response = self.session.get(f"{self.base_url}/campaigns/{campaign_id}")
            if response.status_code == 200:
                self.campaign = response.json()
                self.recordings = {q['id']: [] for q in self.campaign['questions']}
                return True
            else:
                print(f"❌ Campaign not found: {response.json()}")
                return False
        except Exception as e:
            print(f"❌ Error fetching campaign: {e}")
            return False
    
    def display_welcome(self):
        """Display welcome message and campaign info"""
        print("\n" + "="*80)
        print("🎯 INTERVIEW RECORDING SESSION")
        print("="*80)
        print(f"📋 Campaign: {self.campaign['campaign_name']}")
        print(f"👤 Participant ID: {self.participant_id}")
        print(f"📝 Total Questions: {len(self.campaign['questions'])}")
        print("\n💡 Instructions:")
        print("   • Each question has a time limit")
        print("   • You can record multiple attempts per question")
        print("   • Navigate with 'next', 'prev', 'goto [number]'")
        print("   • Type 'help' for more commands")
        print("   • Type 'submit' when ready to submit your responses")
        print("="*80)
    
    def display_question(self, question_index: int):
        """Display current question"""
        if question_index < 0 or question_index >= len(self.campaign['questions']):
            return False
            
        question = self.campaign['questions'][question_index]
        
        print(f"\n📋 Question {question_index + 1} of {len(self.campaign['questions'])}")
        print("="*60)
        print(f"❓ {question['text']}")
        print(f"⏱️  Time Limit: {question['time_limit_sec']} seconds")
        
        # Show existing recordings for this question
        recordings = self.recordings.get(question['id'], [])
        if recordings:
            print(f"🎤 Existing recordings: {len(recordings)}")
            for i, rec in enumerate(recordings, 1):
                print(f"   {i}. Duration: {rec['duration_sec']:.1f}s")
        else:
            print("🎤 No recordings yet")
            
        print("="*60)
        return True
    
    def record_answer(self, question_id: str, time_limit: int) -> Optional[Dict]:
        """Record answer for a question"""
        print("\n🎙️  RECORDING MODE")
        print("Press ENTER to start recording...")
        input()
        
        # Create audio recorder
        recorder = AudioRecorder()
        
        try:
            # Start countdown timer
            timer = CountdownTimer(time_limit, lambda: recorder.stop_recording())
            
            # Start recording in separate thread
            recording_thread = threading.Thread(target=recorder.start_recording, daemon=True)
            recording_thread.start()
            
            # Start timer
            timer.start()
            
            # Wait for user to stop recording
            try:
                input()  # Wait for ENTER to stop
                recorder.stop_recording()
                timer.stop()
            except KeyboardInterrupt:
                recorder.stop_recording()
                timer.stop()
                print("\n🛑 Recording cancelled")
                return None
            
            # Save recording
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{question_id}_{timestamp}.wav"
            filepath = os.path.join(self.recordings_dir, filename)
            
            duration = recorder.save_recording(filepath)
            
            if duration > 0:
                recording_data = {
                    "question_id": question_id,
                    "file_path": filepath,
                    "duration_sec": duration,
                    "created_at": datetime.now()
                }
                print(f"✅ Recording saved: {duration:.1f} seconds")
                return recording_data
            else:
                print("❌ No audio recorded")
                return None
        finally:
            # Ensure recording is stopped
            recorder.stop_recording()
    
    def upload_recording(self, recording_data: Dict, campaign_id: str) -> Optional[str]:
        """Upload recording to backend"""
        try:
            with open(recording_data['file_path'], 'rb') as audio_file:
                files = {'audio': audio_file}
                data = {
                    'campaign_id': campaign_id,
                    'participant_id': self.participant_id,
                    'question_id': recording_data['question_id']
                }
                
                response = self.session.post(
                    f"{self.base_url}/recordings/upload",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result['file_path']
                else:
                    print(f"❌ Upload failed: {response.json()}")
                    return None
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return None
    
    def collect_demographics(self) -> Dict:
        """Collect participant demographics"""
        print("\n👤 PARTICIPANT INFORMATION")
        print("="*50)
        
        demographics = {}
        demographics['age'] = int(input("Age: "))
        demographics['city'] = input("City: ")
        demographics['income_range'] = input("Income range (e.g., 50k-75k): ")
        demographics['occupation'] = input("Occupation: ")
        
        return demographics
    
    def submit_interview(self) -> bool:
        """Submit complete interview"""
        print("\n📤 Submitting interview...")
        
        # Collect demographics
        demographics = self.collect_demographics()
        
        # Prepare submission data
        submission_data = {
            "campaign_id": self.campaign['campaign_id'],
            "participant_id": self.participant_id,
            "demographics": demographics,
            "recordings": {}
        }
        
        # Upload all recordings and build submission
        for question_id, recordings in self.recordings.items():
            submission_data['recordings'][question_id] = []
            
            for recording in recordings:
                print(f"📤 Uploading recording for {question_id}...")
                uploaded_url = self.upload_recording(recording, self.campaign['campaign_id'])
                
                if uploaded_url:
                    submission_data['recordings'][question_id].append({
                        "question_id": question_id,
                        "file_path": uploaded_url,
                        "duration_sec": recording['duration_sec']
                    })
        
        # Submit to backend
        try:
            response = self.session.post(
                f"{self.base_url}/interviews/submit",
                json=submission_data
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Interview submitted successfully!")
                print(f"📋 Response ID: {result['response_id']}")
                return True
            else:
                print(f"❌ Submission failed: {response.json()}")
                return False
        except Exception as e:
            print(f"❌ Submission error: {e}")
            return False
    
    def show_help(self):
        """Show available commands"""
        print("\n📖 AVAILABLE COMMANDS:")
        print("="*50)
        print("🎤 record          - Record answer for current question")
        print("➡️  next            - Go to next question")
        print("⬅️  prev            - Go to previous question")
        print("🔢 goto [number]   - Go to specific question number")
        print("📋 status          - Show current progress")
        print("🔄 replay          - Show current question again")
        print("📤 submit          - Submit interview responses")
        print("❓ help            - Show this help")
        print("🚪 quit            - Exit interview")
        print("="*50)
    
    def show_status(self):
        """Show interview progress"""
        print("\n📊 INTERVIEW PROGRESS")
        print("="*50)
        total_questions = len(self.campaign['questions'])
        total_recordings = sum(len(recs) for recs in self.recordings.values())
        
        print(f"📋 Campaign: {self.campaign['campaign_name']}")
        print(f"👤 Participant: {self.participant_id}")
        print(f"📝 Current Question: {self.current_question_index + 1} / {total_questions}")
        print(f"🎤 Total Recordings: {total_recordings}")
        print()
        
        for i, question in enumerate(self.campaign['questions']):
            recordings_count = len(self.recordings.get(question['id'], []))
            status = "✅" if recordings_count > 0 else "⭕"
            print(f"{status} Q{i+1}: {recordings_count} recording(s)")
        print("="*50)
    
    def cleanup_temp_files(self):
        """Clean up temporary recording files"""
        try:
            import shutil
            if os.path.exists(self.recordings_dir):
                shutil.rmtree(self.recordings_dir)
        except Exception as e:
            print(f"⚠️  Could not clean up temp files: {e}")
    
    def run_interview(self, campaign_id: str):
        """Run the complete interactive interview"""
        try:
            # Fetch campaign
            if not self.get_campaign(campaign_id):
                return
            
            # Display welcome
            self.display_welcome()
            
            # Main interview loop
            while True:
                # Display current question
                if not self.display_question(self.current_question_index):
                    print("❌ Invalid question index")
                    break
                
                # Get user command
                command = input("\n💬 Enter command (type 'help' for options): ").strip().lower()
                
                if command == 'help':
                    self.show_help()
                
                elif command == 'record':
                    question = self.campaign['questions'][self.current_question_index]
                    recording = self.record_answer(question['id'], question['time_limit_sec'])
                    if recording:
                        self.recordings[question['id']].append(recording)
                
                elif command == 'next':
                    if self.current_question_index < len(self.campaign['questions']) - 1:
                        self.current_question_index += 1
                    else:
                        print("❌ Already at the last question")
                
                elif command == 'prev':
                    if self.current_question_index > 0:
                        self.current_question_index -= 1
                    else:
                        print("❌ Already at the first question")
                
                elif command.startswith('goto'):
                    try:
                        parts = command.split()
                        if len(parts) == 2:
                            question_num = int(parts[1]) - 1
                            if 0 <= question_num < len(self.campaign['questions']):
                                self.current_question_index = question_num
                            else:
                                print(f"❌ Question number must be between 1 and {len(self.campaign['questions'])}")
                    except ValueError:
                        print("❌ Invalid question number")
                
                elif command == 'status':
                    self.show_status()
                
                elif command == 'replay':
                    continue  # Will redisplay current question
                
                elif command == 'submit':
                    # Check if all questions have been answered
                    unanswered_questions = []
                    for i, question in enumerate(self.campaign['questions']):
                        if not self.recordings.get(question['id']):
                            unanswered_questions.append(i + 1)
                    
                    if unanswered_questions:
                        print("❌ Cannot submit: The following questions have not been answered:")
                        for q_num in unanswered_questions:
                            print(f"   • Question {q_num}")
                        continue
                    
                    confirm = input("🤔 Are you sure you want to submit? (yes/no): ").strip().lower()
                    if confirm in ['yes', 'y']:
                        if self.submit_interview():
                            break
                
                elif command in ['quit', 'exit']:
                    confirm = input("🤔 Are you sure you want to quit? (yes/no): ").strip().lower()
                    if confirm in ['yes', 'y']:
                        break
                
                else:
                    print("❌ Unknown command. Type 'help' for available commands.")
        
        finally:
            # Cleanup
            self.cleanup_temp_files()
            print("\n👋 Interview session ended. Thank you!")

def main():
    """Main function"""
    print("🎯 Interactive Interview Experience")
    print("=" * 60)
    
    # List available campaigns
    try:
        response = requests.get(f"{BASE_URL}/campaigns")
        if response.status_code == 200:
            campaigns = response.json().get('campaigns', [])
            if not campaigns:
                print("❌ No campaigns available. Please create a campaign first.")
                return
            
            print("📋 Available Campaigns:")
            for i, campaign in enumerate(campaigns, 1):
                print(f"   {i}. {campaign.get('campaign_name', 'Unknown')} (ID: {campaign.get('campaign_id', 'Unknown')})")
            
            print()
            campaign_id = input("Enter campaign ID: ").strip()
            
            if campaign_id:
                interview = InteractiveInterview()
                interview.run_interview(campaign_id)
            else:
                print("❌ Campaign ID is required")
        else:
            print("❌ Could not fetch campaigns. Is the backend running?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 