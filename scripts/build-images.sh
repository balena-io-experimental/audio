#!/bin/bash
set -e

BLOCK_NAME="audio"

function build_and_push_image () {
  local DOCKER_REPO=$1
  local BALENA_MACHINE_NAME=$2
  local DOCKER_ARCH=$3
  local BALENA_ARCH=$4

  echo "Building for machine name $BALENA_MACHINE_NAME, platform $DOCKER_ARCH, pushing to $DOCKER_REPO/$BLOCK_NAME"

  sed "s/%%BALENA_MACHINE_NAME%%/$BALENA_MACHINE_NAME/g" ./Dockerfile.template > ./Dockerfile.$BALENA_MACHINE_NAME
  sed -i.bak "s/%%BALENA_ARCH%%/$BALENA_ARCH/g" ./Dockerfile.$BALENA_MACHINE_NAME && rm ./Dockerfile.$BALENA_MACHINE_NAME.bak
  docker buildx build -t $DOCKER_REPO/$BLOCK_NAME:$BALENA_MACHINE_NAME --load --platform $DOCKER_ARCH --file Dockerfile.$BALENA_MACHINE_NAME .

  echo "Publishing..."
  docker push $DOCKER_REPO/$BLOCK_NAME:$BALENA_MACHINE_NAME

  echo "Cleaning up..."
  rm Dockerfile.$BALENA_MACHINE_NAME
}

function create_and_push_manifest() {
  docker manifest create $DOCKER_REPO/$BLOCK_NAME:latest \
    --amend $DOCKER_REPO/$BLOCK_NAME:raspberrypi4-64 \
    --amend $DOCKER_REPO/$BLOCK_NAME:raspberrypi3-64 \
    --amend $DOCKER_REPO/$BLOCK_NAME:raspberrypi3 \
    --amend $DOCKER_REPO/$BLOCK_NAME:raspberry-pi2 \
    --amend $DOCKER_REPO/$BLOCK_NAME:raspberry-pi \
    --amend $DOCKER_REPO/$BLOCK_NAME:fincm3 \
    --amend $DOCKER_REPO/$BLOCK_NAME:intel-nuc \
    --amend $DOCKER_REPO/$BLOCK_NAME:jetson-nano \
    --amend $DOCKER_REPO/$BLOCK_NAME:beaglebone-black \
    --amend $DOCKER_REPO/$BLOCK_NAME:genericx86-64-ext \
    --amend $DOCKER_REPO/$BLOCK_NAME:asus-tinker-board \
    --amend $DOCKER_REPO/$BLOCK_NAME:asus-tinker-board-s

  docker manifest push --purge $DOCKER_REPO/$BLOCK_NAME:latest
}

# You can pass in a repo (such as a test docker repo) or accept the default
DOCKER_REPO=${1:-balenablocks}
build_and_push_image $DOCKER_REPO "raspberrypi4-64" "linux/arm64"
build_and_push_image $DOCKER_REPO "raspberrypi3-64" "linux/arm64"
build_and_push_image $DOCKER_REPO "raspberrypi3" "linux/arm/v7"
build_and_push_image $DOCKER_REPO "raspberry-pi2" "linux/arm/v7"
build_and_push_image $DOCKER_REPO "raspberry-pi" "linux/arm/v6"
build_and_push_image $DOCKER_REPO "fincm3" "linux/arm/v7"
build_and_push_image $DOCKER_REPO "intel-nuc" "linux/amd64"
build_and_push_image $DOCKER_REPO "jetson-nano" "linux/arm64"
build_and_push_image $DOCKER_REPO "beaglebone-black" "linux/arm/v7"
build_and_push_image $DOCKER_REPO "genericx86-64-ext" "linux/amd64"
build_and_push_image $DOCKER_REPO "asus-tinker-board" "linux/arm/v7"
build_and_push_image $DOCKER_REPO "asus-tinker-board-s" "linux/arm/v7"

create_and_push_manifest