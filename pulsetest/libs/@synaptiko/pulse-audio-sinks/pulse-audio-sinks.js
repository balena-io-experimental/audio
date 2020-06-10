// TODO jprokop: split packets to parts; separate file with types
// TODO jprokop: start refactoring: remove state from classes (this.value, etc.), reimplement `length` and introduce "atomic" types which can be used to composition; figure out how to do composing and what should be the API
import { EventEmitter } from 'events'
import PulseAudioClient from './pulse-audio-client.js'

export default class PulseAudioSinks extends EventEmitter {
  constructor ({ socketPath, cookiePath }) {
    super()
    this.pulseAudioClient = new PulseAudioClient({
      socketPath,
      cookiePath,
      clientName: 'pulse-audio-sinks.js'
    })

    this._onPulseAudioClientChange = this._onPulseAudioClientChange.bind(this)
    this.pulseAudioClient.on('change', this._onPulseAudioClientChange)

    this.pulseAudioClientConnectPromise = this.pulseAudioClient.connect()

    this.throttledApplyAndNotifyChange = {}
  }

  destroy () {
    this.pulseAudioClient.off('change', this._onPulseAudioClientChange)
    this.pulseAudioClient.destroy()
    delete this.pulseAudioClient
  }

  async getSink (sinkIndex) {
    return (await this.getSinks())[sinkIndex]
  }

  async getSinks () {
    if (!this.sinks) {
      await this.pulseAudioClientConnectPromise

      const sinks = await this.pulseAudioClient.getSinks()

      sinks.sort(({ descriptionA, descriptionB }) => descriptionA.localeCompare(descriptionB))

      this.sinks = sinks.map(this._mapSink)
      this.sinkIndexToInternalIndexMap = this.sinks.reduce((map, { index: internalSinkIndex }, index) => {
        map[internalSinkIndex] = index
        return map
      }, {})

      this.pulseAudioClient.subscribeToSinkEvents()
    }

    return this.sinks
  }

  getActiveOrDefaultSinkIndex () {
    const lastActiveSinkIndex = this.lastActiveSinkIndex

    if (typeof lastActiveSinkIndex === 'number' && this.sinks[lastActiveSinkIndex].state === 'running') {
      return lastActiveSinkIndex
    } else {
      return 0
    }
  }

  async setMuted (sinkIndex, isMuted) {
    await this.pulseAudioClient.setSinkMute(this.sinks[sinkIndex].index, isMuted)
  }

  async toggleMuted (sinkIndex) {
    const { sinks } = this
    await this.pulseAudioClient.setSinkMute(sinks[sinkIndex].index, !sinks[sinkIndex].isMuted)
  }

  async setVolume (sinkIndex, volume) {
    const { sinks } = this
    const { channels } = sinks[sinkIndex]
    await this.pulseAudioClient.setSinkVolumes(sinks[sinkIndex].index, new Array(channels.length).fill((volume / 100) * 0x10000))
  }

  async updateVolume (sinkIndex, relativeVolume) {
    const { volume } = this.sinks[sinkIndex]
    this.setVolume(sinkIndex, (volume + relativeVolume))
  }

  _onPulseAudioClientChange ({ index }) {
    if (!this.throttledApplyAndNotifyChange[index]) {
      this.throttledApplyAndNotifyChange[index] = setTimeout(async () => {
        await this._applyAndNotifyChange(index)
        delete this.throttledApplyAndNotifyChange[index]
      }, 100)
    }
  }

  _mapSink ({ index, description, channelVolumes, isMuted, state, activePortName, ports }) {
    const { volumes, channels } = channelVolumes
    const portNameToDescription = ports.reduce((map, { name, description }) => {
      map[name] = description
      return map
    }, {})

    return {
      index,
      description,
      volume: Math.round(((volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length) / 0x10000) * 100),
      channels,
      isMuted,
      state,
      activePortName: activePortName,
      activePortDescription: portNameToDescription[activePortName]
    }
  }

  async _applyAndNotifyChange (internalSinkIndex) {
    const sink = this._mapSink(await this.pulseAudioClient.getSink(internalSinkIndex))
    const sinkIndex = this.sinkIndexToInternalIndexMap[internalSinkIndex]
    const previousSink = this.sinks[sinkIndex]
    let hasChanges = false
    const changes = Object.entries(sink).reduce((result, [field, newValue]) => {
      const oldValue = previousSink[field]

      if (newValue !== oldValue) {
        result[field] = { newValue, oldValue }
        hasChanges = true
      }

      return result
    }, {})

    this.sinks[sinkIndex] = sink

    if (hasChanges) {
      if (changes.state && changes.state.newValue === 'running') {
        this.lastActiveSinkIndex = sinkIndex
      }

      this.emit('change', {
        index: sinkIndex,
        changes,
        sink
      })
    }
  }
}
