# WIP: balena primitives: audio

Based on pulseaudio. This is work in progress, not ready for use.

## Usage

Extend primitive configuration/defaults:

```Dockerfile
FROM balenalabs/%%BALENA_MACHINE_NAME%%-audio

COPY custom.pa /usr/src/custom.pa
CMD [ "pulseaudio", "--file /usr/src/custom.pa", "--log-level=2" ]
```

## Environment variables

| Environment variable | Description | Options | Default |
| --- | --- | --- | --- |
| `PULSE_LOG_LEVEL` | PulseAudio log level. | By increasing verbosity: `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`. | `WARN` |
| `ALSA_AUDIO_OUTPUT` | ALSA output selector for Raspberry Pi boards. <br> Note that:<br>- `AUTO` will automatically detect and switch between `HEADPHONES` and `HDMI0`, but will ignore `HDMI1`.<br>- `HDMI1` is only available for Raspberry Pi 4. | `AUTO`, `HEADPHONES`, `HDMI0`, `HDMI1`. | `AUTO` |