// inspired by https://github.com/sindresorhus/p-event
export default function pEvent (emitter, event) {
  return new Promise((resolve, reject) => {
    function cancel () {
      emitter.removeListener(event, resolveHandler)
      emitter.removeListener('error', rejectHandler)
    }

    function resolveHandler (value) {
      cancel()
      resolve(value)
    }

    function rejectHandler (error) {
      cancel()
      reject(error)
    }

    emitter.addListener(event, resolveHandler)
    emitter.addListener('error', rejectHandler)
  })
}
