import { EventEmitter } from 'events'
import { Socket } from 'net'
import pEvent from './p-event.js'
import PromisedStreamReader from './promised-stream-reader.js'

const PACKET_STATIC_FIELDS = Buffer.from([
  0xFF, 0xFF, 0xFF, 0xFF,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
])
const PA_TAG_BOOLEAN_FALSE = 48
const PA_TAG_BOOLEAN_TRUE = 49
const PA_TAG_U8 = 66
const PA_TAG_U32 = 76
const PA_TAG_STRING_NULL = 78
const PA_TAG_PROPLIST = 80
const PA_TAG_USEC = 85
const PA_TAG_VOLUME = 86
const PA_TAG_SAMPLE_SPEC = 97
const PA_TAG_FORMAT_INFO = 102
const PA_TAG_CHANNEL_MAP = 109
const PA_TAG_STRING = 116
const PA_TAG_CHANNEL_VOLUMES = 118
const PA_TAG_ARBITRARY = 120

const PA_SUBSCRIPTION_EVENT_SINK = 0x0000

const PA_SUBSCRIPTION_EVENT_CHANGE = 0x0010

const PA_SUBSCRIPTION_EVENT_FACILITY_MASK = 0x000F
const PA_SUBSCRIPTION_EVENT_TYPE_MASK = 0x0030

const PA_COMMAND_REPLY = 2
export const PA_COMMAND_AUTH = 8
export const PA_COMMAND_SET_CLIENT_NAME = 9
export const PA_COMMAND_GET_SINK_INFO = 21
export const PA_COMMAND_GET_SINK_INFO_LIST = 22
export const PA_COMMAND_SUBSCRIBE = 35
export const PA_COMMAND_SET_SINK_VOLUME = 36
export const PA_COMMAND_SET_SINK_MUTE = 39
export const PA_COMMAND_SUBSCRIBE_EVENT = 66

function CompoundValue (...types) {
  class CompoundClass {
    static toRead () {
      return new CompoundClass()
    }

    static toWrite (...values) {
      return new CompoundClass(values.map((value, index) => types[index].toWrite(value)))
    }

    constructor (values) {
      this.values = values
    }

    get length () {
      return this.values.reduce((sum, { length }) => {
        return sum + length
      }, 0)
    }

    write (buffer, offset) {
      return this.values.reduce((offset, value) => {
        return value.write(buffer, offset)
      }, offset)
    }

    read (buffer, offset) {
      this.values = types.map(type => type.toRead())
      return this.values.map(value => value.read.bind(value)).reduce(({ values, offset }, read) => {
        const { value, offset: newOffset } = read(buffer, offset)
        values.push(value)
        return { values, offset: newOffset }
      }, { values: [], offset })
    }
  }

  return CompoundClass
}

export class ReadWriteValue {
  constructor (props) {
    Object.assign(this, props)
  }
}

export class UInt32BEValue extends ReadWriteValue {
  static toRead (key) {
    return new UInt32BEValue({ key })
  }

  static toWrite (value) {
    return new UInt32BEValue({
      value
    })
  }

  get length () {
    return 1 + 4
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_U32, offset) // 1
    offset = buffer.writeUInt32BE(this.value, offset) // 4
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_U32
    this.value = buffer.readUInt32BE(offset + 1)

    return {
      value: this.value,
      offset: offset + this.length
    }
  }
}

export class UsecValue extends ReadWriteValue {
  static toRead (key) {
    return new UsecValue({ key })
  }

  static toWrite (value) {
    return new UsecValue({
      value
    })
  }

  get length () {
    return 1 + 4 + 4
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_USEC, offset) // 1
    offset = buffer.writeUInt32BE(Number(this.value >> BigInt(32)), offset) // 4
    offset = buffer.writeUInt32BE(Number(this.value & BigInt(0xFFFF)), offset) // 4
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_USEC
    this.value = BigInt(buffer.readUInt32BE(offset + 1)) * (BigInt(1) << BigInt(32)) + BigInt(buffer.readUInt32BE(offset + 5))

    return {
      value: this.value,
      offset: offset + this.length
    }
  }
}

