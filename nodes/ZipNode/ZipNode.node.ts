// @ts-ignore
import { IExecuteFunctions } from 'n8n-core';
// @ts-ignore
import { INodeExecutionData, NodeOperationError } from 'n8n-workflow';
// @ts-ignore
import archiver from 'archiver';
// @ts-ignore
import encryptedArchiver from 'archiver-zip-encrypted';
// @ts-ignore
import * as unzipper from 'unzipper';
import { Blob } from 'buffer';

archiver.registerFormat('zip-encrypted', encryptedArchiver);

export class ZipNode {
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const operation = this.getNodeParameter('operation', 0) as string;
    const fileBuffer = Buffer.from(this.getNodeParameter('fileBuffer', 0) as string, 'base64');
    const fileName = this.getNodeParameter('fileName', 0) as string;
    const password = this.getNodeParameter('password', 0) as string;

    const createEncryptedArchive = async (name: string, password: string, buffer: Buffer): Promise<Buffer> => {
      const useEncryption = !!password;
      const archive = useEncryption
        ? archiver.create('zip-encrypted', { zlib: { level: 8 }, encryptionMethod: 'aes256', password } as any)
        : archiver('zip', { zlib: { level: 8 } });

      archive.append(buffer, { name });
      await archive.finalize();
      return Buffer.concat(await archiveToBuffer(archive));
    };

    const extractArchive = async (buffer: Buffer, password: string): Promise<{ name: string; data: string }[]> => {
      const files: { name: string; data: string }[] = [];

      const { configure, BlobReader, ZipReader, Uint8ArrayWriter } = await import('@zip.js/zip.js');
      configure({ useWebWorkers: false });

      const reader = new ZipReader(new BlobReader(new Blob([buffer])));
      const entries = await reader.getEntries();

      for (const entry of entries) {
        if (entry.encrypted && !password) {
          throw new Error(`Entry '${entry.filename}' is password protected`);
        }

        const entryData = await entry.getData!(new Uint8ArrayWriter(), {
          password: password || undefined,
        });

        files.push({
          name: entry.filename,
          data: Buffer.from(entryData).toString('base64'),
        });
      }

      await reader.close();
      return files;
    };

    if (operation === 'zip') {
      const zipBuffer = await createEncryptedArchive(fileName, password, fileBuffer);
      return [[{ json: { zippedFile: zipBuffer.toString('base64') } }]];
    } else if (operation === 'unzip') {
      const unzippedFiles = await extractArchive(fileBuffer, password);
      return [[{ json: { files: unzippedFiles } }]];
    }
    throw new NodeOperationError(this.getNode(), 'Invalid operation');
  }
}

async function archiveToBuffer(archive: archiver.Archiver): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  await new Promise((resolve) => archive.on('end', resolve));
  return chunks;
}