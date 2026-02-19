import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { auth } from '../middleware/auth.js';
import { uploadBuffer } from '../services/storageService.js';
import { asyncHandler } from '../middleware/error.js';

const r = Router();
const upload = multer();

r.post('/upload', auth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'file is required' } });
  const key = `${req.user.sub}/${uuid()}-${req.file.originalname}`;
  const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
  res.json({ ok: true, file: { url, key } });
}));

export default r;
