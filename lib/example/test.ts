import BalenaAudio from '../src/index'
const PULSE_SERVER = process.env.PULSE_SERVER || '192.168.90.166:4317'

async function main () {

  // Connect to audio block server
  let client = new BalenaAudio(PULSE_SERVER)
  console.log(await client.listen())

  // Listen for play/stop events
  client.on('play', data => {
    console.log('Started playing!')
    console.log(data)
  })
  client.on('stop', data => {
    console.log('Stopped playing!')
    console.log(data)
  })

  // Set volume to 100%
  await client.setVolume(35)
  console.log(await client.getVolume())
  await client.setVolume(75)
  console.log(await client.getVolume())
  
  // // Play with a decreasing volume pattern
  // let vol = 100
  // setInterval(async () => {
  //   await client.setVolume(vol)
  //   vol = vol === 0 ? 100 : vol - 10
  //   console.log(`Volume is ${await client.getVolume()}%`)
  // }, 500)
}


main()