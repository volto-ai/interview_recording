from flask import Flask, request, jsonify, send_file, redirect
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from models import InterviewConfigurator, InterviewResponse, Question, Demographics
from storage_utils import (
    save_interview_config, 
    get_interview_config, 
    save_interview_response,
    upload_audio,
    get_all_campaigns,
    get_campaign_responses
)

app = Flask(__name__)
CORS(app)

# Temporary storage for recordings before upload
UPLOAD_FOLDER = '../recordings'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    """Create a new interview campaign"""
    try:
        print("\n=== CREATE CAMPAIGN ENDPOINT CALLED ===")
        data = request.json
        print(f"Received data (frontend payload): {data}")
        
        generated_campaign_id = str(uuid.uuid4())
        print(f"Generated campaign_id: {generated_campaign_id}")
        config = InterviewConfigurator(**data)
        
        config_dict = config.model_dump()
        
        config_dict['campaign_id'] = generated_campaign_id
        config_dict['created_at'] = config_dict['created_at'].isoformat()
        
        save_interview_config(config_dict) # save_interview_config returns the id, but we already have it
        print(f"Campaign saved with ID: {generated_campaign_id}")
        
        # Return the generated campaign_id to the frontend
        return jsonify({"campaign_id": generated_campaign_id, "message": "Campaign created successfully"}), 201
    except Exception as e:
        print(f"ERROR in create_campaign: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

@app.route('/api/campaigns/<campaign_id>', methods=['PUT'])
def update_campaign(campaign_id):
    """Update an existing interview campaign"""
    try:
        print(f"\n=== UPDATE CAMPAIGN ENDPOINT CALLED for campaign_id: {campaign_id} ===")
        data_from_request = request.json
        print(f"Received data for update: {data_from_request}")

        data_for_model = data_from_request.copy()
        data_for_model['campaign_id'] = campaign_id # Override any campaign_id in body with ID from URL

        config = InterviewConfigurator(**data_for_model)
        config_dict_to_save = config.model_dump()

        save_interview_config(config_dict_to_save) # Reuses save_interview_config for upsert
        print(f"Campaign updated for ID: {campaign_id}")
        
        return jsonify({"campaign_id": campaign_id, "message": "Campaign updated successfully"}), 200
    except Exception as e:
        print(f"ERROR in update_campaign for ID {campaign_id}: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

@app.route('/api/campaigns', methods=['GET'])
def list_campaigns():
    """List all interview campaigns"""
    print("\\n=== LIST CAMPAIGNS ENDPOINT CALLED (/api/campaigns GET) ===")
    try:
        campaigns = get_all_campaigns()
        print(f"Data from get_all_campaigns(): {campaigns}") # LOG 1: What data is returned
        if not isinstance(campaigns, list):
            print(f"WARNING: get_all_campaigns() did not return a list. Type: {type(campaigns)}")
            # Potentially convert or handle if it's a known non-list type that's expected
        
        response_data = {"campaigns": campaigns}
        print(f"Data being sent to jsonify: {response_data}") # LOG 2: What's passed to jsonify
        
        jsonified_response = jsonify(response_data)
        print(f"JSONified response object: {jsonified_response}") # LOG 3: The response object itself
        print(f"JSONified response data: {jsonified_response.get_data(as_text=True)}") # LOG 4: The actual data in the response
        
        return jsonified_response, 200
    except Exception as e:
        print(f"ERROR in list_campaigns: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/campaigns/<campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """Get a specific campaign configuration"""
    try:
        config = get_interview_config(campaign_id)
        if config:
            return jsonify(config), 200
        return jsonify({"error": "Campaign not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recordings/upload', methods=['POST'])
def upload_recording():
    """Upload an audio recording"""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        campaign_id = request.form.get('campaign_id')
        participant_id = request.form.get('participant_id')
        question_id = request.form.get('question_id')
        
        if not all([campaign_id, participant_id, question_id]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Generate unique filename (from timestamp)
        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
        local_path = os.path.join(UPLOAD_FOLDER, filename)
        audio_file.save(local_path)
        
        # Upload to Firebase Storage
        firebase_path = f"recordings/{campaign_id}/{participant_id}/{question_id}/{filename}"
        public_url = upload_audio(local_path, firebase_path)
        
        # Clean up local file
        os.remove(local_path)
        
        return jsonify({
            "file_path": public_url,
            "firebase_path": firebase_path
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/interviews/submit', methods=['POST'])
def submit_interview():
    """Submit a complete interview response"""
    try:
        data = request.json
        print(f"Received data for submit_interview: {data}")
        response = InterviewResponse(
            campaign_id=data['campaign_id'],
            participant_id=data['participant_id'],
            demographics=Demographics(**data['demographics']),
            submitted_at=datetime.now().isoformat()
        )
        
        # Convert to dict for Firebase
        response_dict = response.model_dump()
        response_dict['submitted_at'] = response_dict['submitted_at'].isoformat()
        response_id = save_interview_response(response_dict)

        return jsonify({
            "success": True,
            "response_id": response_id,
            "message": "Interview submitted successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/campaigns/<campaign_id>/responses', methods=['GET'])
def get_campaign_responses_endpoint(campaign_id):
    """Get all responses for a specific campaign"""
    try:
        responses = get_campaign_responses(campaign_id)
        return jsonify({"responses": responses}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/audio/<filename>', methods=['GET'])
def serve_audio(filename):
    """Serve audio files from local storage"""
    try:
        # Import at function level to avoid circular import
        from storage_utils import AUDIO_FILES_DIR
        
        file_path = os.path.join(AUDIO_FILES_DIR, filename)
        if os.path.exists(file_path):
            return send_file(file_path, mimetype='audio/wav')
        return jsonify({"error": "Audio file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/screenout', methods=['POST'])
def handle_screenout():
    """Handle participant screenout"""
    try:
        data = request.json
        campaign_id = data.get('campaign_id')
        participant_id = data.get('participant_id')
        demographics = data.get('demographics', {})
        screenout_url = data.get('screenout_url')
        
        if not all([campaign_id, participant_id]):
            return jsonify({"error": "Missing required fields"}), 400
            
        # Create screenout response
        screenout_data = {
            "campaign_id": campaign_id,
            "participant_id": participant_id,
            "demographics": demographics,
            "screenout": True,
            "submitted_at": datetime.now().isoformat()
        }
        
        # Save to storage
        save_interview_response(screenout_data)
        
        return jsonify({
            "success": True,
            "message": "Screenout recorded successfully"
        }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=8000) 