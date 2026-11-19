const Tag = require('../models/tag.model');
const Hotel = require('../models/hotel.model');
const { logEvent } = require('../services/audit.service');

exports.createTag = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required' });
    const existing = await Tag.findOne({ name: name.toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: 'Tag already exists' });
    const tag = await Tag.create({ name, description: description || '', createdBy: req.user.id });
    await logEvent(req, { action: 'TAG_CREATE', entity: 'Tag', entityId: tag._id, details: { name: tag.name } });
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create tag', error: err.message });
  }
};

exports.getTags = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
    const tags = await Tag.find(filter).sort({ name: 1 });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tags', error: err.message });
  }
};

exports.getTagById = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tag', error: err.message });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    const { name, description } = req.body;
    if (name) tag.name = name.toLowerCase().trim();
    if (description !== undefined) tag.description = description;
    await tag.save();
    await logEvent(req, { action: 'TAG_UPDATE', entity: 'Tag', entityId: tag._id, details: { name: tag.name } });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update tag', error: err.message });
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    await Hotel.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } });
    await tag.deleteOne();
    await logEvent(req, { action: 'TAG_DELETE', entity: 'Tag', entityId: req.params.id, details: { name: tag.name } });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete tag', error: err.message });
  }
};
