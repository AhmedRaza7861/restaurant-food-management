const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Food = require("../models/Food");
const Category = require("../models/Category");

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

// 1. Display all food items (supports filter by category & search query)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }

    const foods = await Food.find(filter)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch food items: " + err.message });
  }
});

// 2. Add food item (Supports both Multer file upload AND direct image web URL)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, category, imageUrl } = req.body;
    const amount = Number(price);
    const finalImage = req.file ? req.file.filename : imageUrl?.trim();

    if (
      !name?.trim() ||
      price === undefined ||
      price === "" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !description?.trim() ||
      !category ||
      !finalImage
    ) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).json({
        message: "All fields and image (file upload or web URL) are required; price must be greater than 0!"
      });
    }

    if (!/^[a-f\d]{24}$/i.test(category)) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).json({ message: "Invalid Category ID format!" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).json({ message: "Selected category does not exist!" });
    }

    const food = await Food.create({
      name: name.trim(),
      price: amount,
      description: description.trim(),
      category,
      image: finalImage
    });

    const populatedFood = await Food.findById(food._id).populate("category", "name");
    res.status(201).json(populatedFood);
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    res.status(400).json({ message: err.message });
  }
});

// 3. Edit food item (Supports file replace OR web URL update)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      if (req.file) removeFile(req.file.filename);
      return res.status(404).json({ message: "Food item not found!" });
    }

    const update = {};
    const { name, price, description, category, imageUrl } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({ message: "Food name cannot be empty!" });
      }
      update.name = name.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({ message: "Description cannot be empty!" });
      }
      update.description = description.trim();
    }

    if (price !== undefined) {
      const amount = Number(price);
      if (price === "" || !Number.isFinite(amount) || amount <= 0) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({
          message: "Price must be a valid number greater than 0!"
        });
      }
      update.price = amount;
    }

    if (category !== undefined) {
      if (!/^[a-f\d]{24}$/i.test(category)) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({ message: "Invalid category ID!" });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        if (req.file) removeFile(req.file.filename);
        return res.status(400).json({ message: "Selected category does not exist!" });
      }
      update.category = category;
    }

    // If new image file uploaded OR image URL provided
    if (req.file) {
      removeFile(food.image);
      update.image = req.file.filename;
    } else if (imageUrl && imageUrl.trim()) {
      removeFile(food.image);
      update.image = imageUrl.trim();
    }

    const updatedFood = await Food.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate("category", "name");

    res.json(updatedFood);
  } catch (err) {
    if (req.file) removeFile(req.file.filename);
    res.status(400).json({ message: err.message });
  }
});

// 4. Delete food item
router.delete("/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ message: "Food item not found!" });
    }

    removeFile(food.image);
    await food.deleteOne();

    res.json({ message: "Food item deleted successfully!" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
