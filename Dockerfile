# Use the slim Node.js 24 image to run the app.
FROM node:24-bookworm-slim

WORKDIR /app
# Install the locked dependencies before copying the source so Docker can reuse this layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
# Run the server as the image's built-in unprivileged user.
USER node
# Compose maps a host port to port 3000 inside this container.
EXPOSE 3000
CMD ["npm", "start"]
