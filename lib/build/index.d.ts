import PAClient from '@tmigone/pulseaudio';
export default class BalenaAudio extends PAClient {
    address: string;
    cookie: string;
    subToEvents: boolean;
    name: string;
    defaultSink: string;
    constructor(address?: string, cookie?: string, subToEvents?: boolean, name?: string);
    connect(): Promise<any>;
    setVolume(volume: number, sink?: string | number): Promise<import("@tmigone/pulseaudio").VolumeInfo>;
    getVolume(sink?: string | number): Promise<number>;
}
