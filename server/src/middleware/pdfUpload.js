import multer from 'multer';
import { AppError } from './errorHandler.js';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_SIZE,
    files: 1,
    fields: 5,
  },
  fileFilter: (req, file, callback) => {
    const isPdfMimeType = file.mimetype === 'application/pdf';
    const isPdfExtension = /\.pdf$/i.test(file.originalname || '');

    if (!isPdfMimeType || !isPdfExtension) {
      return callback(
        new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE')
      );
    }
    callback(null, true);
  },
});

export const uploadSinglePdf = pdfUpload.single('file');
