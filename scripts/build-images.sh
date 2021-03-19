#!/bin/bash
set -e

function build_and_push_image () {
  local BALENA_MACHINE_NAME=$1
  local DOCKER_ARCH=$2
  local CREATE_DOCKERFILE=$3

  echo "Building for $BALENA_MACHINE_NAME..."
  if [[ -z "${CREATE_DOCKERFILE}" ]]; then
    sed "s/%%BALENA_MACHINE_NAME%%/$BALENA_MACHINE_NAME/g" Dockerfile.template > Dockerfile.$BALENA_MACHINE_NAME
  fi
  docker buildx build -t balenablocks/audio:$BALENA_MACHINE_NAME --platform $DOCKER_ARCH --file Dockerfile.$BALENA_MACHINE_NAME .
  
  echo "Publishing..."
  docker push balenablocks/audio:$BALENA_MACHINE_NAME

  echo "Cleaning up..."
  if [[ -z "${CREATE_DOCKERFILE}" ]]; then
    rm Dockerfile.$BALENA_MACHINE_NAME
  fi
}

DIRNAME=$(dirname $0)
if [[ $DIRNAME != './scripts' ]]; then
  echo "Please run from project's root directory"
fi

build_and_push_image "raspberrypi4-64" "linux/arm64"
build_and_push_image "raspberrypi3-64" "linux/arm64"
build_and_push_image "raspberrypi3" "linux/arm/v7"
build_and_push_image "raspberry-pi2" "linux/arm/v7"
build_and_push_image "raspberry-pi" "linux/arm/v6" "true"
build_and_push_image "fincm3" "linux/arm/v7"
build_and_push_image "intel-nuc" "linux/amd64"
build_and_push_image "jetson-nano" "linux/arm64"
build_and_push_image "beaglebone-black" "linux/arm/v7"
build_and_push_image "genericx86-64-ext" "linux/amd64"
build_and_push_image "asus-tinker-board" "linux/arm/v7"
build_and_push_image "asus-tinker-board-s" "linux/arm/v7"