export class StringValue extends ReadWriteValue {
  static toRead (key) {
    return new StringValue({ key })
  }

  static toWrite (stringValue) {
    return new StringValue({
      stringValue
    })
  }

  get length () {
    return 1 + Buffer.byteLength(this.stringValue) + (this.stringValue === '' ? 0 : 1)
  }

  write (buffer, offset) {
    if (this.stringValue === '') {
      offset = buffer.writeUInt8(PA_TAG_STRING_NULL, offset) // 1
    } else {
      offset = buffer.writeUInt8(PA_TAG_STRING, offset) // 1
      offset += buffer.write(this.stringValue, offset, this.stringValue.length)
      offset = buffer.writeUInt8(0, offset) // NULL terminator; 1
    }
    return offset
  }

  read (buffer, offset) {
    const tag = buffer.readUInt8(offset)
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_STRING_NULL or PA_TAG_STRING

    if (tag === PA_TAG_STRING_NULL) {
      this.stringValue = ''
    } else if (tag === PA_TAG_STRING) {
      const nullTerminatorOffset = buffer.indexOf(0, offset + 1)
      this.stringValue = buffer.toString('utf8', offset + 1, nullTerminatorOffset)
    }

    return {
      value: this.stringValue,
      offset: offset + this.length
    }
  }
}

export class VolumeValue extends ReadWriteValue {
  static toRead (key) {
    return new VolumeValue({ key })
  }

  static toWrite (value) {
    return new VolumeValue({
      value
    })
  }

  get length () {
    return 1 + 4
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_VOLUME, offset) // 1
    offset = buffer.writeUInt32BE(this.value, offset) // 4
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_VOLUME
    this.value = buffer.readUInt32BE(offset + 1)

    return {
      value: this.value,
      offset: offset + this.length
    }
  }
}

export class StateValue extends UInt32BEValue {
  static toRead (key) {
    return new StateValue({ key })
  }

  static toWrite (value) {
    return new StateValue({
      value: { running: 0, idle: 1, suspended: 2 }[value]
    })
  }

  get length () {
    return 1 + 4
  }

  read (buffer, offset) {
    const { value, offset: newOffset } = super.read(buffer, offset)
    return {
      value: ['running', 'idle', 'suspended'][value],
      offset: newOffset
    }
  }
}

export class SinkIdentifierValue extends ReadWriteValue {
  static get CompoundValue () {
    return CompoundValue(UInt32BEValue, StringValue)
  }

  static toRead (key) {
    return new SinkIdentifierValue({
      key,
      compoundValue: this.CompoundValue.toRead()
    })
  }

  static toWrite (identifier) {
    const sinkIndex = (typeof identifier === 'number' ? identifier : 0xFFFFFFFF)
    const sinkName = (typeof identifier === 'string' ? identifier : '')

    return new SinkIdentifierValue({
      compoundValue: this.CompoundValue.toWrite(sinkIndex, sinkName)
    })
  }

  get length () {
    return this.compoundValue.length
  }

  write (buffer, offset) {
    return this.compoundValue.write(buffer, offset)
  }

  read (buffer, offset) {
    const { values: [sinkIndex, sinkName], offset: newOffset } = this.compoundValue.read(buffer, offset)

    return {
      value: (sinkIndex !== 0xFFFFFFFF ? sinkIndex : sinkName),
      offset: newOffset
    }
  }
}

export class PortsValue extends ReadWriteValue {
  static get CompoundValue () {
    return CompoundValue(StringValue, StringValue, UInt32BEValue, UInt32BEValue)
  }

  static toRead (key) {
    return new PortsValue({ key })
  }

  static toWrite (ports) {
    return new PortsValue({
      ports: ports.map(({ name, description, priority, availability }) => {
        return this.CompoundValue.toWrite(name, description, priority, { 'unavailable': 1, 'plugged in': 2 }[availability])
      })
    })
  }

  get length () {
    return 1 + 4 + this.ports.reduce((sum, { length }) => {
      return sum + length
    }, 0)
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_U32, offset)
    offset = buffer.writeUInt32BE(this.ports.length, offset)

