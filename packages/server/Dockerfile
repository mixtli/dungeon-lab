FROM node:20-alpine

WORKDIR /app

# Copy package files
#COPY package*.json ./
#COPY packages/shared/package*.json ./packages/shared/
#COPY packages/server/package*.json ./packages/server/

COPY . /app
# Install dependencies
RUN npm ci

# Copy source code
#RUN npm install --workspace=@dungeon-lab/shared
#RUN npm install --workspace=@dungeon-lab/server
# Build shared and server packages
#RUN npm run build --workspace=@dungeon-lab/shared
# Add --noEmitOnError flag to allow build to proceed despite TS errors if needed
#RUN npm run build --workspace=@dungeon-lab/server 
#RUN npm run build --workspace=@dungeon-lab/server -- --noEmitOnError true

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start server
CMD ["npm", "run", "start", "--workspace=@dungeon-lab/server"] 