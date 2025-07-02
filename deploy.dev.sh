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
    --allow-unauthenticated \
    --set-env-vars="ENVIRONMENT=dev" # In a real scenario, you might restrict this
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

# --- Read .env and prepare env vars for Cloud Run ---
ENV_FILE="frontend/.env"
DEV_ENV_FILE="frontend/.env.development"

# Check for development environment file first, then fall back to regular .env
if [ -f "$DEV_ENV_FILE" ]; then
  echo "📁 Using development environment file: $DEV_ENV_FILE"
  ENV_FILE="$DEV_ENV_FILE"
elif [ -f "$ENV_FILE" ]; then
  echo "📁 Using regular environment file: $ENV_FILE"
else
  echo "⚠️  No environment file found. Using default configuration."
  ENV_FILE=""
fi

ENV_VARS=""
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    # Ignore comments and empty lines
    if [[ ! "$key" =~ ^# && -n "$key" && -n "$value" ]]; then
      # Remove possible quotes and export as KEY=VALUE
      clean_key=$(echo "$key" | xargs)
      clean_value=$(echo "$value" | xargs | sed 's/^"//;s/"$//')
      if [ -z "$ENV_VARS" ]; then
        ENV_VARS="${clean_key}=${clean_value}"
      else
        ENV_VARS="${ENV_VARS},${clean_key}=${clean_value}"
      fi
    fi
  done < "$ENV_FILE"
fi

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
    --set-env-vars="NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL${ENV_VARS:+,$ENV_VARS}"

  echo "✅✅✅ Deployment Complete! ✅✅✅"
else
  echo "🏃 Skipping frontend deployment as requested."
fi

FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE_NAME" --platform=managed --region="$REGION" --format="value(status.url)")
echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL:  $BACKEND_URL" 