    return this.ports.reduce((offset, port) => {
      return port.write(buffer, offset)
    }, offset)
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_U32
    const ports = []
    const value = []
    const portsCount = buffer.readUInt32BE(offset + 1)

    offset = offset + 1 + 4
    for (let i = 0; i < portsCount; i += 1) {
      const port = PortsValue.CompoundValue.toRead()
      const { values: [name, description, priority, availability], offset: newOffset } = port.read(buffer, offset)

      offset = newOffset

      ports.push(port)
      value.push({
        name,
        description,
        priority,
        availability: ['unavailable', 'plugged in'][availability - 1]
      })
    }
    this.ports = ports

    return {
      value,
      offset
    }
  }
}

export class FormatsValue extends ReadWriteValue {
  static get CompoundValue () {
    return CompoundValue()
  }

  static toRead (key) {
    return new FormatsValue({ key })
  }

  static toWrite (formats) {
    return new FormatsValue({
      formats: formats.map(({ encoding, properties }) => {
        return {
          encoding,
          properties: PropertiesValue.toWrite(properties)
        }
      })
    })
  }

  get length () {
    return 1 + 1 + this.formats.reduce((sum, { properties }) => {
      return sum + 1 + 1 + 1 + properties.length
    }, 0)
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_U8, offset)
    offset = buffer.writeUInt8(this.formats.length, offset)

    return this.formats.reduce((offset, format) => {
      offset = buffer.writeUInt8(PA_TAG_FORMAT_INFO, offset)
      offset = buffer.writeUInt8(PA_TAG_U8, offset)
      offset = buffer.writeUInt8(format.encoding, offset)
      return format.properties.write(buffer, offset)
    }, offset)
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_U8
    const formats = []
    const value = []
    const formatsCount = buffer.readUInt8(offset + 1)

    offset = offset + 1 + 1
    for (let i = 0; i < formatsCount; i += 1) {
      // TODO jprokop: assert that buffer.readUInt8(offset + 1) === PA_TAG_FORMAT_INFO
      // TODO jprokop: assert that buffer.readUInt8(offset + 1 + 1) === PA_TAG_U8
      const encoding = buffer.readUInt8(offset + 1 + 1)

      offset = offset + 1 + 1 + 1

      const propertiesValue = PropertiesValue.toRead()
      const { value: properties, offset: newOffset } = propertiesValue.read(buffer, offset)

      offset = newOffset

      formats.push({
        encoding,
        properties: propertiesValue
      })
      value.push({
        encoding,
        properties
      })
    }
    this.formats = formats

    return {
      value,
      offset
    }
  }
}

export class BooleanValue extends ReadWriteValue {
  static toRead (key) {
    return new BooleanValue({ key })
  }

  static toWrite (booleanValue) {
    return new BooleanValue({
      booleanValue
    })
  }

  get length () {
    return 1
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(this.booleanValue ? PA_TAG_BOOLEAN_TRUE : PA_TAG_BOOLEAN_FALSE, offset) // 1
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_BOOLEAN_TRUE or PA_TAG_BOOLEAN_FALSE
    this.booleanValue = (buffer.readUInt8(offset) === PA_TAG_BOOLEAN_TRUE)

    return {
      value: this.booleanValue,
      offset: offset + this.length
    }
  }
}

export class ArbitraryValue extends ReadWriteValue {
  static toRead (key) {
    return new ArbitraryValue({ key })
  }

  static toWrite (bufferValue) {
    return new ArbitraryValue({
      bufferValue
    })
  }

  get length () {
    return 1 + 4 + this.bufferValue.length
  }

  write (buffer, offset) {
    const bufferValue = this.bufferValue
    offset = buffer.writeUInt8(PA_TAG_ARBITRARY, offset) // 1
    offset = buffer.writeUInt32BE(bufferValue.length, offset) // 4
    offset += bufferValue.copy(buffer, offset)
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_ARBITRARY
    const length = buffer.readUInt32BE(offset + 1)
    const bufferValue = Buffer.allocUnsafe(length)
    const startOffset = offset + 1 + 4
    const endOffset = startOffset + length

    buffer.copy(bufferValue, 0, startOffset, endOffset)
    this.bufferValue = bufferValue

    return {
      value: this.bufferValue,
      offset: offset + this.length
    }
  }
}

