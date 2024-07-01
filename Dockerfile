# Use the official Node.js 14 image as the base image
FROM node:18 as base

# Set the environment for dev or prod configs
# TODO - figure out a better way to do this
ARG environment


# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the app dependencies
RUN npm ci

# Copy the rest of the app source code to the working directory
COPY . .

# Build the TypeScript code
RUN npm rum container:$environment

# Put app in new image
FROM node:18-slim as app

WORKDIR /app
COPY --from=base /app/dist /app/dist
COPY --from=base /app/node_modules /app/node_modules

# Expose the necessary ports
EXPOSE 8080

# Set the command to run the app
CMD ["node", "dist/seabot.js"]