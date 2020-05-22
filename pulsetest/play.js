const Pulse = require('pulseaudio2')
const wav = require('wav')
const fs = require('fs')

console.log(`Running PLAY script with the following configuration:`)
console.log(`PULSE_SERVER: ${process.env.PULSE_SERVER}`)
console.log(`PULSE_SINK: ${process.env.PULSE_SINK}`)
console.log(`This script will grab a wav file and output audio to PULSE_SINK (if undefined sink will be default for PULSE_SERVER).`)

async function main() {
    const ctx = new Pulse()

    ctx.on('state', (state) => {
        console.log('context:', state)
    })

    const wavFile = process.argv[2] || 'node_modules/pulseaudio2/test/data/one.wav'
    const reader = new wav.Reader()
    fs.createReadStream(wavFile).pipe(reader)

    reader.pause()
    reader.on('format', (fmt) => {
        console.log(fmt)

        const opts = {
            channels: fmt.channels,
            rate: fmt.sampleRate,
            format: (fmt.signed ? 'S' : 'U') + fmt.bitDepth + fmt.endianness,
        }
        const play = ctx.createPlaybackStream(opts)

        let duration = 0
        reader.on('data', (data) => {
            play.write(data)
            duration += data.length / (fmt.bitDepth / 8 * fmt.sampleRate * fmt.channels)
        })
        reader.on('end', () => {
            setTimeout(() => {
                play.end()
                ctx.end()
            }, duration * 1000)
        })
        reader.resume()
    })
}
main()

