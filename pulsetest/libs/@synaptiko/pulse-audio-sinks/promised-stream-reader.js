export default class PromisedStreamReader {
  static async read (socket, size) {
    return new Promise((resolve, reject) => {
      function onError (error) {
        console.error(error)
        reject(new Error('Unexpected error when reading from the stream.'))
      }

      function onReadable () {
        socket.off('error', onError)
        read()
      }

      function read () {
        if (socket.readableLength >= size) {
          const chunk = socket.read(size)

          resolve(chunk)
        } else {
          const chunk = socket.read(size)

          if (chunk !== null) {
            if (chunk.length !== size) {
              reject(new Error('The stream ended prematurely.'))
            } else {
              resolve(chunk)
            }
          } else {
            socket.once('readable', onReadable)
            socket.once('error', onError)
          }
        }
      }

      read()
    })
  }
}
