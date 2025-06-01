from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
from datetime import datetime
from models import InterviewConfigurator, InterviewResponse
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
        print(f"Received data: {data}")
        
        config = InterviewConfigurator(**data)
        print(f"Successfully created InterviewConfigurator: {config}")
        
        # Convert to dict for Firebase
        config_dict = config.model_dump()
        config_dict['created_at'] = config_dict['created_at'].isoformat()
        
        campaign_id = save_interview_config(config_dict)
        print(f"Campaign saved with ID: {campaign_id}")
        
        return jsonify({"campaign_id": campaign_id, "message": "Campaign created successfully"}), 201
    except Exception as e:
        print(f"ERROR in create_campaign: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

@app.route('/api/campaigns', methods=['GET'])
def list_campaigns():
    """List all interview campaigns"""
    try:
        campaigns = get_all_campaigns()
        return jsonify({"campaigns": campaigns}), 200
    except Exception as e:
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
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.wav"
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
        response = InterviewResponse(**data)
        
        # Convert to dict for Firebase
        response_dict = response.model_dump()
        response_dict['submitted_at'] = response_dict['submitted_at'].isoformat()
        
        # Convert recording timestamps
        for question_id, recordings in response_dict['recordings'].items():
            for recording in recordings:
                recording['created_at'] = recording['created_at'].isoformat()
        
        response_id = save_interview_response(response_dict)
        return jsonify({
            "response_id": response_id,
            "message": "Interview submitted successfully"
        }), 201
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

if __name__ == '__main__':
    app.run(debug=True, port=8000) 