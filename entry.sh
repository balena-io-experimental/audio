#!/bin/bash
set -e

# Run balena base image entrypoint script
/usr/bin/entry.sh echo "Running balena base image entrypoint..."

# Helper functions
function pa_disable_module() {
  local MODULE="$1"
  sed -i "s/load-module $MODULE/#load-module $MODULE/" /etc/pulse/default.pa
}

function pa_sanitize_log_level() {
  declare -A options=(["ERROR"]=0 ["WARN"]=1 ["NOTICE"]=2 ["INFO"]=3 ["DEBUG"]=4)
  if [[ "${options[$LOG_LEVEL]}" ]]; then
    LOG_LEVEL=${options[$OUTPUT]}
  fi
}

function pa_set_cookie() {
  local PA_COOKIE="$1"
  if [[ ${#PA_COOKIE} == 512 && "$PA_COOKIE" =~ ^[0-9A-Fa-f]{1,}$ ]]; then
    echo "$PA_COOKIE" | xxd -r -p | tee /run/pulse/pulseaudio.cookie > /dev/null
  fi
}

function pa_read_cookie () {
  if [[ -f /run/pulse/pulseaudio.cookie ]]; then
    xxd -c 512 -p /run/pulse/pulseaudio.cookie
  else
    echo
  fi
}

function alsa_select_output() {
  local OUTPUT="$1"
  declare -A options=(["AUTO"]=0 ["HEADPHONES"]=1 ["HDMI0"]=2 ["HDMI1"]=3)
  if [[ "${options[$OUTPUT]}" ]]; then
    amixer --card 0 --quiet cset numid=3 "${options[$OUTPUT]}"
  fi
}

# PulseAudio primitive environment variables and defaults
LOG_LEVEL="${BALENA_AUDIO_LOG_LEVEL:-WARN}"
AUDIO_OUTPUT="${BALENA_AUDIO_OUTPUT:-AUTO}"
COOKIE="${BALENA_AUDIO_COOKIE}"

echo "--- Audio ---"
echo "Starting audio service with settings:"
echo "- Pulse log level: "$LOG_LEVEL
[[ -n ${COOKIE} ]] && echo "- Pulse cookie: "$COOKIE
echo "- ALSA output: "$AUDIO_OUTPUT

# Disable PulseAudio modules that we don't support
pa_disable_module module-console-kit

# Disable PulseAudio modules that need special configuration
# These will be loaded and configured by the primitive.pa config file
pa_disable_module module-bluetooth-discover
pa_disable_module module-bluetooth-policy
pa_disable_module module-native-protocol-unix

# Set PulseAudio cookie
if [[ -n "$COOKIE" ]]; then
  pa_set_cookie "$COOKIE"
fi

# Select ALSA default output
alsa_select_output "$AUDIO_OUTPUT"

# If command starts with an option, prepend PulseAudio to it
if [[ "${1#-}" != "$1" ]]; then
  set -- pulseaudio "$@"
fi

# Set PulseAudio default flags if we are running it
# - (realtime, high-priority): Ensure we always have enough CPU
# - (use-pid-file): Disable PID file as it may cause bad restarts due to locked files
# - (exit-idle-time): Never terminate daemon when idle
# - (file): Extend '/etc/pulse/default.pa' with '/etc/pulse/primitive.pa'
if [[ "$1" == *"pulseaudio"* ]]; then
  pa_sanitize_log_level
  shift
  set -- pulseaudio \
    --log-level="$LOG_LEVEL" \
    --use-pid-file=false \
    --realtime=true \
    --high-priority=true \
    --exit-idle-time=-1 \
    --file=/etc/pulse/primitive.pa \
    "$@"
fi

exec "$@"