let Pulse = require('pulseaudio2')
let ctx = new Pulse({ client: 'test-client' })

const timeout = process.argv[2] || 10000

console.log(`Running ECHO script with the following configuration:`)
console.log(`PULSE_SERVER: ${process.env.PULSE_SERVER}`)
console.log(`PULSE_SINK: ${process.env.PULSE_SINK}`)
console.log(`PULSE_SOURCE: ${process.env.PULSE_SOURCE}`)
console.log(`This script will grab any audio coming out of PULSE_SOURCE and redirect it to PULSE_SINK (if undefined sink will be default for PULSE_SERVER).`)
console.log(`It will run for ${timeout} mseconds and exit.`)

ctx.on('state', (state) => {
  console.log('context:', state)
})

ctx.on('connection', function () {
  let opts = {
    channels: 1,
    rate: 44100,
    format: 's16le'
  }

  let rec = ctx.createRecordStream(opts)
  let play = ctx.createPlaybackStream(opts)

  rec.on('state', (state) => {
    console.log('record:', state)
  })

  play.on('state', (state) => {
    console.log('playback:', state)
  })

  rec.pipe(play)


  setTimeout(() => {
    rec.end()
    play.end()
    ctx.end()
  }, timeout)
})



























