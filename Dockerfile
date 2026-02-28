# Use the official Bun image
FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3009

# Run the application
CMD ["bun", "run", "src/index.ts"]
