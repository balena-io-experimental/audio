#!/bin/bash
set -e

# Don't apply default flags if pulseaudio command is being overridden
if [[ "$@" == *"pulseaudio"* ]]; then
  exec "$@"
fi

# Default flags explanation
# (realtime, high-priority): Ensure we always have enough CPU
# (file): Default module configuration, extends '/etc/pulse/system.pa'
# ("@"): Allow for customization: can receive extra flags or extend module configuration
exec /usr/bin/pulseaudio \
  --log-level=0 \
  --use-pid-file=false \
  --realtime=true \
  --high-priority=true \
  --file /etc/pulse/primitive.pa \
  "$@"