#!/bin/bash
set -e

# Run balena base image entrypoint script
/usr/bin/entry.sh echo ""

# Helper functions
function pa_disable_module() {
  local MODULE="$1"
  sed -i "s/load-module $MODULE/#load-module $MODULE/" /etc/pulse/default.pa
}

function pa_sanitize_log_level() {
  declare -A options=(["ERROR"]=0 ["WARN"]=1 ["NOTICE"]=2 ["INFO"]=3 ["DEBUG"]=4)
  if [[ "${options[$LOG_LEVEL]}" ]]; then
    LOG_LEVEL=${options[$LOG_LEVEL]}
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

function pa_set_default_output () {
  local OUTPUT="$1"
  local PA_SINK=""

  # RPI_ keys also act as indexes for setting the PCM Route, don't change them
  declare -A options=(
    ["RPI_AUTO"]=0
    ["RPI_HEADPHONES"]=1
    ["RPI_HDMI0"]=2
    ["RPI_HDMI1"]=3
    ["AUTO"]=4
    ["DAC"]=5
  )

  case "${options[$OUTPUT]}" in

    # RPi familiy
    ${options["RPI_AUTO"]} | ${options["RPI_HEADPHONES"]} | ${options["RPI_HDMI0"]} | ${options["RPI_HDMI1"]})
      BCM2835_CARD=$(cat /proc/asound/cards | awk -F'\[|\]:' '/bcm2835/ && NR%2==1 {gsub(/ /, "", $0); print $2}')
      if [[ -n "$BCM2835_CARD" ]]; then
        amixer --card bcm2835 --quiet cset numid=3 "${options[$OUTPUT]}"
        PA_SINK="alsa_output.bcm2835.stereo-fallback"
      else
        echo "WARNING: BCM2835 audio card not found, are you sure you are running on a Raspberry Pi?"
      fi
      ;;

    # DACs
    ${options["DAC"]})
      DAC_CARD=$(cat /proc/asound/cards | awk -F'\[|\]:' '/dac|DAC|Dac/ && NR%2==1 {gsub(/ /, "", $0); print $2}')
      if [[ -n "$DAC_CARD" ]]; then
        PA_SINK="alsa_output.dac.stereo-fallback"
      else
        echo "WARNING: No DAC found. Falling back to PulseAudio defaults."
      fi
      ;;

    # AUTO - Let PulseAudio decide, *usually* it will be USB > DAC > BUILT-IN
    ${options["AUTO"]})
      ;;

    # If there was no match, we asume the provided value is the name of a PulseAudio sink.
    *)
      PA_SINK="$OUTPUT"
      ;;
  esac

  # Set the PA sink name
  if [[ -n "$PA_SINK" ]]; then
    echo "set-default-sink $PA_SINK" >> /etc/pulse/primitive.pa
  fi
}

# Platform specific commands to initialize audio hardware
function init_audio_hardware () {
  # Allow hardware to be initialized, PulseAudio only creates cards/sinks/sources on startup
  sleep 10

  # Intel NUC
  HDA_CARD=$(cat /proc/asound/cards | awk -F'\[|\]:' '/hda-intel/ && NR%2==1 {gsub(/ /, "", $0); print $2}')
  if [[ -n "$HDA_CARD" ]]; then
    echo "Initializing Intel NUC audio hardware..."
    amixer --card hda-intel --quiet cset numid=2 on,on  # Master Playback Switch --> turn on hardware
    amixer --card hda-intel --quiet cset numid=1 87,87  # Master Playback Volume --> max volume
    PA_SINK="alsa_output.hda-intel.analog-stereo"
  fi
}

function print_audio_cards () {
  cat /proc/asound/cards | awk -F'\[|\]:' 'NR%2==1 {gsub(/ /, "", $0); print $1,$2,$3}'
}

# PulseAudio primitive environment variables and defaults
LOG_LEVEL="${AUDIO_LOG_LEVEL:-NOTICE}"
DEFAULT_OUTPUT="${AUDIO_OUTPUT:-AUTO}"
COOKIE="${AUDIO_PULSE_COOKIE}"

echo "--- Audio ---"
echo "Starting audio service with settings:"
echo "- Pulse log level: "$LOG_LEVEL
[[ -n ${COOKIE} ]] && echo "- Pulse cookie: "$COOKIE
echo "- Default output: "$DEFAULT_OUTPUT
echo -e "\nDetected audio cards:"
print_audio_cards
echo -e "\n"

# Configure audio hardware
init_audio_hardware
pa_set_default_output "$DEFAULT_OUTPUT"

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

# If command starts with an option, prepend PulseAudio to it
if [[ "${1#-}" != "$1" ]]; then
  set -- pulseaudio "$@"
fi

# PulseAudio default flags set in daemon.conf
# - (realtime): Ensure we always have enough CPU
# - (file): Extend '/etc/pulse/default.pa' with '/etc/pulse/primitive.pa'
if [[ "$1" == *"pulseaudio"* ]]; then
  pa_sanitize_log_level
  shift
  set -- pulseaudio \
    --log-level="$LOG_LEVEL" \
    --realtime=true \
    --file=/etc/pulse/primitive.pa \
    "$@"
fi

exec "$@"