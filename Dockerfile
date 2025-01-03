# Use an official Node.js image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 80

# Environment variables (if not passed via docker-compose or CLI)
ENV MONGODB_URI=${MONGODB_URI}
ENV EMAIL_PASS=${EMAIL_PASS}
ENV SESSION_SECRET=${SESSION_SECRET}

# Start the application
CMD ["npm", "start"]