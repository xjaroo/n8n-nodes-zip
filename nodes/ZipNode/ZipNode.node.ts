// @ts-ignore
import { IExecuteFunctions, INodeTypeDescription, INodeType} from 'n8n-core';
// @ts-ignore
import { INodeExecutionData, NodeOperationError } from 'n8n-workflow';
// @ts-ignore
import archiver from 'archiver';
// @ts-ignore
import encryptedArchiver from 'archiver-zip-encrypted';
// @ts-ignore
import * as unzipper from 'unzipper';
import { Blob } from 'buffer';

import { ZipNodeDescription } from './ZipNodeDescription'

archiver.registerFormat('zip-encrypted', encryptedArchiver);

export class ZipNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Base64 Zip Processor',
    name: 'zipNode',
    icon: 'file:ZipNode.svg',
    group: ['transform'],
    version: 1,
    description: 'Compress or extract zip files',
    defaults: {
      name: 'Base64 Zip Processor',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: ZipNodeDescription,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const operation = this.getNodeParameter('operation', 0) as string;
    const fileBuffer = Buffer.from(this.getNodeParameter('fileBuffer', 0) as string, 'base64');    
    const fileName = (operation === 'zip') ? this.getNodeParameter('fileName', 0) as string : '';        
    const password = this.getNodeParameter('password', 0) as string;

    const createEncryptedArchive = async (name: string, password: string, buffer: Buffer): Promise<INodeExecutionData> => {
      const useEncryption = !!password;
      const archive = useEncryption
        ? archiver.create('zip-encrypted', { zlib: { level: 8 }, encryptionMethod: 'aes256', password } as any)
        : archiver('zip', { zlib: { level: 8 } });
      const fileName = !name ? 'output' : name;

      archive.append(buffer, { name });
      await archive.finalize();
      const finalBuffer = Buffer.concat(await archiveToBuffer(archive));
      return {
        json: {},
        binary: {
          data: {
            mimeType: 'application/zip',
            fileName: `${fileName}.zip`,
            data: finalBuffer.toString('base64')
          }
        }
      };
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
      const zippedData = await createEncryptedArchive(fileName, password, fileBuffer);
      return [[zippedData]];
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