#!/bin/bash
set -e

# Don't apply default flags if we are being overridden
if [[ "$@" == *"pulseaudio"* ]]; then
  exec "$@"
fi

# Default flags explanation
# (system, disallow-*, disable-*): Run in system mode and disable unsupported system mode features
# (realtime, high-priority): Ensure we always have enough CPU
# (file): Default module configuration, extends '/etc/pulse/system.pa'
# ("@"): Allow for customization: can receive extra flags or extend module configuration
exec /usr/bin/pulseaudio \
  --log-level=0 \
  --use-pid-file=false \
  --system \
  --disallow-exit \
  --disallow-module-loading \
  --disable-shm=true \
  --realtime=true \
  --high-priority=true \
  --file /etc/pulse/primitive.pa \
  "$@"