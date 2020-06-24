# balena audio primitive

Provides an easy way to work with audio applications in a containerized environment.
This image runs a [PulseAudio](https://www.freedesktop.org/wiki/Software/PulseAudio/) server optimized for balenaOS.

## Features

- PulseAudio configuration optimized for balenaOS, extendable via PA config files
- Supports both TCP and UNIX socket communication
- Bluetooth and ALSA support out of the box
- Companion API to send PA commands and handle events

## Usage

#### docker-compose file
To use this image, create a container in your `docker-compose.yml` file as shown below:

```yaml
version: '2'

volumes:
  pulse:                          # Only required if using PA over UNIX sockets

services:

  audio:
    image: balenalabs/raspberrypi4-64-audio:latest  # See supported devices for other archs
    privileged: true
    labels:
      io.balena.features.dbus: 1  # Only required for bluetooth support
    ports:
      - 4317:4317                 # Only required if using PA over TCP sockets
    volumes:
      - 'pulse:/run/pulse'        # Only required if using PA over UNIX sockets

  my-audio-app:
    build: ./my-audio-app
    volumes:
      - 'pulse:/run/pulse'        # Only required if using PA over UNIX sockets
```

#### Send/receive audio 

You can now send and receive audio from the `audio` container by setting the required PulseAudio environment variables in your client application, `my-audio-app` in the example above:

| Environment variable | Description | Values |
| --- | --- | --- |
| `PULSE_SERVER` | Address of the PulseAudio server which you want to connect to. | UNIX sockets: `PULSE_SERVER=unix:/run/pulse/pulseaudio.socket`<br>TCP sockets: `PULSE_SERVER=tcp:audio:4317` |
| `PULSE_SINK` | PulseAudio sink your application will send audio to. | Defaults to `PULSE_SINK=alsa_output.default` |
| `PULSE_SOURCE` | PulseAudio source your application will get audio from. | --- |

For this to work your application needs to support PulseAudio as an audio backend. Most applications do, however some might require installing additional packages as the PA integration is not distributed on the main binary. If your application does not have a PulseAudio backend you can use ALSA backend and bridge it over to PulseAudio. See [ALSA bridge]() for more details.

We've included some client application examples in the `examples` folder in this repository (along with the `docker-compose.yml` file). 
Here is a non exhaustive list of applications with PulseAudio backend that have been tested to work, feel free to PR more: 
- [SoX](http://sox.sourceforge.net/)
- [MPlayer](http://www.mplayerhq.hu/)

## Customization
### Environment variables

| Environment variable | Description | Options | Default |
| --- | --- | --- | --- |
| `BALENA_AUDIO_LOG_LEVEL` | PulseAudio log level. | `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`. | `WARN` |
| `BALENA_AUDIO_OUTPUT` | ALSA output selector for Raspberry Pi boards. <br> Note that:<br>- `AUTO` will automatically detect and switch between `HEADPHONES` and `HDMI0`, but will ignore `HDMI1`.<br>- `HDMI1` is only available for Raspberry Pi 4. | `AUTO`, `HEADPHONES`, `HDMI0`, `HDMI1`. | `AUTO` |


### Extend image configuration

You can extend the `audio` primitive to include custom configuration as you would with any other `Dockerfile`.
For example, you can pass a flag to the PulseAudio server:

```Dockerfile
FROM balenalabs/%%BALENA_MACHINE_NAME%%-audio

CMD [ "--disallow-module-loading" ]
```

Or add custom configuration files:

```Dockerfile
FROM balenalabs/%%BALENA_MACHINE_NAME%%-audio

COPY custom.pa /usr/src/custom.pa
CMD [ "pulseaudio", "--file /usr/src/custom.pa", "--log-level=2" ]
```

### Bluetooth

Bluetooth support for PulseAudio is enabled out of the box. Note that this only provides the backend that routes bluetooth packets over to PulseAudio, this does not include the Bluetooth agent that's required for initiating a connection and pairing devices. Check out our [Bluetooth primitive]() for an easy to use Bluetooth agent.

## Supported devices
The audio primitive has been tested to work on the following devices:

| Device Type  | Status |
| ------------- | ------------- |
| Raspberry Pi (v1 / Zero / Zero W) |  |
| Raspberry Pi 2 |  |
| Raspberry Pi 3 | ✔ |
| Raspberry Pi 4 | ✔ |
| Intel NUC |  |

## TODO: ALSA bridge