#!/bin/bash
set -e

echo "Setting up ALSA bridge..."
apk add --no-cache alsa-plugins-pulse
echo "ALSA bridge configured correctly!"
