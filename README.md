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
  pulse:                          # Only required if using PA over UNIX socket

services:

  audio:
    image: balenalabs/raspberrypi4-64-audio:latest  # See supported devices for other archs
    privileged: true
    labels:
      io.balena.features.dbus: 1  # Only required for bluetooth support
    ports:
      - 4317:4317                 # Only required if using PA over TCP socket
    volumes:
      - 'pulse:/run/pulse'        # Only required if using PA over UNIX socket

  my-audio-app:
    build: ./my-audio-app
    volumes:
      - 'pulse:/run/pulse'        # Only required if using PA over UNIX socket
```

#### Send/receive audio

These are the environment variables that you'll need to setup in order to configure your audio routes. Note that they must be set on your client container, where your audio application is running.

| Environment variable | Description | Values |
| --- | --- | --- |
| `PULSE_SERVER` | Address of the PulseAudio server which you want to connect to. | UNIX socket: `PULSE_SERVER=unix:/run/pulse/pulseaudio.socket`<br>TCP socket: `PULSE_SERVER=tcp:audio:4317` |
| `PULSE_SINK` | PulseAudio sink your application will send audio to. | Defaults to `PULSE_SINK=alsa_output.default` |
| `PULSE_SOURCE` | PulseAudio source your application will get audio from. | --- |

Setting these environment variables will instruct your application to route audio to the PulseAudio server on the `audio` container. For this to work your application must have built-in support for  PulseAudio as an audio backend. Most applications do, though some might require installing or configuring additional packages. If your application does not have native support for the PulseAudio backend you'll need to use your container's ALSA backend to bridge over to PulseAudio.

Read on for details on both alternatives. We've also included some examples in the `examples` folder (along with the `docker-compose.yml` file) so be sure to check that as well for implementation details.

**PulseAudio backend**

For applications with PulseAudio support, the audio will be routed as follows: 

`[client-container] audio-app --> [audio] PulseAudio --> [audio] ALSA --> Audio Hardware`

Here is a non-exhaustive list of applications with PulseAudio backend that have been tested to work, feel free to PR more: 
- [SoX](http://sox.sourceforge.net/): PA backend distributed via `libsox-fmt-pulse` package
- [MPlayer](http://www.mplayerhq.hu/): Native PA backend

**ALSA bridge**

For audio applications that don't have built-in PulseAudio support we will be using ALSA to brige the gap:

`[client-container] audio-app --> [client-container] ALSA --> [audio] PulseAudio --> [audio] ALSA --> Audio Hardware`

Setting up the ALSA bridge requires some extra configuration steps on your containers, so we created a few bash scripts to simplify the process:

- [Debian](scripts/alsa-bridge/debian-setup.sh)
- [Alpine]() 

You should run this script before making use of audio capabilities, you can easily do so by including the following instruction in your `Dockerfile`:

```Dockerfile
RUN curl --silent https://raw.githubusercontent.com/balena-io-playground/audio-primitive/master/scripts/alsa-bridge/debian-setup.sh | sh
```


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

### Bluetooth

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