#!/bin/bash
set -e

# Helper functions
function pa_disable_module() {
  local MODULE="$1"
  sed -i "s/load-module $MODULE/#load-module $MODULE/" /etc/pulse/default.pa
}

# Pulseaudio primitive environment variables and defaults
LOG_LEVEL="${PULSE_LOG_LEVEL:-1}"

# Disable pulseaudio modules that we don't support
pa_disable_module module-console-kit

# Disable pulseaudio modules that need special configuration
# These will be loaded and configured by the primitive.pa config file
pa_disable_module module-bluetooth-discover
pa_disable_module module-bluetooth-policy
pa_disable_module module-native-protocol-unix

# Start pulseaudio with default flags:
# - (realtime, high-priority): Ensure we always have enough CPU
# - (use-pid-file): Disable PID file as it causes bad restarts
# - (exit-idle-time): Never terminate daemon when idle
# - (file): Default module configuration, extends '/etc/pulse/default.pa'
if [[ "$1" == *"pulseaudio"* ]]; then
  USER_FLAGS="${@:2}"
  DEFAULT_FLAGS="\
    --log-level=$LOG_LEVEL \
    --use-pid-file=false \
    --realtime=true \
    --high-priority=true \
    --exit-idle-time=-1 \
    --file /etc/pulse/primitive.pa"
  exec /usr/bin/pulseaudio $DEFAULT_FLAGS $USER_FLAGS
fi

# Allow CMD pass through if not running pulseaudio
exec "$@"