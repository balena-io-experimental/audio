#!/bin/bash
set -e

function build_and_push_image () {
  local BALENA_MACHINE_NAME=$1
  local DOCKER_ARCH=$2
  echo "Building for $BALENA_MACHINE_NAME..."
  sed "s/%%BALENA_MACHINE_NAME%%/$BALENA_MACHINE_NAME/g" Dockerfile.template > Dockerfile.$BALENA_MACHINE_NAME
  docker buildx build -t balenaplayground/balenalabs-audio:$BALENA_MACHINE_NAME --platform $DOCKER_ARCH --file Dockerfile.$BALENA_MACHINE_NAME .
  
  echo "Publishing..."
  docker push balenaplayground/balenalabs-audio:$BALENA_MACHINE_NAME

  echo "Cleaning up..."
  rm Dockerfile.$BALENA_MACHINE_NAME
}

DIRNAME=$(dirname $0)
if [[ $DIRNAME != './scripts' ]]; then
  echo "Please run from project's root directory"
fi

build_and_push_image "raspberrypi4-64" "linux/arm64"
build_and_push_image "raspberrypi3" "linux/arm/v7"
build_and_push_image "raspberry-pi2" "linux/arm/v7"
build_and_push_image "raspberry-pi" "linux/arm/v6"
build_and_push_image "intel-nuc" "linux/amd64"
build_and_push_image "jetson-nano" "linux/arm64"
build_and_push_image "beaglebone-black" "linux/arm/v7"
