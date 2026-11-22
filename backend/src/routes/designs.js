const { Router } = require('express');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { z } = require('zod');
const { Measurement, MeasurementDesign } = require('../models');
const { HttpError, wrap, parse, requireAuth, audit, uuidParams } = require('../middleware');

const MAX_IMAGES = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const TYPES = {
  'image/jpeg': { ext: 'jpg', valid: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: 'png', valid: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: 'webp', valid: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
};

const uploadSchema = z.object({
  designs: z.array(z.object({
    name: z.string().trim().min(1).max(255),
    dataUrl: z.string().max(3_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/, 'Only JPEG, PNG or WebP images are supported.'),
  })).min(1).max(MAX_IMAGES),
});

const findMeasurement = async (req) => {
  const measurement = await Measurement.findOne({ where: { id: req.params.id, businessId: req.businessId } });
  if (!measurement) throw new HttpError(404, 'Measurement not found.');
  return measurement;
};

const decode = (dataUrl) => {
  const match = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) throw new HttpError(400, 'Only JPEG, PNG or WebP images are supported.');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  const spec = TYPES[match[1]];
  if (!buffer.length || buffer.length > MAX_BYTES || !spec.valid(buffer)) throw new HttpError(400, 'Each image must be a valid JPEG, PNG or WebP under 2 MB.');
  return { buffer, mimeType: match[1], ext: spec.ext };
};

const uploadRouter = Router();
uploadRouter.use(requireAuth);
uuidParams(uploadRouter, 'id');
uploadRouter.post('/:id/designs', wrap(async (req, res) => {
  const measurement = await findMeasurement(req);
  const d = parse(uploadSchema, req.body);
  const existing = await MeasurementDesign.count({ where: { measurementId: measurement.id, businessId: req.businessId } });
  if (existing + d.designs.length > MAX_IMAGES) throw new HttpError(400, `You can save up to ${MAX_IMAGES} designs per measurement.`, { designs: `Only ${MAX_IMAGES - existing} more can be added.` });
  const files = d.designs.map((f) => ({ ...decode(f.dataUrl), name: path.basename(f.name).slice(0, 255) }));
  await fs.mkdir(uploadDir, { recursive: true });
  const created = [];
  let currentFilename = null;
  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const filename = `${crypto.randomUUID()}.${file.ext}`;
      currentFilename = filename;
      await fs.writeFile(path.join(uploadDir, filename), file.buffer, { mode: 0o600, flag: 'wx' });
      created.push(await MeasurementDesign.create({
        businessId: req.businessId, measurementId: measurement.id, position: existing + i + 1,
        filename, originalName: file.name, mimeType: file.mimeType, sizeBytes: file.buffer.length,
      }));
      currentFilename = null;
    }
  } catch (err) {
    const toRemove = [...created.map((r) => r.filename), currentFilename].filter(Boolean);
    await Promise.all(toRemove.map((filename) => fs.unlink(path.join(uploadDir, filename)).catch(() => {})));
    throw err;
  }
  await audit(req, 'measurement.design_upload', 'measurement', measurement.id, { count: created.length });
  const designs = await MeasurementDesign.findAll({ where: { measurementId: measurement.id, businessId: req.businessId }, order: [['position', 'ASC']] });
  res.status(201).json({ designs });
}));

const designRouter = Router();
designRouter.use(requireAuth);
uuidParams(designRouter, 'id');

const findDesign = async (req) => {
  const design = await MeasurementDesign.findOne({ where: { id: req.params.id, businessId: req.businessId } });
  if (!design) throw new HttpError(404, 'Image not found.');
  return design;
};

designRouter.get('/:id', wrap(async (req, res) => {
  const design = await findDesign(req);
  let buffer;
  try { buffer = await fs.readFile(path.join(uploadDir, design.filename)); }
  catch { throw new HttpError(404, 'Image not found.'); }
  res.set('Content-Type', design.mimeType);
  res.set('Content-Disposition', `inline; filename="${design.originalName.replace(/["\r\n]/g, '')}"`);
  res.set('Cache-Control', 'private, no-store');
  res.send(buffer);
}));

designRouter.delete('/:id', wrap(async (req, res) => {
  const design = await findDesign(req);
  const measurementId = design.measurementId;
  await design.destroy();
  await fs.unlink(path.join(uploadDir, design.filename)).catch(() => {});
  const remaining = await MeasurementDesign.findAll({ where: { measurementId, businessId: req.businessId }, order: [['position', 'ASC']] });
  for (let i = 0; i < remaining.length; i += 1) await remaining[i].update({ position: i + 1 });
  await audit(req, 'measurement.design_delete', 'measurement', measurementId, { designId: design.id });
  res.json({ ok: true });
}));

module.exports = { uploadRouter, designRouter };
