import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { auth } from '../middleware/auth.js';
import { uploadBuffer } from '../services/storageService.js';

const r = Router();
const upload = multer();

r.post('/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const key = `${req.user.sub}/${uuid()}-${req.file.originalname}`;
  const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
  res.json({ url, key });
});

export default r;
