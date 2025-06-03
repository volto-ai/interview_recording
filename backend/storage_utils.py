import os
import json
import uuid
from typing import Dict, Any
from datetime import datetime
import shutil

# Import Firestore repository and Enum
from firestore_repository import FirestoreRepository, CollectionName

try:
    firestore_repo = FirestoreRepository()
    print("FirestoreRepository initialized successfully in storage_utils.")
except RuntimeError as e:
    print(f"FATAL: Failed to initialize FirestoreRepository in storage_utils: {e}")
    # Depending on the application's needs, you might want to exit or raise further
    # For now, it will print the error, and subsequent Firestore operations will fail if repo is None.
    firestore_repo = None 

# Create directories for local storage (still used for responses and audio)
DATA_DIR = os.path.join(os.path.dirname(__file__), 'local_data')
INTERVIEW_CONFIGS_DIR = os.path.join(DATA_DIR, 'interview_configs') # Keep for now, may be removed later
INTERVIEW_RESPONSES_DIR = os.path.join(DATA_DIR, 'interview_responses')
AUDIO_FILES_DIR = os.path.join(DATA_DIR, 'audio_files')

# Create directories if they don't exist
# Ensure INTERVIEW_CONFIGS_DIR is still created if other functions depend on it, or remove if fully deprecated
for directory in [DATA_DIR, INTERVIEW_CONFIGS_DIR, INTERVIEW_RESPONSES_DIR, AUDIO_FILES_DIR]:
    os.makedirs(directory, exist_ok=True)

def save_interview_config(config_data: Dict[str, Any]) -> str:
    """Save interview configuration to Firestore."""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot save campaign.")

    campaign_id = config_data.get('campaign_id')
    if not campaign_id:
        raise ValueError("campaign_id must be present in config_data")

    try:
        firestore_repo.create(CollectionName.CAMPAIGNS, campaign_id, config_data)
        print(f"Saved interview config to Firestore, collection: {CollectionName.CAMPAIGNS.value}, id: {campaign_id}")
        return campaign_id
    except Exception as e:
        print(f"Error saving interview config to Firestore: {e}")
        raise RuntimeError(f"Failed to save campaign {campaign_id} to Firestore.") from e

def get_all_campaigns() -> list:
    """Get all interview campaigns from Firestore."""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot get campaigns.")
    
    try:
        campaigns = firestore_repo.list_all(CollectionName.CAMPAIGNS)
        print(f"Retrieved {len(campaigns)} campaigns from Firestore collection: {CollectionName.CAMPAIGNS.value}")
        return campaigns
    except Exception as e:
        print(f"Error retrieving campaigns from Firestore: {e}")
        return []
    

def get_interview_config(campaign_id: str) -> Dict[str, Any]:
    """Retrieve interview configuration from Firestore"""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot get campaign.")
    
    try:
        campaign = firestore_repo.read(CollectionName.CAMPAIGNS, campaign_id)
        print(f"Retrieved campaign {campaign_id} from Firestore collection: {CollectionName.CAMPAIGNS.value}")
        return campaign
    except Exception as e:
        print(f"Error retrieving campaign {campaign_id} from Firestore: {e}")
        return None
    
    


def save_interview_response(response_data: Dict[str, Any]) -> str:
    """Save interview response to Firestore"""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot save interview response.")

    try:
        # Generate a unique ID if not provided
        response_id = response_data.get('id', str(uuid.uuid4()))
        response_data['id'] = response_id
        response_data['submitted_at'] = datetime.now().isoformat()
        
        # Save to Firestore
        firestore_repo.create(CollectionName.INTERVIEWS, response_id, response_data)
        print(f"Saved interview response to Firestore, collection: {CollectionName.INTERVIEWS.value}, id: {response_id}")
        return response_id
    except Exception as e:
        print(f"Error saving interview response to Firestore: {e}")
        raise RuntimeError(f"Failed to save interview response to Firestore.") from e

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
print("Using Firestore for data persistence")
print(f"Data directory: {DATA_DIR}") 