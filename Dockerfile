FROM node:18 AS base
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
COPY .env .env

FROM node:18-alpine
WORKDIR /app
COPY --from=base /app .
EXPOSE ''

CMD ["yarn", "start"]