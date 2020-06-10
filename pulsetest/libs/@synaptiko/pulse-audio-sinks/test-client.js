import PulseAudioSinks from './pulse-audio-sinks.js'

async function init () {
  console.log('connecting')
  const pulseAudioSinks = new PulseAudioSinks({
    socketPath: `/run/pulse/pulseaudio.socket`,
    cookiePath: `/run/pulse/pulseaudio.cookie`
  })

  // console.log('get sinks')
  // console.log(await pulseAudioSinks.getSinks())

  pulseAudioSinks.on('change', (event) => {
    console.log('change', event)
  })

//   await pulseAudioSinks.setVolume(0, 10)

//   setTimeout(() => {
//     pulseAudioSinks.setVolume(0, 20)
//   }, 2000)

//   setTimeout(() => {
//     pulseAudioSinks.setVolume(0, 30)
//   }, 4000)

//   await pulseAudioSinks.setMuted(0, true)

//   setTimeout(() => {
//     pulseAudioSinks.setMuted(0, false)
//   }, 1000)

//   setTimeout(() => {
//     pulseAudioSinks.toggleMuted(0)
//   }, 2000)

//   setTimeout(() => {
//     pulseAudioSinks.toggleMuted(0)
//   }, 3000)
}

init()
