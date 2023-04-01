import { Essentials } from "./essentials";
import { Reader } from "./reader";

class Parser {
  constructor(private readonly reader: Reader) {}

  async parse(): Promise<Essentials | undefined> {
    const size = await this.reader.read4();
    const type = await this.reader.readString(4);
    if (type !== "ftyp") {
      return;
    }

    const brand = await this.reader.readString(4);
    this.reader.incrementOffset(size - 12); // 3 fields of 4 bytes each

    switch (brand) {
      case "isom":
        return this.parseIsom();
      default:
        throw new Error(`unexpected brand: ${brand}`);
    }
  }

  private async parseIsom(): Promise<Essentials | undefined> {
    let result: Essentials | undefined;

    let box = await this.scrollTo("moov");
    if (!box) {
      return result;
    }

    box = await this.scrollTo("mvhd");
    if (!box) {
      return result;
    }
    this.reader.incrementOffset(4);
    const time = await this.reader.read4();
    result = {
      creationDate: new Date((time - 2082844800) * 1000),
    };
    this.reader.incrementOffset(box.size - 8);

    box = await this.scrollTo("meta");
    if (!box) {
      return result;
    }

    box = await this.scrollTo("keys");
    if (!box) {
      return result;
    }
    this.reader.incrementOffset(4);
    let keysCount = await this.reader.read4();
    const keys: Record<number, string> = {};
    for (let keyIndex = 0; keyIndex < keysCount; ++keyIndex) {
      const canRead = await this.reader.canRead();
      if (!canRead) {
        break;
      }
      const size = await this.reader.read4();
      this.reader.incrementOffset(4); // namespace is string of length 4
      const value = await this.reader.readString(size);
      if (
        value === "com.android.version" ||
        value === "com.apple.quicktime.make" ||
        value === "com.apple.quicktime.model"
      ) {
        keys[keyIndex] = value;
      }
    }
    if (!Object.keys(keys).length) {
      return result;
    }

    box = await this.scrollTo("ilst");
    if (!box) {
      return result;
    }
    const values: Record<string, string> = {};
    const maxIlstOffset = this.reader.getOffset() + box.size;
    while (true) {
      const canRead = await this.reader.canRead(maxIlstOffset);
      if (!canRead) {
        break;
      }
      const size = await this.reader.read4();
      const index = (await this.reader.read4()) - 1;
      if (keys[index]) {
        box = await this.scrollTo("data");
        if (!box) {
          break;
        }
        const type = await this.reader.read4();
        this.reader.incrementOffset(4); // locale is 4 bytes number
        const value = await this.reader.readBuffer(8);
        if (type !== 1) {
          throw new Error(`unexpected type: ${type}`);
        }
        values[keys[index]] = value.toString("utf-8");
      } else {
        this.reader.incrementOffset(size - 4); // index field is 4 bytes
      }
    }
    if (!Object.keys(values).length) {
      return result;
    }

    if ("com.android.version" in values) {
      result.camera = `Android ${values["com.android.version"]}`;
    } else if ("com.apple.quicktime.make" in values) {
      result.camera = `${values["com.apple.quicktime.make"]} ${values["com.apple.quicktime.model"]}`;
    }

    return result;
  }

  private async scrollTo(...desiredTypes: string[]) {
    while (true) {
      const canRead = await this.reader.canRead();
      if (!canRead) {
        return;
      }
      const size = (await this.reader.read4()) - 8; // 4 bytes size and 4 bytes type
      const type = await this.reader.readString(4);
      if (desiredTypes.includes(type)) {
        return { type, size };
      }
      this.reader.incrementOffset(size);
    }
  }
}

export async function parseEssentials(
  reader: Reader
): Promise<Essentials | undefined> {
  return new Parser(reader).parse();
}
