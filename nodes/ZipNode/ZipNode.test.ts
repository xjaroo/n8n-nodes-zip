import { ZipNode } from './ZipNode.node';

(async () => {
  try {
    console.log('🚀 Test started');

    const node = new ZipNode();
    const originalText = 'Hello, test!';
    const fileData = Buffer.from(originalText);
    const base64Buffer = fileData.toString('base64');
    const password = 'secure123';
    const fileName = 'test.txt';

    const context = {
      getInputData: () => [{ json: {} }],
      getNodeParameter: (name: string) => {
        if (name === 'operation') return 'zip';
        if (name === 'fileBuffer') return base64Buffer;
        if (name === 'fileName') return fileName;
        if (name === 'password') return password;
        return '';
      },
      getNode: () => ({ name: 'TestZipNode' }),
    } as any;

    console.log('🔐 Testing Zip Operation with Password');
    const zipped = await node.execute.call(context);
    const zippedFile = (zipped[0][0].json as { zippedFile: string }).zippedFile;
    const zippedBuffer = Buffer.from(zippedFile, 'base64');

    context.getNodeParameter = (name: string) => {
      if (name === 'operation') return 'unzip';
      if (name === 'fileBuffer') return zippedBuffer.toString('base64');
      if (name === 'password') return password;
      return '';
    };

    console.log('📂 Testing Unzip Operation with Password');
    const unzipped = await node.execute.call(context);
    const files = (unzipped[0][0].json as { files: { name: string; data: string }[] }).files;
    const result = Buffer.from(files[0].data, 'base64').toString('utf-8');

    console.log('✅ Result:', result);
    console.assert(result === originalText, '❌ Unzipped content does not match original');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
