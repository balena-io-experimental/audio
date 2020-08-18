import PAClient, { AuthInfo, ClientInfo, ServerInfo, Sink } from '@tmigone/pulseaudio'
import { retry } from 'ts-retry-promise'

export interface BalenaAudioInfo {
  client: ClientInfo,
  protocol: AuthInfo,
  server: ServerInfo
}

export default class BalenaAudio extends PAClient {

  public defaultSink: string
  constructor(
    public address: string = 'tcp:audio:4317',
    public subToEvents: boolean = true,
    public name: string = 'BalenaAudio'
  ) {
    super(address)
  }

  async listen(): Promise<BalenaAudioInfo> {
    const protocol: AuthInfo = await this.connectWithRetry()
    const client: ClientInfo = await this.setClientName(this.name)
    const server: ServerInfo = await this.getServerInfo()

    this.defaultSink = server.defaultSink

    if (this.subToEvents) {
      await this.subscribe()
      this.on('sink', async data => {
        let sink: Sink = await this.getSink(data.index)
        switch (sink.state) {
          // running
          case 0:
            this.emit('play', sink)
            break
          // idle
          case 1:
            this.emit('stop', sink)
            break
          // suspended
          case 2:
          default:
            break;
        }
      })
    }

    return { client, protocol, server }
  }

  async connectWithRetry(): Promise<AuthInfo> {
    return await retry(async () => {
      return await this.connect()
    }, { retries: 'INFINITELY', delay: 5000, backoff: 'LINEAR', logger: (msg) => { console.log(`Error connecting to audio block - ${msg}`) } })
  }

  async getInfo() {
    if (!this.connected) {
      throw new Error('Not connected to audio block.')
    }
    return await this.getServerInfo()
  }

  async setVolume(volume: number, sink?: string | number) {
    if (!this.connected) {
      throw new Error('Not connected to audio block.')
    }
    let sinkObject: Sink = await this.getSink(sink ?? this.defaultSink)
    let level: number = Math.round(Math.max(0, Math.min(volume, 100)) / 100 * sinkObject.baseVolume)
    return await this.setSinkVolume(sinkObject.index, level)
  }

  async getVolume(sink?: string | number) {
    if (!this.connected) {
      throw new Error('Not connected to audio block.')
    }
    let sinkObject: Sink = await this.getSink(sink ?? this.defaultSink)
    return Math.round(sinkObject.channelVolumes.volumes[0] / sinkObject.baseVolume * 100)
  }
}