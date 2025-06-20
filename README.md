# Interview Recording System

## Features

- Create and manage interview campaigns
- Record and upload audio responses
- Store and retrieve interview recordings
- Firebase integration for data persistence (TODO: for now mocked with local storage)
- RESTful API endpoints for campaign management

## System Architecture

```mermaid
graph TD
    A[Client Application] -->|HTTP Requests| B[Flask Backend]
    B -->|Store Data| C[Local Storage]
    B -->|Store Audio| D[Local Storage]
    
    subgraph Backend_Services
        B -->|Process| F[Interview Manager]
        B -->|Handle| G[Audio Processing]
        B -->|Manage| H[Campaign Manager]
    end
    
    subgraph Data_Flow
        I[Interview Config] -->|Create| J[Campaign]
        J -->|Collect| K[Responses]
        K -->|Store| L[Recordings]
    end
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd interview_recording
```

2. Start the backend server:
```bash
./start.sh
```

3. The server will start on `http://localhost:8000`

## Deployment

1. Login to Google Cloud:
```bash
gcloud auth login
```

2. Deploy the application:
```bash
./deploy.sh
```

To deploy only the frontend:
```bash
./deploy.sh --fe
```

To deploy only the backend:
```bash
./deploy.sh --be
```

## Running the Application

1. Run the cli_test.py to test the backend (feel free to mess around):
```bash
python backend/cli_test.py
```

2. Run the interactive interview (there is already a sample campaign created):
```bash
python backend/interactive_interview.py
```


## API Endpoints

### Campaign Management
- `POST /api/campaigns` - Create a new interview campaign
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/<campaign_id>` - Get specific campaign details

### Recording Management
- `POST /api/recordings/upload` - Upload an audio recording
- `GET /api/audio/<filename>` - Serve audio files

### Interview Management
- `POST /api/interviews/submit` - Submit a complete interview response
- `GET /api/campaigns/<campaign_id>/responses` - Get all responses for a campaign

## Project Structure

```
interview_recording/
├── backend/
│   ├── main.py              # Main Flask application
│   ├── models.py            # Data models
│   ├── storage_utils.py     # Storage utilities
│   ├── firestore_repository.py  # Firestore data access
│   ├── cli_test.py         # CLI testing utility
│   └── Dockerfile          # Backend container configuration
├── frontend/
│   ├── app/                # Next.js application
│   │   ├── admin/         # Admin dashboard
│   │   ├── interview/     # Interview interface
│   │   └── api/          # API routes
│   ├── components/        # React components
│   ├── utils/            # Utility functions
│   ├── public/           # Static assets
│   └── Dockerfile        # Frontend container configuration
├── requirements.txt       # Python dependencies
├── cloudbuild.yaml       # Cloud Build configuration
├── deploy.sh            # Deployment script
└── README.md            # Project documentation
```

## Resources:
DEV Stage
 Firestore: https://console.firebase.google.com/u/0/project/dev-volto-interviews/firestore/databases/-default-/data
 GCP Project: dev-volto-interviews 