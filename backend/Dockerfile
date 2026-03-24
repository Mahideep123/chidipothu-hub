FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if any are needed (e.g., for motor/pymongo)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose the port Railway uses
EXPOSE 8080

# Command to run the application using Railway's $PORT variable
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}"]
