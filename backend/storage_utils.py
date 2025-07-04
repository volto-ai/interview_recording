import os
import json
import uuid
from typing import Dict, Any
from datetime import datetime
import shutil

# Import Firestore repository and Enum
from firestore_repository import FirestoreRepository, CollectionName

# Import Firebase Storage
try:
    from firebase_admin import storage
    firebase_storage_available = True
except ImportError:
    firebase_storage_available = False
    raise RuntimeError("Warning: Firebase Storage not available")

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

    campaign_id = config_data.get('id')
    if not campaign_id:
        raise ValueError("id must be present in config_data")

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

def delete_interview_config(campaign_id: str) -> bool:
    """Delete an interview configuration from Firestore."""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot delete campaign.")
    
    try:
        firestore_repo.delete(CollectionName.CAMPAIGNS, campaign_id)
        print(f"Deleted campaign {campaign_id} from Firestore collection: {CollectionName.CAMPAIGNS.value}")
        return True
    except Exception as e:
        print(f"Error deleting campaign {campaign_id} from Firestore: {e}")
        return False

def get_campaign_responses(campaign_id: str) -> list:
    """Get all responses for a specific campaign from Firestore."""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot get responses.")
    
    try:
        responses = firestore_repo.query(CollectionName.INTERVIEWS, 'campaign_id', '==', campaign_id)
        print(f"Retrieved {len(responses)} responses for campaign {campaign_id} from Firestore.")
        return responses
    except Exception as e:
        print(f"Error retrieving responses for campaign {campaign_id} from Firestore: {e}")
        return []

def get_campaign_stats(campaign_id: str) -> list:
    """Calculate and return statistics for a given campaign."""
    responses = get_campaign_responses(campaign_id)
    
    total_submissions = len(responses)
    completed_interviews = sum(1 for r in responses if not r.get('screenout'))
    screenouts = total_submissions - completed_interviews
    
    completion_rate = (completed_interviews / total_submissions) if total_submissions > 0 else 0
    
    stats = [
        {"metric": "Total Submissions", "value": total_submissions},
        {"metric": "Completed Interviews", "value": completed_interviews},
        {"metric": "Screen-outs", "value": screenouts},
        {"metric": "Completion Rate", "value": round(completion_rate * 100, 2)}
    ]
    
    return stats

def get_overall_stats() -> dict:
    """Calculate and return overall statistics across all campaigns."""
    campaigns = get_all_campaigns()
    # This assumes we need all responses to calculate overall stats.
    # This could be inefficient if there are many responses.
    # A more advanced implementation might use direct aggregation in Firestore.
    
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized.")
        
    all_responses = firestore_repo.list_all(CollectionName.INTERVIEWS)
    
    total_campaigns = len(campaigns)
    total_participants = len(all_responses) # Note: This is total submissions, not unique participants.
    total_screenouts = sum(1 for r in all_responses if r.get('screenout'))
    
    return {
        "total_campaigns": total_campaigns,
        "total_participants": total_participants,
        "total_screenouts": total_screenouts,
    }

def save_interview_response(response_data: Dict[str, Any]) -> str:
    """Save interview response to Firestore"""
    if not firestore_repo:
        raise ConnectionError("FirestoreRepository is not initialized. Cannot save interview response.")

    try:
        # Generate a unique ID if not provided
        response_id = response_data.get('id', str(uuid.uuid4()))
        response_data['id'] = response_id
        response_data['submitted_at'] = datetime.now().isoformat()
        
        print(f"\n=== SAVING INTERVIEW RESPONSE TO FIRESTORE ===")
        print(f"Response ID: {response_id}")
        print(f"Campaign ID: {response_data.get('campaign_id', 'N/A')}")
        print(f"Participant ID: {response_data.get('participant_id', 'N/A')}")
        print(f"Submitted at: {response_data.get('submitted_at', 'N/A')}")
        
        # Log demographics data
        demographics = response_data.get('demographics', {})
        if demographics:
            print(f"Demographics data:")
            for key, value in demographics.items():
                print(f"  - {key}: {value}")
        else:
            print(f"Demographics: None or empty")
        
        # Log screenout status
        screenout = response_data.get('screenout', False)
        print(f"Screenout: {screenout}")
        
        print(f"Collection: {CollectionName.INTERVIEWS.value}")
        print(f"Full response data: {response_data}")
        
        # Save to Firestore
        firestore_repo.create(CollectionName.INTERVIEWS, response_id, response_data)
        print(f"✅ Successfully saved interview response to Firestore")
        print(f"=== END SAVING INTERVIEW RESPONSE ===\n")
        return response_id
    except Exception as e:
        print(f"❌ Error saving interview response to Firestore: {e}")
        print(f"Response data that failed to save: {response_data}")
        import traceback
        traceback.print_exc()
        raise RuntimeError(f"Failed to save interview response to Firestore.") from e

def upload_audio(local_path: str, storage_path: str) -> str:
    """Upload audio file to Firebase Storage and return the public URL"""
    try:
        # Get Firebase Storage bucket
        bucket = storage.bucket()
        
        # Create blob with the specified path
        blob = bucket.blob(storage_path)
        
        # Upload the file
        with open(local_path, 'rb') as audio_file:
            blob.upload_from_file(audio_file, content_type='audio/wav')
        
        public_url = f"https://storage.googleapis.com/{bucket.name}/{storage_path}"
        
        print(f"Successfully uploaded audio file to Firebase Storage: {storage_path}")
        print(f"Public URL: {public_url}")
    
        return public_url
        
    except Exception as e:
        print(f"Error uploading to Firebase Storage: {e}")
        return None

def get_campaign_responses_old(campaign_id: str) -> list:
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