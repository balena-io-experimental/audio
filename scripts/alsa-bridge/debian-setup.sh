#!/bin/bash
set -e

echo "Setting up ALSA bridge..."

# Install pulse plugins for ALSA
apt-get update
apt-get install libasound2-plugins

# Set PulseAudio as the default output plugin for ALSA
mkdir -p  /usr/share/alsa/
cat << EOF > /usr/share/alsa/pulse-alsa.conf
# This file is referred to by /usr/share/alsa/pulse.conf to set pulseaudio as
# the default output plugin for applications using alsa when PulseAudio is
# running.

pcm.!default {
    type pulse
    hint {
        show on
        description "Playback/recording through the PulseAudio sound server"
    }
}

ctl.!default {
    type pulse
}
EOF

mkdir -p  /etc/alsa/conf.d/
cat << EOF > /etc/alsa/conf.d/99-pulse.conf
# PulseAudio alsa plugin configuration file to set the pulseaudio plugin as
# default output for applications using alsa when pulseaudio is running.
hook_func.pulse_load_if_running {
  lib "libasound_module_conf_pulse.so"
  func "conf_pulse_hook_load_if_running"
}

@hooks [
  {
    func pulse_load_if_running
    files [
      "/usr/share/alsa/pulse-alsa.conf"
    ]
    errors false
  }
]
EOF

echo "ALSA bridge configured correctly!"
