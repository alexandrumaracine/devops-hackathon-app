FROM node:20-slim AS builder

WORKDIR /app/frontend

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy app code
COPY . .

# Build the frontend
RUN npm run build


# --- Production image ---
FROM node:20-slim

WORKDIR /app/frontend

# Install only the minimal global dependency for serving
RUN npm install -g serve --omit=dev

# Copy build output from builder stage
COPY --from=builder /app/frontend/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
