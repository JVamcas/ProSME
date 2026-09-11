FROM node:24.13.0-bookworm-slim AS dependencies
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/platform/package.json apps/platform/package.json
RUN npm ci

FROM dependencies AS build
COPY . .
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG PAYLOAD_SECRET=container-build-placeholder-secret-32-characters
ARG FIREBASE_PROJECT_ID=container-build-placeholder
ARG NEXT_PUBLIC_FIREBASE_API_KEY=container-build-placeholder
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=container-build-placeholder.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=container-build-placeholder
ARG NEXT_PUBLIC_FIREBASE_APP_ID=container-build-placeholder
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV DATABASE_URL=$DATABASE_URL
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:24.13.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=build /workspace ./
EXPOSE 3000
CMD ["npm", "run", "start"]
