import { Stats } from "fs";
import fs from "fs/promises";

export interface Reader {
  isBigEndian: boolean;
  canRead(maxOffset?: number): Promise<boolean>;
  getOffset(): number;
  incrementOffset(increment: number): void;
  readString(length: number): Promise<string>;
  readBuffer(length: number): Promise<Buffer>;
  read1(): Promise<number>;
  read2(): Promise<number>;
  read4(): Promise<number>;
  read8(): Promise<BigInt>;
}

export class BufferReader implements Reader {
  public isBigEndian = true;

  constructor(private readonly buffer: Buffer, private offset = 0) {}

  async readBuffer(length: number): Promise<Buffer> {
    return this.buffer.subarray(this.offset, this.offset + length);
  }

  getOffset(): number {
    return this.offset;
  }

  incrementOffset(increment: number): void {
    this.offset += increment;
  }

  async canRead(maxOffset?: number) {
    return this.offset < (maxOffset || this.buffer.length);
  }

  async readString(length: number, offset = 0) {
    this.read(length);
    return this.buffer.toString("ascii", offset, offset + length);
  }

  async read1() {
    this.read(1);
    return this.buffer.readUInt8();
  }

  async read2() {
    this.read(2);
    return this.isBigEndian
      ? this.buffer.readUInt16BE()
      : this.buffer.readUInt16LE();
  }

  async read4() {
    this.read(4);
    return this.isBigEndian
      ? this.buffer.readUInt32BE()
      : this.buffer.readUInt32LE();
  }

  async read8() {
    this.read(8);
    return this.isBigEndian
      ? this.buffer.readBigUInt64BE()
      : this.buffer.readBigUInt64LE();
  }

  private read(bytes: number, offset?: number) {
    if (offset === undefined) {
      this.offset += bytes;
    }
  }
}

export class FileReader implements Reader {
  public isBigEndian = true;

  private buffer: Buffer = Buffer.alloc(8);
  private offset = 0;
  private stats?: Stats;

  constructor(private readonly handle: fs.FileHandle) {}

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

  async canRead(maxOffset?: number) {
    if (!this.stats) {
      this.stats = await this.handle.stat();
    }
    return this.offset < (maxOffset || this.stats.size);
  }

  async readString(length: number, offset?: number) {
    await this.read(length, offset);
    return this.buffer.toString("ascii", 0, length);
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

  private async read(bytes: number, offset?: number): Promise<void> {
    if (this.buffer.length < bytes) {
      this.buffer = Buffer.alloc(bytes);
    }
    await this.handle.read(this.buffer, 0, bytes, offset || this.offset);
    if (offset === undefined) {
      this.offset += bytes;
    }
  }
}