class PropertyWithValue extends ReadWriteValue {
  static get CompoundValue () {
    return CompoundValue(StringValue, UInt32BEValue, ArbitraryValue)
  }

  static toRead (key) {
    return new PropertyWithValue({
      key,
      compoundValue: this.CompoundValue.toRead()
    })
  }

  static toWrite ({ property, value }) {
    const bufferValue = (typeof value === 'string' ? this._toBuffer(value) : value)
    return new PropertyWithValue({
      compoundValue: this.CompoundValue.toWrite(property, bufferValue.length, bufferValue)
    })
  }

  static _toBuffer (stringValue) {
    const stringValueLength = Buffer.byteLength(stringValue)
    const buffer = Buffer.allocUnsafe(stringValueLength + 1)
    const offset = buffer.write(stringValue, 0, stringValueLength)

    buffer.writeUInt8(0, offset) // NULL terminator; 1

    return buffer
  }

  get length () {
    return this.compoundValue.length
  }

  write (buffer, offset) {
    return this.compoundValue.write(buffer, offset)
  }

  read (buffer, offset) {
    const { values: [property, length, bufferValue], offset: newOffset } = this.compoundValue.read(buffer, offset)
    const value = (bufferValue[length - 1] === 0 ? bufferValue.toString('utf8', 0, length - 1) : bufferValue)

    return {
      value: {
        [property]: value
      },
      offset: newOffset
    }
  }
}

export class PropertiesValue extends ReadWriteValue {
  static toRead (key) {
    return new PropertiesValue({ key })
  }

  static toWrite (propertiesValue) {
    return new PropertiesValue({
      propsArray: this._propsToArray(propertiesValue)
    })
  }

  static _propsToArray (props, prefix) {
    const result = []

    Object.entries(props).forEach(([key, value]) => {
      const prefixedKey = (prefix ? `${prefix}.${key}` : key)

      if (typeof value === 'object' && value !== null) {
        result.push(...this._propsToArray(value, prefixedKey))
      } else {
        result.push(PropertyWithValue.toWrite({ property: prefixedKey, value }))
      }
    })

    return result
  }

  get length () {
    return this.propsArray.reduce((sum, { length }) => {
      return sum + length
    }, 1 + 1)
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_PROPLIST, offset) // 1
    offset = this.propsArray.reduce((offset, part) => {
      return part.write(buffer, offset)
    }, offset)
    offset = buffer.writeUInt8(PA_TAG_STRING_NULL, offset) // 1

    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_PROPLIST && buffer.readUInt8(offset + length - 1) === PA_TAG_STRING_NULL
    const value = {}
    const propsArray = []

    offset += 1
    while (buffer.readUInt8(offset) !== PA_TAG_STRING_NULL) {
      const propertyWithValue = PropertyWithValue.toRead()
      const { value: parsedValue, offset: newOffset } = propertyWithValue.read(buffer, offset)

      Object.entries(parsedValue).reduce((resultValue, [property, value]) => {
        property.split('.').reduce((object, key, index, parts) => {
          if (index < parts.length - 1) {
            object[key] = object[key] || {}
          } else {
            object[key] = value
          }

          return object[key]
        }, resultValue)

        return resultValue
      }, value)

      propsArray.push(propertyWithValue)
      offset = newOffset
    }

    this.propsArray = propsArray

    return {
      value,
      offset: offset + 1 // add last PA_TAG_STRING_NULL
    }
  }
}

class SampleSpecValue extends ReadWriteValue {
  static toRead (key) {
    return new SampleSpecValue({ key })
  }

  static toWrite ({ format, channels, rate }) {
    return new SampleSpecValue({
      format,
      channels,
      rate
    })
  }

  get length () {
    return 1 + 1 + 1 + 4
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_SAMPLE_SPEC, offset) // 1
    offset = buffer.writeUInt8(this.format, offset) // 1
    offset = buffer.writeUInt8(this.channels, offset) // 1
    offset = buffer.writeUInt32BE(this.rate, offset) // 4
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_SAMPLE_SPEC
    this.format = buffer.readUInt8(offset + 1)
    this.channels = buffer.readUInt8(offset + 1 + 1)
    this.rate = buffer.readUInt32BE(offset + 1 + 1 + 1)

