import { readFile } from 'fs'
import { EventEmitter } from 'events'
import { promisify } from 'util'
import PulseAudioPackets, {
  PA_COMMAND_AUTH,
  PA_COMMAND_SET_CLIENT_NAME,
  PA_COMMAND_SET_SINK_MUTE,
  PA_COMMAND_GET_SINK_INFO,
  PA_COMMAND_GET_SINK_INFO_LIST,
  PA_COMMAND_SET_SINK_VOLUME,
  PA_COMMAND_SUBSCRIBE,
  UInt32BEValue,
  ArbitraryValue,
  PropertiesValue,
  BooleanValue,
  SinkIdentifierValue,
  ChannelVolumesValue
} from './pulse-audio-packets.js'

const CLIENT_PROTOCOL_VERSION = 32

export default class PulseAudioClient extends EventEmitter {
  constructor ({ socketPath, cookiePath, clientName }) {
    super()
    console.log(socketPath)
    this.socketPath = socketPath
    this.cookiePath = cookiePath
    this.clientName = { application: { name: clientName } }
  }

  destroy () {
    if (this.pulseAudioPackets) {
      this.pulseAudioPackets.removeAllListeners()
      this.pulseAudioPackets.destroy()
      delete this.pulseAudioPackets
    }

    this.removeAllListeners()
  }

  async connect () {
    this.pulseAudioPackets = new PulseAudioPackets()

    this.pulseAudioPackets.on('change', (event) => {
      this.emit('change', event)
    })

    await this.pulseAudioPackets.connect({
      socketPath: this.socketPath
    })

    this.serverProtocolVersion = await this._sendAuth()
    this.clientIndex = await this._sendClientName()
  }

  async setSinkMute (sinkIndex, isMuted) {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_SET_SINK_MUTE, [
      SinkIdentifierValue.toWrite(sinkIndex),
      BooleanValue.toWrite(isMuted)
    ])
  }

  async getSinks () {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_GET_SINK_INFO_LIST)
  }

  async getSink (sinkIndex) {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_GET_SINK_INFO, [
      SinkIdentifierValue.toWrite(sinkIndex)
    ])
  }

  async setSinkVolumes (sinkIndex, volumeLevels) {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_SET_SINK_VOLUME, [
      SinkIdentifierValue.toWrite(sinkIndex),
      ChannelVolumesValue.toWrite({
        channels: volumeLevels.length,
        volumes: volumeLevels
      })
    ])
  }

  async subscribeToSinkEvents () {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_SUBSCRIBE, [
      UInt32BEValue.toWrite(0x0001)
    ])
  }

  async unsubscribeFromAllEvents () {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_SUBSCRIBE, [
      UInt32BEValue.toWrite(0)
    ])
  }

  async _sendAuth () {
    const cookie = await promisify(readFile)(this.cookiePath)

    return this.pulseAudioPackets.createRequest(PA_COMMAND_AUTH, [
      UInt32BEValue.toWrite(CLIENT_PROTOCOL_VERSION),
      ArbitraryValue.toWrite(cookie)
    ])
  }

  async _sendClientName () {
    return this.pulseAudioPackets.createRequest(PA_COMMAND_SET_CLIENT_NAME, [
      PropertiesValue.toWrite(this.clientName)
    ])
  }
}
