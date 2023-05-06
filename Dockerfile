# Base image
FROM node:latest

# Set working directory
WORKDIR /app

# Install required tools for environment
RUN apt-get update && apt-get install -y python3.6 python3-pip build-essential

# Set environment variable
ENV GOOGLE_APPLICATION_CREDENTIALS=$GOOGLE_APPLICATION_CREDENTIALS

# Copy the project files
COPY . .

# Install dependecies for backend
RUN npm --prefix ./backend install

# Compile backend to JS
RUN npx --prefix tsc

# Install dependecies for frontend
RUN npm --prefix ./frontend install

# Build the frontend
# RUN npm run build

# Run the backend
EXPOSE 3000

CMD ["npm", "run", "--prefix", "backend", "start"]
