import { Essentials } from "./essentials";
import { Reader } from "./reader";

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

interface IfdEntry {
  tag: Tag;
  value: string;
}

export async function parseEssentials(
  reader: Reader
): Promise<Essentials | undefined> {
  await parseHeader(reader);
  let entries = await parseIfd(reader);
  const exifOffset = entries.find((x) => x.tag === Tag.ExifOffset);
  if (!exifOffset) {
    throw new Error("no exif offset");
  }
  reader.setOffset(Number(exifOffset.value));
  entries = await parseIfd(reader, entries);

  const getEntryValue = (tag: Tag) => entries.find((x) => x.tag === tag)?.value;

  const make = getEntryValue(Tag.Make);
  const model = getEntryValue(Tag.Model);
  const dateTimeOriginal = getEntryValue(Tag.DateTimeOriginal);
  const offsetTimeOriginal = getEntryValue(Tag.OffsetTimeOriginal);

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

async function parseHeader(reader: Reader) {
  const byteOrder = await reader.readAsciiString(2);
  if (byteOrder !== "MM" && byteOrder !== "II") {
    throw new Error("unexpected byte order");
  }
  reader.isBigEndian = byteOrder === "MM";
  const magicNumber = await reader.readUnsignedInteger(2);
  if (magicNumber !== 0x002a) {
    throw new Error("probably not a tiff, magic number is wrong");
  }
  const ifdOffset = (await reader.readUnsignedInteger(4)) - 8; // minus tiff header length
  reader.incrementOffset(ifdOffset);
}

async function parseIfd(
  reader: Reader,
  entries: IfdEntry[] = []
): Promise<IfdEntry[]> {
  let entryCount = await reader.readUnsignedInteger(2);
  while (entryCount-- > 0) {
    const tag = await reader.readUnsignedInteger(2);
    if (tag !== Tag.ExifOffset && !tags.includes(tag)) {
      reader.incrementOffset(10); // entry is 12 bytes, 2 bytes are already read
      continue;
    }
    const dataFormat = await reader.readUnsignedInteger(2);
    const numberOfComponents = await reader.readUnsignedInteger(4);
    const dataOffset = await reader.readUnsignedInteger(4);
    const entry = await readEntry(
      reader,
      tag,
      dataFormat,
      numberOfComponents,
      dataOffset
    );
    entries.push(entry);
  }
  const offsetToNextIfd = await reader.readUnsignedInteger(4);
  if (offsetToNextIfd === 0) {
    // no link, that's it
    return entries;
  }
  reader.setOffset(offsetToNextIfd);
  return parseIfd(reader, entries);
}

async function readEntry(
  reader: Reader,
  tag: Tag,
  dataFormat: number,
  numberOfComponents: number,
  dataOffset: number
): Promise<IfdEntry> {
  if (tag === Tag.ExifOffset) {
    return { tag, value: String(dataOffset) };
  }
  if (dataFormat !== DataFormat.Ascii) {
    throw new Error("unexpected data format");
  }

  const currentOffset = reader.getOffset();
  reader.setOffset(dataOffset);
  const value = await reader.readAsciiString(numberOfComponents - 1); // omit terminator (zero)
  reader.setOffset(currentOffset);

  return { tag, value };
}
