# balena audio block

Provides an easy way to work with audio applications in a containerized environment.
The `audio` block is a docker image that runs a [PulseAudio](https://www.freedesktop.org/wiki/Software/PulseAudio/) server optimized for balenaOS.

## Features

- PulseAudio configuration optimized for balenaOS, extendable via PA config files
- Supports both TCP and UNIX socket communication
- Bluetooth and ALSA support out of the box
- Companion library to send PA commands and handle events using JavaScript

## Usage

#### docker-compose file
To use this image, create a container in your `docker-compose.yml` file as shown below:

```yaml
version: '2'

volumes:
  pulse:                          # Only required if using PA over UNIX socket

services:

  audio:
    image: balenablocks/audio:raspberrypi4-64  # See supported devices for other archs
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

In order to route audio through the `audio` block there are a few environment variables you'll need to set. Note that they must be set on your client container, where your audio application is running and **not** on the block itself. We recommend setting them in the `Dockerfile`. 

| Environment variable | Description |
| --- | --- |
| `PULSE_SERVER` | **Required** Address of the PulseAudio server which you want to connect to. Depending on the communication protocol you want to use it can be: <br>- *UNIX socket*: `PULSE_SERVER=unix:/run/pulse/pulseaudio.socket`<br>- *TCP socket*: `PULSE_SERVER=tcp:audio:4317` |
| `PULSE_SINK` | **Optional** The PulseAudio sink your application will send audio to. If not set, the block will use the PulseAudio default sink. Unless you are building a complex audio application we don't recommend setting this variable. If you want to select which output to use, for example HDMI or audio jack for a Raspberry Pi use the `AUDIO_OUTPUT` [env var](#environment-variables) on the block to select the output device.  |
| `PULSE_SOURCE` | **Optional** The PulseAudio source your application will get audio from. |

Setting these environment variables will instruct your application to route audio to the PulseAudio server on the `audio` container. For this to work your application must have built-in support for  PulseAudio as an audio backend. Most applications do, though some might require installing or configuring additional packages. If your application does not have native support for the PulseAudio backend you'll need to use your container's ALSA backend to bridge over to PulseAudio.

Read on for details on both alternatives. We've also included some examples in the `examples` folder (along with the `docker-compose.yml` file) so be sure to check that as well for implementation details.

**PulseAudio backend**

For applications with PulseAudio support, the audio is routed as follows: 

`[client-container] audio-app --> [audio] PulseAudio --> [audio] ALSA --> Audio Hardware`

Here is a non-exhaustive list of applications with PulseAudio backend that have been tested to work, feel free to PR more: 
- [SoX](http://sox.sourceforge.net/): PA backend distributed via `libsox-fmt-pulse` package
- [MPlayer](http://www.mplayerhq.hu/): Native PA backend
- [FFmpeg](https://ffmpeg.org/): Native PA backend

**ALSA bridge**

For audio applications that don't have built-in PulseAudio support you can use ALSA to brige the gap:

`[client-container] audio-app --> [client-container] ALSA --> [audio] PulseAudio --> [audio] ALSA --> Audio Hardware`

Setting up the ALSA bridge requires extra configuration steps on your containers so we created a few bash scripts to simplify the process:

- [Debian](scripts/alsa-bridge/debian-setup.sh)
- [Alpine](scripts/alsa-bridge/alpine-setup.sh) 

Before making use of audio capabilities you should run this script. An easy way to do so is by including the following instruction in your `Dockerfile`:

```Dockerfile
RUN curl -skL https://raw.githubusercontent.com/balenablocks/audio/master/scripts/alsa-bridge/debian-setup.sh| sh
```

## Customization
### Extend image configuration

You can extend the `audio` block to include custom configuration as you would with any other `Dockerfile`. Just make sure you don't override the `ENTRYPOINT` as it contains important system configuration.

Here are some of the most common extension cases: 

- Pass a flag to the PulseAudio server:

```Dockerfile
FROM balenablocks/audio:%%BALENA_MACHINE_NAME%%

CMD [ "--disallow-module-loading" ]
```

- Add custom configuration files:

```Dockerfile
FROM balenablocks/audio:%%BALENA_MACHINE_NAME%%

COPY custom.pa /usr/src/custom.pa
CMD [ "pulseaudio", "--file /usr/src/custom.pa" ]
```

- Start PulseAudio from your own bash script:

```Dockerfile
FROM balenablocks/audio:%%BALENA_MACHINE_NAME%%

COPY custom.pa /usr/src/custom.pa
COPY start.sh /usr/src/start.sh
CMD [ "/bin/bash", "/usr/src/start.sh" ]
```

### Environment variables

The following environment variables allow some degree of configuration:

| Environment variable | Description | Default | Options | 
| --- | --- | --- | --- |
| `AUDIO_LOG_LEVEL` | PulseAudio log level. | `WARN` | `ERROR`, `WARN`, `NOTICE`, `INFO`, `DEBUG`. |
| `AUDIO_OUTPUT` | Select the default audio output device. <br>Can also be changed at runtime by using the [companion library](#companion-library) | `AUTO` | For all device types: <br>- `AUTO`: Let PulseAudio decide. Priority is `USB > DAC > HEADPHONES > HDMI`<br>- `DAC`: Force default output to be an attached GPIO based DAC<br>- `<PULSE_SINK_NAME>`: If you know the sink name you can force set it too. Note that you can't use this to set custom sinks as default, in that case use `set-default-sink` on your custom pa script. <br><br> For Raspberry Pi devices: <br>- `RPI_AUTO`: BCM2835 automatic audio switching as described [here](https://web.archive.org/web/20200427023741/https://www.raspberrypi.org/documentation/configuration/audio-config.md). Deprecated for devices running Linux kernel 5.4 or newer. <br>- `RPI_HEADPHONES`: 3.5mm audio jack <br>- `RPI_HDMI0`: Main HDMI port <br>- `RPI_HDMI1`: Secondary HDMI port (only Raspberry Pi 4) <br><br> For Intel NUC: <br>- NUCs have automatic output detection and switching. If you plug both the HDMI and the 3.5mm audio jack it will use the latter.  |

### Companion library

If you need to manipulate the block's behaviour at runtime you can connect to the PulseAudio server, send commands and receive data or events from it. You should be able to use any existing library that implements the PA client protocol over TCP/UNIX sockets (some examples: [Python](https://pypi.org/project/pulsectl/), [Rust](https://docs.rs/libpulse-binding/2.16.0/libpulse_binding/), [JavaScript](https://github.com/stanford-oval/node-pulseaudio#readme)), or you could even [write your own](https://freedesktop.org/software/pulseaudio/doxygen/). Libraries that manipulate PA over DBUS won't work because we don't run the pulse dbus daemon. 

On this note, we built a companion javascript library that exposes the most common use cases with an easy to use interface. Install it with: 
```npm install @balenalabs/audio-block``` (**Note**: Not published yet, you can find it in this repo at the `lib` folder). 

Currently this is the exposed API (more to come), checkout `lib/example` for a fully fledged example:

Class `BalenaAudio`:
* constructor(address, cookie, subToEvents, name): 
* start(): Connect to the block
* setVolume(vol): Set the volume. `vol` in %.
* getVolume(): Gets the current sink volume in %.
* events: Listen to `play` and `stop` events.
* [WIP] setDefaultSink(): Set the default sink
* [WIP] getDefaultSink(): Get the default sink
* [WIP] getSinks(): Get available sinks

### Bluetooth

Bluetooth support for PulseAudio is enabled out of the box. Note that this only provides the backend that routes bluetooth packets over to PulseAudio, this does not include the Bluetooth agent that's required for initiating a connection and pairing devices. Check out our [Bluetooth block](https://github.com/balenablocks/bluetooth) for an easy to use Bluetooth agent.

## Supported devices
The audio block has been tested to work on the following devices:

| Device Type  | Supported interface (driver) |
| ------------- | ------------- |
| Raspberry Pi (v1 / Zero / Zero W) | - Audio jack (`bcm2835`): ✔ <br>- HDMI (`bcm2835`): ✔<br>- I2S DAC (`snd-rpi-simple`): ✔ <br>- USB (`snd-usb-audio`): ✔ |
| Raspberry Pi 2 | - Audio jack (`bcm2835`): ✔ <br>- HDMI (`bcm2835`): ✔<br>- I2S DAC (`snd-rpi-simple`): ✔ <br>- USB (`snd-usb-audio`): ✔ |
| Raspberry Pi 3 | - Audio jack (`bcm2835`): ✔ <br>- HDMI (`bcm2835`): ✔<br>- I2S DAC (`snd-rpi-simple`): ✔ <br>- USB (`snd-usb-audio`): ✔ |
| Raspberry Pi 4 | - Audio jack (`bcm2835`): ✔ <br>- HDMI (`bcm2835`): ✔<br>- I2S DAC (`snd-rpi-simple`): ✔ <br>- USB (`snd-usb-audio`): ✔ |
| Intel NUC  | - Audio jack (`snd_hda_intel`): ✔<br>- HDMI (`snd_hda_intel`): ✔<br>- USB (`snd-usb-audio`): ✔ |
| Jetson Nano <sup>1</sup> | - HDMI (`tegrahda`): ✘ <br>- I2S DAC (`tegrasndt210ref`): ?<sup>2</sup> <br>- USB (`snd-usb-audio`): ✔ |
| BeagleBone Black | - USB (`snd-usb-audio`): ✔ |

1: Audio block crashes if no USB/DAC present. See: https://github.com/balenablocks/audio/issues/35
2: Not tested. PR's welcome.