    return {
      value: {
        format: this.format,
        channels: this.channels,
        rate: this.rate
      },
      offset: offset + this.length
    }
  }
}

class ChannelMapValue extends ReadWriteValue {
  static toRead (key) {
    return new ChannelMapValue({ key })
  }

  static toWrite ({ channels, types }) {
    return new ChannelMapValue({
      channels,
      types
    })
  }

  get length () {
    return 1 + 1 + this.types.length * 1
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_CHANNEL_MAP, offset) // 1
    offset = buffer.writeUInt8(this.channels, offset) // 1
    offset = this.types.reduce((offset, type) => {
      return buffer.writeUInt8(type, offset) // 1
    }, offset)
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_CHANNEL_MAP
    this.channels = buffer.readUInt8(offset + 1)

    const types = []
    for (let i = 0; i < this.channels; i += 1) {
      types.push(buffer.readUInt8(offset + 1 + 1 + i))
    }
    this.types = types

    return {
      value: {
        channels: this.channels,
        types: this.types
      },
      offset: offset + this.length
    }
  }
}

export class ChannelVolumesValue extends ReadWriteValue {
  static toRead (key) {
    return new ChannelVolumesValue({ key })
  }

  static toWrite ({ channels, volumes }) {
    return new ChannelVolumesValue({
      channels,
      volumes
    })
  }

  get length () {
    return 1 + 1 + this.volumes.length * 4
  }

  write (buffer, offset) {
    offset = buffer.writeUInt8(PA_TAG_CHANNEL_VOLUMES, offset) // 1
    offset = buffer.writeUInt8(this.channels, offset) // 1
    offset = this.volumes.reduce((offset, volume) => {
      return buffer.writeUInt32BE(volume, offset) // 4
    }, offset)
    return offset
  }

  read (buffer, offset) {
    // TODO jprokop: assert that buffer.readUInt8(offset) === PA_TAG_CHANNEL_VOLUMES
    this.channels = buffer.readUInt8(offset + 1)

    const volumes = []
    for (let i = 0; i < this.channels; i += 1) {
      volumes.push(buffer.readUInt32BE(offset + 1 + 1 + i * 4))
    }
    this.volumes = volumes

    return {
      value: {
        channels: this.channels,
        volumes: this.volumes
      },
      offset: offset + this.length
    }
  }
}

export default class PulseAudioPackets extends EventEmitter {
  constructor () {
    super()

    this.requests = {}
    this.requestId = 0
    this.headerLength = (PACKET_STATIC_FIELDS.length + 4)

    this._onReadable = this._onReadable.bind(this)
  }

