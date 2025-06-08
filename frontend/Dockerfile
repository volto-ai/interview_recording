# Stage 1: Build the Next.js app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY frontend/ .

# Build the app
# The NEXT_PUBLIC_BACKEND_URL will be passed in during the build phase
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
RUN npm run build

# Stage 2: Serve the app with a static server
FROM node:18-alpine

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
# The port Cloud Run will listen on
ENV PORT=8080

# Copy only the necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

CMD ["npm", "start"] 