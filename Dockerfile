FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev
COPY backend ./backend
COPY --from=frontend /app/frontend/dist ./frontend/dist
EXPOSE 4000
CMD ["node", "backend/src/index.js"]