  destroy () {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.destroy()
      delete this.socket
    }
  }

  async connect ({ socketPath }) {
    const socket = new Socket()

    this.socket = socket

    socket.on('readable', this._onReadable)
    console.log(`socketPath: ${socketPath}`)
    socket.connect(socketPath)
    await pEvent(socket, 'connect')
  }

  async createRequest (command, data = []) {
    const request = { command }
    const requestId = this.requestId++
    const reply = new Promise((resolve, reject) => {
      Object.assign(request, { resolve, reject })
    })

    if (requestId === 0xFFFFFFFF) {
      this.requestId = 0
    }

    this.requests[requestId] = request

    this.writePacket([
      UInt32BEValue.toWrite(command),
      UInt32BEValue.toWrite(requestId)
    ].concat(data))

    console.log([
      UInt32BEValue.toWrite(command),
      UInt32BEValue.toWrite(requestId)
    ].concat(data))

    return reply
  }

  writePacket (parts) {
    console.log(`parts`)
    console.log(parts)
    const dataLength = parts.reduce((sum, { length }) => {
      sum += length
      return sum
    }, 0)
    const buffer = Buffer.allocUnsafe(this.headerLength + dataLength)
    console.log(`length ${this.headerLength + dataLength}`)
    console.log(`dataLength ${dataLength}`)
    console.log(`headerLength ${this.headerLength}`)
    let offset = 0

    offset = buffer.writeUInt32BE(dataLength, offset)
    offset += PACKET_STATIC_FIELDS.copy(buffer, offset)

    parts.reduce((offset, part) => {
      console.log(part)
      return part.write(buffer, offset)
    }, offset)

    console.log('-- Buffer toString(hex) --')
    console.log(buffer.toString('hex'))
    this.socket.write(buffer)
  }

  _onReadable () {
    this._readPacket()
  }

  async _readPacket () {
    if (!this.isReadingPacket) {
      const socket = this.socket

      this.isReadingPacket = true

      while (socket.readableLength > 0) {
        const header = await PromisedStreamReader.read(socket, this.headerLength)
        const dataLength = header.readUInt32BE(0)
        const data = await PromisedStreamReader.read(socket, dataLength)
        const type = data.readUInt32BE(1)

        if (type === PA_COMMAND_REPLY) {
          const requestId = data.readUInt32BE(6)
          const request = this.requests[requestId]
          const result = this.parseReply(data, request.command)

          delete this.requests[requestId]

          request.resolve(result)
        } else if (type === PA_COMMAND_SUBSCRIBE_EVENT) {
          const event = this.parseEvent(data)

          if (event) {
            this.emit(event.type, event)
          }
        }
      }

      this.isReadingPacket = false
    }
  }

  parseReply (data, command) {
    switch (command) {
      case PA_COMMAND_AUTH:
        return (data.readUInt32BE(11) & 0xFFFF) // server protocol version
      case PA_COMMAND_SET_CLIENT_NAME:
        return (data.readUInt32BE(11)) // client index
      case PA_COMMAND_GET_SINK_INFO:
        return this.parseSink(data.slice(10)).object // sink structure
      case PA_COMMAND_GET_SINK_INFO_LIST:
        return this.parseSinks(data.slice(10)) // array of sink structures
    }
  }

  parseSinks (buffer, startOffset = 0) {
    const list = []
    let offset = startOffset

    while (offset < buffer.length) {
      const { object, offset: newOffset } = this.parseSink(buffer, offset)
      list.push(object)
      offset = newOffset
    }

    return list
  }

  parseSink (buffer, offset = 0) {
    return this.parseToObject([
      UInt32BEValue.toRead('index'),
      StringValue.toRead('name'),
      StringValue.toRead('description'),
      SampleSpecValue.toRead('sampleSpec'),
      ChannelMapValue.toRead('channelMap'),
      UInt32BEValue.toRead('moduleIndex'),
      ChannelVolumesValue.toRead('channelVolumes'),
      BooleanValue.toRead('isMuted'),
      UInt32BEValue.toRead('monitorSourceIndex'),
      StringValue.toRead('monitorSourceName'),
      UsecValue.toRead('latency'),
      StringValue.toRead('driverName'),
      UInt32BEValue.toRead('flagsRaw'),
      PropertiesValue.toRead('properties'),
      UsecValue.toRead('configLatency'),
      VolumeValue.toRead('baseVolume'),
      StateValue.toRead('state'),
      UInt32BEValue.toRead('volumeSteps'),
      UInt32BEValue.toRead('cardIndex'),
      PortsValue.toRead('ports'),
      StringValue.toRead('activePortName'),
      FormatsValue.toRead('formats')
    ], buffer, offset)
  }

  parseToObject (definition, buffer, offset = 0) {
    return definition.reduce(({ object, offset: startOffset }, part) => {
      const { value, offset } = part.read(buffer, startOffset)
      object[part.key] = value
      return { object, offset }
    }, { object: {}, offset })
  }

  parseEvent (data) {
    const details = data.readUInt32BE(11)
    const index = data.readUInt32BE(16)

    if ((details & PA_SUBSCRIPTION_EVENT_FACILITY_MASK) === PA_SUBSCRIPTION_EVENT_SINK &&
      (details & PA_SUBSCRIPTION_EVENT_TYPE_MASK) === PA_SUBSCRIPTION_EVENT_CHANGE
    ) {
      return { type: 'change', category: 'sink', index }
    } else {
      return null
    }
  }
}
