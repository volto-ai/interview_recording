#!/bin/bash

# Exit on error
set -e

# --- Configuration ---
PROJECT_ID="dev-volto-interviews"
REGION="europe-west3"
REPOSITORY="interview-recording"

BACKEND_IMAGE_NAME="backend"
BACKEND_SERVICE_NAME="interview-backend"

FRONTEND_IMAGE_NAME="frontend"
FRONTEND_SERVICE_NAME="interview-frontend"

# --- Argument Parsing ---  
DEPLOY_FRONTEND=true
DEPLOY_BACKEND=true

for arg in "$@"
do
    case $arg in
        --fe)
        DEPLOY_FRONTEND=true
        DEPLOY_BACKEND=false
        shift
        ;;
        --be)
        DEPLOY_FRONTEND=false
        DEPLOY_BACKEND=true
        shift
        ;;
    esac
done

# --- Common Functions ---
build_and_push() {
  local service_name=$1
  local dockerfile_path=$2
  local image_tag="europe-west3-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service_name"
  
  echo "--- Building $service_name image for linux/amd64 ---"
  docker build --platform=linux/amd64 -t "$image_tag" -f "$dockerfile_path" .
  
  echo "--- Pushing $service_name image ---"
  docker push "$image_tag"
}

# --- Backend Deployment (Conditional) ---
if [ "$DEPLOY_BACKEND" = true ]; then
  echo "🚀 Starting Backend Deployment..."
  build_and_push "$BACKEND_IMAGE_NAME" "backend/Dockerfile"

  echo "--- Deploying $BACKEND_SERVICE_NAME to Cloud Run ---"
  gcloud run deploy "$BACKEND_SERVICE_NAME" \
    --image="europe-west3-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$BACKEND_IMAGE_NAME" \
    --region="$REGION" \
    --platform=managed \
    --port=8000 \
    --allow-unauthenticated # In a real scenario, you might restrict this
else
  echo "🏃 Skipping backend deployment as requested."
fi

# --- Get Backend URL ---
echo "--- Fetching Backend URL ---"
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE_NAME" --platform=managed --region="$REGION" --format="value(status.url)")
if [ -z "$BACKEND_URL" ]; then
    echo "❌ Failed to get backend URL. The backend service '$BACKEND_SERVICE_NAME' might not be deployed yet. Run a full deployment first without the --fe flag."
    exit 1
fi
echo "✅ Backend URL: $BACKEND_URL"

# --- Frontend Deployment ---
if [ "$DEPLOY_FRONTEND" = true ]; then
  echo "🚀 Starting Frontend Deployment..."
  # Re-build the frontend image, passing the backend URL
  echo "--- Building $FRONTEND_IMAGE_NAME image with backend URL for linux/amd64 ---"
  FRONTEND_IMAGE_TAG="europe-west3-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$FRONTEND_IMAGE_NAME"
  docker build \
    --platform=linux/amd64 \
    -t "$FRONTEND_IMAGE_TAG" \
    --build-arg "NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL" \
    -f "frontend/Dockerfile" .

  echo "--- Pushing $FRONTEND_IMAGE_NAME image ---"
  docker push "$FRONTEND_IMAGE_TAG"

  echo "--- Deploying $FRONTEND_SERVICE_NAME to Cloud Run ---"
  gcloud run deploy "$FRONTEND_SERVICE_NAME" \
    --image="$FRONTEND_IMAGE_TAG" \
    --region="$REGION" \
    --platform=managed \
    --port=8080 \
    --allow-unauthenticated \
    --set-env-vars="NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL"

  echo "✅✅✅ Deployment Complete! ✅✅✅"
else
  echo "🏃 Skipping frontend deployment as requested."
fi

FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE_NAME" --platform=managed --region="$REGION" --format="value(status.url)")
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL:  $BACKEND_URL" 