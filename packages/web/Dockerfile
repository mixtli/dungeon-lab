FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY . .

# Install dependencies
RUN npm ci
RUN npm run build --workspace=@dungeon-lab/shared
RUN npm run build --workspace=@dungeon-lab/shared-ui
RUN npm run build --workspace=@dungeon-lab/client
RUN npm run build --workspace=@dungeon-lab/plugin-dnd-5e-2024
RUN npm run build --workspace=@dungeon-lab/web

# Install serve for hosting the static site
RUN npm install -g serve

# Expose port
EXPOSE 8080

# Start the application
CMD ["serve", "-s", "packages/web/dist", "-l", "8080"] 