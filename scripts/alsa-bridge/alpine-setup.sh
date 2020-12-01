#!/bin/bash
set -e

echo "Setting up ALSA bridge..."
install_packages alsa-plugins-pulse
echo "ALSA bridge configured correctly!"
