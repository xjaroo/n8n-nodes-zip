import { INodeProperties } from 'n8n-workflow';

export const ZipNodeDescription: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    options: [
      { name: 'Zip', value: 'zip' },
      { name: 'Unzip', value: 'unzip' },
    ],
    default: 'zip',
  },
  {
    displayName: 'File Buffer',
    name: 'fileBuffer',
    type: 'string',
    default: '',
    description: 'The file buffer in base64 format',
  },
  {
    displayName: 'File Name',
    name: 'fileName',
    type: 'string',
    default: 'output.zip',
    description: 'Name of the output zip file',
  },
  {
    displayName: 'Password',
    name: 'password',
    type: 'string',
    typeOptions: { password: true },
    default: '',
    description: 'Password for encryption (zip) or decryption (unzip)',
  },
];