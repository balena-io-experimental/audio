
const PA_TAG_INVALID = 0;
const PA_TAG_STRING = 116;
const PA_TAG_STRING_NULL = 78;
const PA_TAG_U32 = 76;
const PA_TAG_U8 = 66;
const PA_TAG_U64 = 82;
const PA_TAG_S64 = 114;
const PA_TAG_SAMPLE_SPEC = 97;
const PA_TAG_ARBITRARY = 120;
const PA_TAG_BOOLEAN_TRUE = 49;
const PA_TAG_BOOLEAN_FALSE = 48;
const PA_TAG_BOOLEAN = PA_TAG_BOOLEAN_TRUE;
const PA_TAG_TIMEVAL = 84;
const PA_TAG_USEC = 85/* 64bit unsigned */;
const PA_TAG_CHANNEL_MAP = 109;
const PA_TAG_CVOLUME = 118;
const PA_TAG_PROPLIST = 80;
const PA_TAG_VOLUME = 86;
const PA_TAG_FORMAT_INFO = 102;

const PACKET_STATIC_FIELDS = Buffer.from([
  0xFF, 0xFF, 0xFF, 0xFF,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00
]);

const PA_INVALID_INDEX = 0xFFFFFFFF;

/*

$ rg pa_tagstruct_put pulseaudio/src/pulse/introspect.c | cut -d '(' -f 1 | sort | uniq -c | sort -rn

     44     pa_tagstruct_putu32
     40     pa_tagstruct_puts
     10     pa_tagstruct_put_boolean
      6     pa_tagstruct_put_cvolume
      1     pa_tagstruct_puts64

TODO: boolean and s64 are not implemented

*/

class PacketBuilder {
  constructor() {
    this.contents = [];
  }

  putu32(n) {
    this.contents.push([ 'u32', n ]);
    return this;
  }

  puts(s) {
    this.contents.push([ 's', s ]);
    return this;
  }

  putcvolume(volumes) {
    this.contents.push([ 'cvolume', volumes ]);
    return this;
  }

  toBuffer() {
    let len = 4 + PACKET_STATIC_FIELDS.length;

    for (const [type, value] of this.contents) {
      len += 1;
      if (type === 'u32') {
        len += 4;
      } else if (type === 's') {
        if (typeof value === 'string' && value.length > 0) {
          len += Buffer.byteLength(value);
          len += 1;
        }
      } else if (type === 'cvolume') {
        len += 1 + (4 * value.length);
      }
    }

    const buf = Buffer.allocUnsafe(len);

    buf.writeUInt32BE(buf.length - 20, 0, true);
    PACKET_STATIC_FIELDS.copy(buf, 4);

    let pos = 20;
    for (const [type, value] of this.contents) {
      if (type === 'u32') {
        buf[pos++] = PA_TAG_U32;

        if (typeof value === 'number') {
          buf.writeUInt32BE(value, pos, true);
        } else {
          buf.writeUInt32BE(PA_INVALID_INDEX, pos, true);
        }
        pos += 4;
      } else if (type === 's') {
        if (typeof value === 'string' && value.length > 0) {
          buf[pos++] = PA_TAG_STRING;

          const bytesWritten = buf.write(value, pos);
          pos += bytesWritten;
          buf[pos++] = 0;
        } else {
          buf[pos++] = PA_TAG_STRING_NULL;
        }
      } else if (type === 'cvolume') {
        buf[pos++] = PA_TAG_CVOLUME;
        buf[pos++] = value.length;
        for (const v of value) {
          buf.writeUInt32BE(v, pos, true);
          pos += 4;
        }
      }
    }

    return buf;
  }
}

module.exports = {
  PACKET_STATIC_FIELDS,

  PA_INVALID_INDEX,

  PA_TAG_INVALID,
  PA_TAG_STRING,
  PA_TAG_STRING_NULL,
  PA_TAG_U32,
  PA_TAG_U8,
  PA_TAG_U64,
  PA_TAG_S64,
  PA_TAG_SAMPLE_SPEC,
  PA_TAG_ARBITRARY,
  PA_TAG_BOOLEAN_TRUE,
  PA_TAG_BOOLEAN_FALSE,
  PA_TAG_BOOLEAN,
  PA_TAG_TIMEVAL,
  PA_TAG_USEC,
  PA_TAG_CHANNEL_MAP,
  PA_TAG_CVOLUME,
  PA_TAG_PROPLIST,
  PA_TAG_VOLUME,
  PA_TAG_FORMAT_INFO,

  PacketBuilder,
};
