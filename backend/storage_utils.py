import os
import json
import uuid
from typing import Dict, Any
from datetime import datetime
import shutil

# Create directories for local storage
DATA_DIR = os.path.join(os.path.dirname(__file__), 'local_data')
INTERVIEW_CONFIGS_DIR = os.path.join(DATA_DIR, 'interview_configs')
INTERVIEW_RESPONSES_DIR = os.path.join(DATA_DIR, 'interview_responses')
AUDIO_FILES_DIR = os.path.join(DATA_DIR, 'audio_files')

# Create directories if they don't exist
for directory in [DATA_DIR, INTERVIEW_CONFIGS_DIR, INTERVIEW_RESPONSES_DIR, AUDIO_FILES_DIR]:
    os.makedirs(directory, exist_ok=True)

def save_interview_config(config_data: Dict[str, Any]) -> str:
    """Save interview configuration to local storage"""
    campaign_id = config_data['campaign_id']
    file_path = os.path.join(INTERVIEW_CONFIGS_DIR, f"{campaign_id}.json")
    
    with open(file_path, 'w') as f:
        json.dump(config_data, f, indent=2)
    
    print(f"Saved interview config to: {file_path}")
    return campaign_id

def get_interview_config(campaign_id: str) -> Dict[str, Any]:
    """Retrieve interview configuration from local storage"""
    file_path = os.path.join(INTERVIEW_CONFIGS_DIR, f"{campaign_id}.json")
    
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            return json.load(f)
    return None

def save_interview_response(response_data: Dict[str, Any]) -> str:
    """Save interview response to local storage"""
    response_id = str(uuid.uuid4())
    response_data['id'] = response_id
    response_data['created_at'] = datetime.now().isoformat()
    
    file_path = os.path.join(INTERVIEW_RESPONSES_DIR, f"{response_id}.json")
    
    with open(file_path, 'w') as f:
        json.dump(response_data, f, indent=2)
    
    print(f"Saved interview response to: {file_path}")
    return response_id

def upload_audio(local_path: str, storage_path: str) -> str:
    """Copy audio file to local storage and return the path"""
    # Extract filename from storage_path
    filename = os.path.basename(storage_path)
    destination_path = os.path.join(AUDIO_FILES_DIR, filename)
    
    # Copy the file
    shutil.copy2(local_path, destination_path)
    
    # Return a URL-like path (in a real app, this would be served by the backend)
    public_url = f"/api/audio/{filename}"
    print(f"Saved audio file to: {destination_path}")
    return public_url

def get_all_campaigns() -> list:
    """Get all interview campaigns from local storage"""
    campaigns = []
    
    if os.path.exists(INTERVIEW_CONFIGS_DIR):
        for filename in os.listdir(INTERVIEW_CONFIGS_DIR):
            if filename.endswith('.json'):
                file_path = os.path.join(INTERVIEW_CONFIGS_DIR, filename)
                with open(file_path, 'r') as f:
                    campaign = json.load(f)
                    campaign['id'] = campaign.get('campaign_id', filename.replace('.json', ''))
                    campaigns.append(campaign)
    
    return campaigns

def get_campaign_responses(campaign_id: str) -> list:
    """Get all responses for a specific campaign from local storage"""
    responses = []
    
    if os.path.exists(INTERVIEW_RESPONSES_DIR):
        for filename in os.listdir(INTERVIEW_RESPONSES_DIR):
            if filename.endswith('.json'):
                file_path = os.path.join(INTERVIEW_RESPONSES_DIR, filename)
                with open(file_path, 'r') as f:
                    response = json.load(f)
                    if response.get('campaign_id') == campaign_id:
                        responses.append(response)
    
    return responses

# Initialize with a message
print("Using local disk storage for data persistence")
print(f"Data directory: {DATA_DIR}") 