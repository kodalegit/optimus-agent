FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies using pnpm (via corepack)
COPY package.json pnpm-lock.yaml ./
RUN corepack enable \
    && corepack prepare pnpm@latest --activate \
    && pnpm install --frozen-lockfile

# Copy application source
COPY . .

# Build the Next.js app
RUN pnpm build

# Runtime config
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start Next.js in production mode
CMD ["pnpm", "start"]
