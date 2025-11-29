const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const uploadToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const stream = cloudinary.uploader.upload_stream(
      { public_id: filename, folder: "wonderlust" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    readable.pipe(stream);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
