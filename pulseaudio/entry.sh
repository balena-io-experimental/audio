#!/bin/bash
set -e

# Helper functions
function pa_disable_module() {
  local MODULE=$1
  sed -i "s/load-module $MODULE/#load-module $MODULE/" /etc/pulse/default.pa
}

# Pulseaudio primitive environment variables and defaults
LOG_LEVEL=${PULSE_LOG_LEVEL:-"1"}

# Disable pulseaudio modules that we don't want or need special configuration
pa_disable_module module-console-kit
pa_disable_module module-bluetooth-discover
pa_disable_module module-bluetooth-policy

# Don't apply default flags if pulseaudio command is being overridden
if [[ "$@" == *"pulseaudio"* ]]; then
  exec "$@"
fi

# Default flags explanation
# (realtime, high-priority): Ensure we always have enough CPU
# (exit-idle-time): Never terminate daemon when idle
# (file): Default module configuration, extends '/etc/pulse/default.pa'
# ("@"): Allow for customization: can receive extra flags or extend module configuration
exec /usr/bin/pulseaudio \
  --log-level=$LOG_LEVEL \
  --use-pid-file=false \
  --realtime=true \
  --high-priority=true \
  --exit-idle-time=-1 \
  --file /etc/pulse/primitive.pa \
  "$@"