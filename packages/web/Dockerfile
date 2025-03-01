FROM node:20-alpine

WORKDIR /app

# Copy package files
#COPY package*.json ./
#COPY packages/shared/package*.json ./packages/shared/
#COPY packages/web/package*.json ./packages/web/

COPY . .

# Install dependencies
RUN npm ci

# Copy source code
# Build shared package
#RUN npm run build --workspace=@dungeon-lab/shared

# Build web package
#RUN npm run build --workspace=@dungeon-lab/web

# Install serve for hosting the static site
RUN npm install -g serve

# Expose port
EXPOSE 8080

# Start the application
CMD ["serve", "-s", "packages/web/dist", "-l", "8080"] 