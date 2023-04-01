import { Essentials } from "./essentials";

enum Tag {
  Make = 0x010f,
  Model = 0x0110,
  ExifOffset = 0x8769,
  DateTimeOriginal = 0x9003,
  OffsetTimeOriginal = 0x9011,
}

enum DataFormat {
  Ascii = 2,
}

const tags = [
  Tag.Make,
  Tag.Model,
  Tag.ExifOffset,
  Tag.DateTimeOriginal,
  Tag.OffsetTimeOriginal,
];

class Parser {
  private isBigEndian?: boolean;
  private entries: { tag: Tag; value: string }[] = [];
  private exifOffset?: number;

  constructor(private readonly data: Buffer, private offset = 0) {}

  parse(): Essentials | undefined {
    this.parseHeader();
    this.parseIfd();
    if (!this.exifOffset) {
      throw new Error("no exif offset");
    }
    this.offset = this.exifOffset;
    this.parseIfd();

    const make = this.getEntryValue(Tag.Make);
    const model = this.getEntryValue(Tag.Model);
    const dateTimeOriginal = this.getEntryValue(Tag.DateTimeOriginal);
    const offsetTimeOriginal = this.getEntryValue(Tag.OffsetTimeOriginal);

    if (!dateTimeOriginal) {
      return;
    }

    const [date, time] = dateTimeOriginal.split(" ");

    return {
      creationDate: new Date(
        `${date.replace(/:/g, "-")}T${time}${offsetTimeOriginal || "+00:00"}`
      ),
      camera: make && model ? `${make} ${model}` : undefined,
    };
  }

  private parseHeader() {
    this.offset += 4; // app1 data size
    let exifString = this.readString(4);
    if (exifString !== "Exif") {
      throw new Error("Exif string is expected but not found");
    }
    this.offset += 2; // 0x0000 after Exif
    const byteOrder = this.readString(2);
    if (byteOrder !== "MM" && byteOrder !== "II") {
      throw new Error("unexpected byte order");
    }
    this.isBigEndian = byteOrder === "MM";
    this.offset += 2; // 0x0000 after MM or II
    const ifdOffset = this.read4() - 8; // minus tiff header length
    this.offset += ifdOffset;
  }

  private parseIfd() {
    let entryCount = this.read2();
    while (entryCount-- > 0) {
      const tag = this.read2();
      if (tag !== Tag.ExifOffset && !tags.includes(tag)) {
        this.offset += 10; // entry is 12 bytes, 2 bytes are already read
        continue;
      }
      const dataFormat = this.read2();
      const numberOfComponents = this.read4();
      const dataOffset = this.read4() + 10; // 10 is for exif header (4 + 4 + 2)
      const entry = this.readEntry(
        tag,
        dataFormat,
        numberOfComponents,
        dataOffset
      );
      this.entries.push(entry);
    }
    const offsetToNextIfd = this.read4();
    if (offsetToNextIfd === 0) {
      // no link, that's it
      return;
    }
    this.offset += offsetToNextIfd;
    this.parseIfd();
  }

  private getEntryValue(tag: Tag) {
    if (!this.entries) {
      throw new Error("parse ifd first");
    }
    return this.entries.find((x) => x.tag === tag)?.value;
  }

  private readEntry(
    tag: Tag,
    dataFormat: number,
    numberOfComponents: number,
    dataOffset: number
  ) {
    if (tag === Tag.ExifOffset) {
      this.exifOffset = dataOffset;
      return { tag, value: String(dataOffset) };
    }
    if (dataFormat !== DataFormat.Ascii) {
      throw new Error("unexpected data format");
    }
    return {
      tag,
      value: this.data.toString(
        "ascii",
        dataOffset,
        dataOffset + numberOfComponents - 1 // omit terminator (zero)
      ),
    };
  }

  private readString(length: number) {
    const result = this.data.toString(
      "ascii",
      this.offset,
      this.offset + length
    );
    this.offset += length;
    return result;
  }

  private read4() {
    if (this.isBigEndian === undefined) {
      throw new Error("parse header first to known byte order");
    }
    const result = this.isBigEndian
      ? this.data.readUint32BE(this.offset)
      : this.data.readUint32LE(this.offset);
    this.offset += 4;
    return result;
  }

  private read2() {
    if (this.isBigEndian === undefined) {
      throw new Error("parse header first to known byte order");
    }
    const result = this.isBigEndian
      ? this.data.readUint16BE(this.offset)
      : this.data.readUint16LE(this.offset);
    this.offset += 2;
    return result;
  }
}

export function parseEssentials(data: Buffer): Essentials | undefined {
  const parser = new Parser(data);
  return parser.parse();
}
