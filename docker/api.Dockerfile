ARG NODE_VERSION=24.12.0-alpine

# Use a lightweight Node.js image for building (customizable via ARG)
FROM node:${NODE_VERSION}

# Set the working directory inside the container
WORKDIR /app

# Copy package-related files first to leverage Docker's caching mechanism
COPY apps/backend/package.json apps/web/package-lock.json* ./

# Install project dependencies using npm ci (ensures a clean, reproducible install)
# RUN --mount=type=cache,target=/root/.npm npm ci
RUN npm install

# Copy the rest of the application source code into the container
COPY apps/backend/ .

EXPOSE 4000

CMD ["npm", "start"]