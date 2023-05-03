# Base image
FROM node:latest

# Set working directory
WORKDIR /app

# Install required tools for environment
RUN apt-get update && apt-get install -y python3.6 python3-pip build-essential

# Copy package.json and package-lock.json for backend
COPY backend/package*.json ./

# Install dependencies for backend
RUN npm install

# Copy package.json and package-lock.json for frontend
COPY frontend/package*.json ./

# Install dependencies for frontend
RUN npm install

# Set environment variable
ENV GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS

# Copy the project files
COPY . .

# Build the frontend
# RUN npm run build

# Run the backend
EXPOSE 3000

CMD ["npm", "run", "--prefix", "backend", "dev"]
