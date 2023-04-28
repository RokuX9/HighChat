# cache our node version for installing later
FROM node:18.3.0-slim as node
FROM ubuntu:focal-20220531 as base
ENV NODE_ENV=production
# Avoid running nodejs process as PID 1 (use tini)
# You may also need development tools to build native npm addons:
# apt-get install gcc g++ make
RUN apt-get update \
    && apt-get -qq install -y --no-install-recommends \
    tini \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 8081

# new way to get node, let's copy in the specific version we want from a docker image
# this avoids depdency package installs (python3) that the deb package requires
COPY --from=node /usr/local/include/ /usr/local/include/
COPY --from=node /usr/local/lib/ /usr/local/lib/
COPY --from=node /usr/local/bin/ /usr/local/bin/
# reset symlinks
RUN corepack disable && corepack enable

# create node user and group, then create app dir
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node \
    && mkdir /app \
    && chown -R node:node /app

WORKDIR /app
USER node
COPY --chown=node:node package*.json yarn*.lock ./
RUN npm ci --only=production && npm cache clean --force

#### dev ####
# no source to be added, and assumes bind mount
FROM base as dev
ENV NODE_ENV=development
ENV PATH=/app/node_modules/.bin:$PATH
RUN npm install --only=development && npm cache clean --force
CMD ["nodemon", "index.js"]

#### source ####
FROM base as source
COPY --chown=node:node . .

#### test (as needed) ####
FROM source as test
ENV NODE_ENV=development
ENV PATH=/app/node_modules/.bin:$PATH
COPY --from=dev /app/node_modules /app/node_modules
RUN npx eslint .
RUN npm test
CMD ["npm", "run", "test"]

#### prod ####
FROM source as prod
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
