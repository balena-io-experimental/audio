# WIP: balena primitives: audio

Based on pulseaudio. This is work in progress, not ready for use.

## Usage

Extend primitive configuration/defaults:

```Dockerfile
FROM balenalabs/%%BALENA_MACHINE_NAME%%-audio

COPY custom.pa /usr/src/custom.pa
CMD [ "pulseaudio", "--file /usr/src/custom.pa", "--log-level=2" ]
```