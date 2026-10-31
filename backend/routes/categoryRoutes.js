const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Category = require("../models/Category");
const Food = require("../models/Food");

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "-");
    cb(null, `${Date.now()}-${cleanName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  }
});

// Helper: Safely delete old image file (ignores web URLs)
const removeFile = (filename) => {
  if (!filename || filename.startsWith("http://") || filename.startsWith("https://")) return;
  const filePath = path.join(__dirname, "../uploads", filename);
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting old image:", err);
    });
  }
};

// 1. Display all categories (sorted newest first)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories: " + err.message });
  }
});

// 2. Add category (Supports both Multer file upload AND direct image web URL)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;
    const finalImage = req.file ? req.file.filename : imageUrl?.trim();

    if (!name?.trim() || !description?.trim() || !finalImage) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).json({
        message: "Category Name, Description, and Image (file or URL) are required!"
      });
    }

    // Check duplicate name
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existing) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).json({ message: "Category with this name already exists!" });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description.trim(),
      image: finalImage
    });

    res.status(201).json(category);
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    res.status(400).json({ message: err.message });
  }
});

// 3. Edit category (Supports file replace OR web URL update)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ message: "Category not found!" });
    }

    const update = {};

    if (req.body.name !== undefined) {
      if (!req.body.name.trim()) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({ message: "Category name cannot be empty!" });
      }
      update.name = req.body.name.trim();
    }

    if (req.body.description !== undefined) {
      if (!req.body.description.trim()) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({ message: "Description cannot be empty!" });
      }
      update.description = req.body.description.trim();
    }

    // If new file uploaded OR web URL provided
    if (req.file) {
      removeFile(category.image);
      update.image = req.file.filename;
    } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
      removeFile(category.image);
      update.image = req.body.imageUrl.trim();
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    res.json(updatedCategory);
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    res.status(400).json({ message: err.message });
  }
});

// 4. Delete category
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found!" });
    }

    // Prevent deletion if items exist in category
    const hasFoods = await Food.exists({ category: category._id });
    if (hasFoods) {
      return res.status(409).json({
        message: "Cannot delete category: Delete food items in this category first!"
      });
    }

    removeFile(category.image);
    await category.deleteOne();

    res.json({ message: "Category deleted successfully!" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
