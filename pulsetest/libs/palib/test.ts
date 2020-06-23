import { Socket } from 'net'

enum PA_TAGS {
  PA_TAG_INVALID = 0,
  PA_TAG_STRING = 't',
  PA_TAG_STRING_NULL = 'N',
  PA_TAG_U32 = 'L',
  PA_TAG_U8 = 'B',
  PA_TAG_U64 = 'R',
  PA_TAG_S64 = 'r',
  PA_TAG_SAMPLE_SPEC = 'a',
  PA_TAG_ARBITRARY = 'x',
  PA_TAG_BOOLEAN_TRUE = '1',
  PA_TAG_BOOLEAN_FALSE = '0',
  PA_TAG_BOOLEAN = PA_TAG_BOOLEAN_TRUE,
  PA_TAG_TIMEVAL = 'T',
  PA_TAG_USEC = 'U'  /* 64bit unsigned */,
  PA_TAG_CHANNEL_MAP = 'm',
  PA_TAG_CVOLUME = 'v',
  PA_TAG_PROPLIST = 'P',
  PA_TAG_VOLUME = 'V',
  PA_TAG_FORMAT_INFO = 'f',
}

const PA_PACKET_HEADER = Buffer.from([
  0xFF, 0xFF, 0xFF, 0xFF,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
])

interface PATag {
  type: PA_TAGS
  value: any
  buffer: Buffer
  size: number
  put(): number
}

class PATagStruct {
  tags: PATag[] = []

  putu32(value: number): void {
    this.tags.push(new PA_U32(value))
  }

  put_boolean(value: boolean): void {
    this.tags.push(new PA_Boolean(value))
  }

  put_arbitrary(value: Buffer): void {
    this.tags.push(new PA_Arbitrary(value))
  }

  writePacket() {
    const tagsSize: number = this.tags.reduce((sum, tag): number => {
      sum += tag.size
      return sum
    }, 0)
    
    // PA Packet
    // 4 bytes: packet size
    // 16 bytes: PA header
    // X bytes: [PA tag + value]
    const buffer: Buffer = Buffer.allocUnsafe(4 + PA_PACKET_HEADER.length + tagsSize)
    
  }
}

class PA_U32 implements PATag {
  constructor(
    public value: number,
    public type: PA_TAGS = PA_TAGS.PA_TAG_U32,
    public size: number = 0,
    public buffer: Buffer = null
  ) {
    this.size = 5
    this.buffer = Buffer.allocUnsafe(this.size)
    this.put()
  }

  put(): number {
    let offset: number = 0
    offset = this.buffer.writeUInt8(this.type.toString().charCodeAt(0), offset)
    offset = this.buffer.writeUInt32BE(this.value, offset)
    return offset
  }
}

class PA_Arbitrary implements PATag {
  constructor(
    public value: Buffer,
    public type: PA_TAGS = PA_TAGS.PA_TAG_ARBITRARY,
    public size: number = 0,
    public buffer: Buffer = null
  ) {
    this.size = 5 + this.value.length
    this.buffer = Buffer.allocUnsafe(this.size)
    this.put()
  }

  put(): number {
    let offset: number = 0
    offset = this.buffer.writeUInt8(this.type.toString().charCodeAt(0), offset)
    offset = this.buffer.writeUInt32BE(this.value.length, offset)
    offset += this.value.copy(this.buffer, offset)
    return offset
  }
}

class PA_Boolean implements PATag {
  constructor(
    public value: boolean,
    public type: PA_TAGS = PA_TAGS.PA_TAG_BOOLEAN,
    public size: number = 0,
    public buffer: Buffer = null
  ) {
    this.size = 1
    this.buffer = Buffer.allocUnsafe(this.size)
    this.put()
  }

  put(): number {
    this.type = this.value ? PA_TAGS.PA_TAG_BOOLEAN_TRUE : PA_TAGS.PA_TAG_BOOLEAN_FALSE
    let offset: number = 0
    offset = this.buffer.writeUInt8(this.type.toString().charCodeAt(0), offset)
    return offset
  }

}


let tagStruct: PATagStruct = new PATagStruct()

tagStruct.putu32(123)
tagStruct.put_boolean(false)
tagStruct.put_arbitrary(Buffer.from('123456'))
console.log(tagStruct)
tagStruct.writePacket()



// const socket = new Socket()
// const socketPath = 'pulseaudio:4317'
// socket.connect(4317, '192.168.90.207')
// socket.on('readable', () => {
//   console.log('readable')
// })
// socket.on('error', (err) => { console.log(err) })



// function writePacket(parts: PATagStruct[]): Buffer {
//   const dataLength = parts.reduce((sum: number, { length }) => {
//     sum += length
//     return sum
//   }, 0)

//   const buffer = Buffer.allocUnsafe(this.headerLength + dataLength)
//   let offset = 0

//   offset = buffer.writeUInt32BE(dataLength, offset)
//   offset += PACKET_STATIC_FIELDS.copy(buffer, offset)

//   parts.reduce((offset, part) => {
//     return part.write(buffer, offset)
//   }, offset)

//   return buffer
//   this.socket.write(buffer)
// }