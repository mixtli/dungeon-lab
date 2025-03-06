import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as storageService from '../services/storage.service.mjs';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Allow common file types
    const allowedFileTypes = [
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
      // Audio
      '.mp3', '.wav', '.ogg',
      // Video
      '.mp4', '.webm', '.avi',
      // Archives
      '.zip', '.rar', '.7z',
      // Game assets
      '.json', '.xml', '.fbx', '.obj', '.gltf', '.glb'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(ext)) {
      return cb(null, true);
    }
    
    cb(new Error(`File type ${ext} is not allowed`));
  }
});

// Define a custom Request interface with file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Upload a file
export const uploadFile = [
  upload.single('file'),
  asyncHandler(async (req: MulterRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    
    const { originalname, buffer, mimetype } = req.file;
    const folder = req.body.folder || '';
    
    const result = await storageService.uploadFile(buffer, originalname, mimetype, folder);
    
    res.status(201).json({
      message: 'File uploaded successfully',
      ...result
    });
  })
];

// Get a file URL
export const getFileUrl = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  if (!key) {
    res.status(400).json({ message: 'File key is required' });
    return;
  }
  
  const url = await storageService.getFileUrl(key);
  
  res.status(200).json({
    url
  });
});

// Delete a file
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  
  if (!key) {
    res.status(400).json({ message: 'File key is required' });
    return;
  }
  
  await storageService.deleteFile(key);
  
  res.status(200).json({
    message: 'File deleted successfully'
  });
});

// List files
export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const prefix = req.query.prefix as string || '';
  const recursive = req.query.recursive !== 'false';
  
  const files = await storageService.listFiles(prefix, recursive);
  
  res.status(200).json({
    files
  });
}); 