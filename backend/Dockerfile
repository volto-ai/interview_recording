# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# The build context is the project root. Copy the requirements file first.
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the backend application code from the 'backend' directory
# into the container's /app directory.
COPY backend/ .

# The port the container will listen on. Cloud Run will map to this.
EXPOSE 8000

# Use Gunicorn to run the application. This is a production-grade server.
# It will look for the 'app' object in the 'main.py' file.
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "main:app"] 