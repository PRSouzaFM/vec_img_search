import fs from 'fs'
import express from 'express';
import multer from 'multer';
import weaviate from 'weaviate-ts-client';
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config()

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const client = weaviate.client({
  scheme: 'http',
  host: process.env.HOST,
});

// Set up Multer middleware to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });


app.post('/vectorize', upload.single('image'), async (req, res) => {
  try {
    // Convert image data to base64-encoded string
    const b64 = Buffer.from(req.file.buffer).toString('base64');

    // Create meme using Weaviate client
    await client.data.creator()
      .withClassName('Skin_conditions')
      .withProperties({
        image: b64,
        text: req.body.text
      })
      .do();

    res.status(200).json({ message: ' vector created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/search', upload.single('image'), async (req, res) => {
  try {
    // Read file from request and convert to base64
    const file = req.file.buffer.toString('base64');

    // Search for matching image in Weaviate
    const resImage = await client.graphql.get()
      .withClassName('Skin_conditions')
      .withFields(['image'])
      .withNearImage({ image: file })
      .withLimit(1)
      .do();

    // Write result to filesystem
    const result = resImage.data.Get.Skin_conditions[0].image;
    const filename = `result-${Date.now()}.jpg`;
    fs.writeFileSync(filename, result, 'base64');
    // Send file back in response
    res.setHeader('Content-Type', 'image/jpeg');
    const absolutePath = resolve(__dirname, filename);
    res.sendFile(absolutePath);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});



app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
