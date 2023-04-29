# Base image
FROM node:14-alpine

# Set working directory
WORKDIR /app

# Install dependencies for building mediasoup
RUN apk add --no-cache python3 make g++

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --production

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --production

# Copy the rest of the code
COPY . .

# Build the frontend
RUN cd frontend && npm run build

# Expose ports
EXPOSE 3000
EXPOSE 4000

# Start the server
CMD ["npm", "run", "dev"]
