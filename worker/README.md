# Lighthouse worker
Basic docker image that has an installation of chrome-stable and lighthouse.

## Build docker image
Building the docker image can be done with `yarn build`. If you need to change the branch of lighthouse you can add build args to docker build like `yarn build --build-arg LIGHTHOUSE_BRANCH=master`

# NPM/YARN start
Runs lighthouse with `--headless` flags.