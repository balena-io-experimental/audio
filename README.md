# WIP: balena primitives: audio

Based on pulseaudio. This is work in progress, not ready for use.

## Usage

Not implemented yet:

Extend primitive configuration:

```Dockerfile
FROM balenalabs/%%BALENA_MACHINE_NAME%%-audio

COPY custom.pa /usr/src/custom.pa
CMD [ "--file", "/usr/src/custom.pa" ]
```

Override primitive configuration:
```Dockerfile
FROM balenalabs/%%BALENA_MACHINE_NAME%%-audio

COPY custom.pa /usr/src/custom.pa
CMD [ "pulseaudio", "--system", "--file /usr/src/custom.pa", "--log-level=2" ]
```
