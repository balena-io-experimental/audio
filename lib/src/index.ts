import PAClient, { AuthInfo, ClientInfo, ServerInfo, Sink } from '@tmigone/pulseaudio'

export interface BalenaAudioInfo {
  client: ClientInfo,
  protocol: AuthInfo,
  server: ServerInfo
}

export default class BalenaAudio extends PAClient {

  public defaultSink: string
  constructor(
    public address: string = 'tcp:audio:4317',
    public cookie: string = './cookie',
    public subToEvents: boolean = true,
    public name: string = 'BalenaAudio'
  ) {
    super(address, cookie)
  }

  async start(): Promise<BalenaAudioInfo> {
    const protocol: AuthInfo = await this.connect()
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

  async setVolume(volume: number, sink?: string | number) {
    let sinkObject: Sink = await this.getSink(sink ?? this.defaultSink)
    let level: number = Math.round(Math.max(0, Math.min(volume, 100)) / 100 * sinkObject.baseVolume)
    return await this.setSinkVolume(sinkObject.index, level)
  }

  async getVolume(sink?: string | number) {
    let sinkObject: Sink = await this.getSink(sink ?? this.defaultSink)
    return Math.round(sinkObject.channelVolumes.volumes[0] / sinkObject.baseVolume * 100)
  }
}