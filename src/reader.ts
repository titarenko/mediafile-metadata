import { Stats } from "fs";
import fs from "fs/promises";

export interface Reader {
  isBigEndian: boolean;
  canRead(): Promise<boolean>;
  getOffset(): number;
  getSubreader(length: number): Reader;
  incrementOffset(increment: number): void;
  readAsciiString(length: number): Promise<string>;
  readUtf8String(length: number): Promise<string>;
  readBuffer(length: number): Promise<Buffer>;
  read1(): Promise<number>;
  read2(): Promise<number>;
  read4(): Promise<number>;
  read8(): Promise<BigInt>;
}

export class BufferReader implements Reader {
  public isBigEndian = true;

  constructor(
    private readonly buffer: Buffer,
    private offset = 0,
    private maxOffset?: number
  ) {}

  getSubreader(length: number): Reader {
    return new BufferReader(this.buffer, this.offset, this.offset + length);
  }

  async readUtf8String(length: number): Promise<string> {
    const result = this.buffer.toString(
      "utf-8",
      this.offset,
      this.offset + length
    );
    this.offset += length;
    return result;
  }

  async readBuffer(length: number): Promise<Buffer> {
    return this.buffer.subarray(this.offset, this.offset + length);
  }

  getOffset(): number {
    return this.offset;
  }

  incrementOffset(increment: number): void {
    this.offset += increment;
  }

  async canRead() {
    return this.offset < (this.maxOffset || this.buffer.length);
  }

  async readAsciiString(length: number) {
    const result = this.buffer.toString(
      "ascii",
      this.offset,
      this.offset + length
    );
    this.offset += length;
    return result;
  }

  async read1() {
    const result = this.buffer.readUInt8();
    this.offset += 1;
    return result;
  }

  async read2() {
    const result = this.isBigEndian
      ? this.buffer.readUInt16BE()
      : this.buffer.readUInt16LE();
    this.offset += 2;
    return result;
  }

  async read4() {
    const result = this.isBigEndian
      ? this.buffer.readUInt32BE()
      : this.buffer.readUInt32LE();
    this.offset += 4;
    return result;
  }

  async read8() {
    const result = this.isBigEndian
      ? this.buffer.readBigUInt64BE()
      : this.buffer.readBigUInt64LE();
    this.offset += 8;
    return result;
  }
}

export class FileReader implements Reader {
  public isBigEndian = true;

  private buffer: Buffer = Buffer.alloc(8);
  private stats?: Stats;

  constructor(
    private readonly handle: fs.FileHandle,
    private offset = 0,
    private maxOffset?: number
  ) {}

  getSubreader(length: number): Reader {
    return new FileReader(this.handle, this.offset, this.offset + length);
  }

  async readBuffer(length: number): Promise<Buffer> {
    const buffer = Buffer.alloc(length);
    await this.handle.read(buffer, 0, length, this.offset);
    return buffer;
  }

  getOffset(): number {
    return this.offset;
  }

  incrementOffset(increment: number): void {
    this.offset += increment;
  }

  async canRead() {
    if (this.maxOffset) {
      return this.offset < this.maxOffset;
    }
    if (!this.stats) {
      this.stats = await this.handle.stat();
    }
    return this.offset < this.stats.size;
  }

  async readAsciiString(length: number) {
    await this.read(length);
    return this.buffer.toString("ascii", 0, length);
  }

  async readUtf8String(length: number) {
    await this.read(length);
    return this.buffer.toString("utf-8", 0, length);
  }

  async read1() {
    await this.read(1);
    return this.buffer.readUInt8();
  }

  async read2() {
    await this.read(2);
    return this.isBigEndian
      ? this.buffer.readUInt16BE()
      : this.buffer.readUInt16LE();
  }

  async read4() {
    await this.read(4);
    return this.isBigEndian
      ? this.buffer.readUInt32BE()
      : this.buffer.readUInt32LE();
  }

  async read8() {
    await this.read(8);
    return this.isBigEndian
      ? this.buffer.readBigUInt64BE()
      : this.buffer.readBigUInt64LE();
  }

  private async read(bytes: number): Promise<void> {
    if (this.buffer.length < bytes) {
      this.buffer = Buffer.alloc(bytes);
    }
    await this.handle.read(this.buffer, 0, bytes, this.offset);
    this.offset += bytes;
  }
}
