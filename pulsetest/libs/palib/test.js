"use strict";
exports.__esModule = true;
var PA_TAGS;
(function (PA_TAGS) {
    PA_TAGS[PA_TAGS["PA_TAG_INVALID"] = 0] = "PA_TAG_INVALID";
    PA_TAGS["PA_TAG_STRING"] = "t";
    PA_TAGS["PA_TAG_STRING_NULL"] = "N";
    PA_TAGS["PA_TAG_U32"] = "L";
    PA_TAGS["PA_TAG_U8"] = "B";
    PA_TAGS["PA_TAG_U64"] = "R";
    PA_TAGS["PA_TAG_S64"] = "r";
    PA_TAGS["PA_TAG_SAMPLE_SPEC"] = "a";
    PA_TAGS["PA_TAG_ARBITRARY"] = "x";
    PA_TAGS["PA_TAG_BOOLEAN_TRUE"] = "1";
    PA_TAGS["PA_TAG_BOOLEAN_FALSE"] = "0";
    PA_TAGS["PA_TAG_BOOLEAN"] = "1";
    PA_TAGS["PA_TAG_TIMEVAL"] = "T";
    PA_TAGS["PA_TAG_USEC"] = "U"; /* 64bit unsigned */
    PA_TAGS["PA_TAG_CHANNEL_MAP"] = "m";
    PA_TAGS["PA_TAG_CVOLUME"] = "v";
    PA_TAGS["PA_TAG_PROPLIST"] = "P";
    PA_TAGS["PA_TAG_VOLUME"] = "V";
    PA_TAGS["PA_TAG_FORMAT_INFO"] = "f";
})(PA_TAGS || (PA_TAGS = {}));
var PA_PACKET_HEADER = Buffer.from([
    0xFF, 0xFF, 0xFF, 0xFF,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
]);
var PATagStruct = /** @class */ (function () {
    function PATagStruct() {
        this.tags = [];
    }
    PATagStruct.prototype.putu32 = function (value) {
        this.tags.push(new PA_U32(value));
    };
    PATagStruct.prototype.put_boolean = function (value) {
        this.tags.push(new PA_Boolean(value));
    };
    PATagStruct.prototype.put_arbitrary = function (value) {
        this.tags.push(new PA_Arbitrary(value));
    };
    PATagStruct.prototype.writePacket = function () {
        var tagsSize = this.tags.reduce(function (sum, tag) {
            sum += tag.size;
            return sum;
        }, 0);
        // PA Packet
        // 4 bytes: packet size
        // 16 bytes: PA header
        // X bytes: [PA tag + value]
        var buffer = Buffer.allocUnsafe(4 + PA_PACKET_HEADER.length + tagsSize);
    };
    return PATagStruct;
}());
var PA_U32 = /** @class */ (function () {
    function PA_U32(value, type, size, buffer) {
        if (type === void 0) { type = PA_TAGS.PA_TAG_U32; }
        if (size === void 0) { size = 0; }
        if (buffer === void 0) { buffer = null; }
        this.value = value;
        this.type = type;
        this.size = size;
        this.buffer = buffer;
        this.size = 5;
        this.buffer = Buffer.allocUnsafe(this.size);
        this.put();
    }
    PA_U32.prototype.put = function () {
        var offset = 0;
        offset = this.buffer.writeUInt8(this.type.toString().charCodeAt(0), offset);
        offset = this.buffer.writeUInt32BE(this.value, offset);
        return offset;
    };
    return PA_U32;
}());
var PA_Arbitrary = /** @class */ (function () {
    function PA_Arbitrary(value, type, size, buffer) {
        if (type === void 0) { type = PA_TAGS.PA_TAG_ARBITRARY; }
        if (size === void 0) { size = 0; }
        if (buffer === void 0) { buffer = null; }
        this.value = value;
        this.type = type;
        this.size = size;
        this.buffer = buffer;
        this.size = 5 + this.value.length;
        this.buffer = Buffer.allocUnsafe(this.size);
        this.put();
    }
    PA_Arbitrary.prototype.put = function () {
        var offset = 0;
        offset = this.buffer.writeUInt8(this.type.toString().charCodeAt(0), offset);
        offset = this.buffer.writeUInt32BE(this.value.length, offset);
        offset += this.value.copy(this.buffer, offset);
        return offset;
    };
    return PA_Arbitrary;
}());
var PA_Boolean = /** @class */ (function () {
    function PA_Boolean(value, type, size, buffer) {
        if (type === void 0) { type = PA_TAGS.PA_TAG_BOOLEAN; }
        if (size === void 0) { size = 0; }
        if (buffer === void 0) { buffer = null; }
        this.value = value;
        this.type = type;
        this.size = size;
        this.buffer = buffer;
        this.size = 1;
        this.buffer = Buffer.allocUnsafe(this.size);
        this.put();
    }
    PA_Boolean.prototype.put = function () {
        this.type = this.value ? PA_TAGS.PA_TAG_BOOLEAN_TRUE : PA_TAGS.PA_TAG_BOOLEAN_FALSE;
        var offset = 0;
        offset = this.buffer.writeUInt8(this.type.toString().charCodeAt(0), offset);
        return offset;
    };
    return PA_Boolean;
}());
var tagStruct = new PATagStruct();
tagStruct.putu32(123);
tagStruct.put_boolean(false);
tagStruct.put_arbitrary(Buffer.from('123456'));
console.log(tagStruct);
tagStruct.writePacket();
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
