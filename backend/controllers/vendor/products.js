const Product = require("../../models/Product");
const Category = require("../../models/Category");
const slugify = require("slugify");
const Vendor = require("../../models/Vendor");
const Branch = require("../../models/Branch");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
/**
 * 🟢 CREATE PRODUCT
 * Auto-creates or reuses category/subcategory.
 * Ensures shared category tree across vendors.
 */

exports.createProduct = async (req, res) => {
  try {
    // -----------------------------
    // 1️⃣ Extract form fields
    // -----------------------------
    const {
      name,
      description,
      category,       // main category name
      subCategory,    // optional subcategory name
      brand,
      price,
      discountPrice,
      inStock,
      stockQuantity,
      availableFrom,
      availableUntil,
      variants,
      tags,
      weight,
      dimensions,
      isFeatured,
      branchId,
      thumbnailIndex // index of thumbnail image from frontend
    } = req.body;

    // Use normalized vendor identity from auth middleware first
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.userId || req.body.vendorId;
    const creatorStaffIdRaw = req.user?.staffId || req.user?._id;
    const isStaffCreator = req.user?.role === "vendor_staff" || !!req.user?.staffId;
    const creatorStaffId =
      isStaffCreator && creatorStaffIdRaw && mongoose.Types.ObjectId.isValid(creatorStaffIdRaw)
        ? creatorStaffIdRaw
        : null;

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        message: "Vendor authentication required",
      });
    }

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Product name, price, and category are required",
      });
    }

    let normalizedBranchId = null;
    if (branchId) {
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ success: false, message: "Invalid branchId" });
      }

      const branch = await Branch.findOne({ _id: branchId, vendorId });
      if (!branch) {
        return res.status(400).json({ success: false, message: "Selected branch not found for this vendor" });
      }

      normalizedBranchId = branch._id;
    }

    const images = req.files?.map(file => file.filename) || [];
    const thumbnail =
      images.length > 0 && thumbnailIndex !== undefined
        ? images[Number(thumbnailIndex)]
        : images[0] || null;


    let mainCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${category.trim()}$`, "i") },
      parentCategory: null,
    });

    if (!mainCategory) {
      mainCategory = await Category.create({
        name: category.trim(),
        slug: slugify(category, { lower: true, strict: true }),
        parentCategory: null,
        applicableVendors: [vendorId],
        totalProducts: 1,
        totalVendors: 1,
        status: "active",
      });
    } else {
      if (!Array.isArray(mainCategory.applicableVendors)) {
        mainCategory.applicableVendors = [];
      }
      mainCategory.totalProducts += 1;
      if (!mainCategory.applicableVendors.some(id => id.toString() === vendorId.toString())) {
        mainCategory.applicableVendors.push(vendorId);
        mainCategory.totalVendors += 1;
      }
      await mainCategory.save();
    }

    // -----------------------------
    // 4️⃣ Handle subcategory
    // -----------------------------
    let subCategoryDoc = null;
    if (subCategory && subCategory.trim().length > 0) {
      subCategoryDoc = await Category.findOne({
        name: { $regex: new RegExp(`^${subCategory.trim()}$`, "i") },
        parentCategory: mainCategory._id,
      });

      if (!subCategoryDoc) {
        subCategoryDoc = await Category.create({
          name: subCategory.trim(),
          slug: slugify(subCategory, { lower: true, strict: true }),
          parentCategory: mainCategory._id,
          applicableVendors: [vendorId],
          totalProducts: 1,
          totalVendors: 1,
          status: "active",
        });
      } else {
        if (!Array.isArray(subCategoryDoc.applicableVendors)) {
          subCategoryDoc.applicableVendors = [];
        }
        subCategoryDoc.totalProducts += 1;
        if (!subCategoryDoc.applicableVendors.some(id => id.toString() === vendorId.toString())) {
          subCategoryDoc.applicableVendors.push(vendorId);
          subCategoryDoc.totalVendors += 1;
        }
        await subCategoryDoc.save();
      }
    }

    // -----------------------------
    // 5️⃣ Parse dimensions if sent as JSON string
    // -----------------------------
    let parsedDimensions = undefined;
    if (dimensions) {
      try {
        parsedDimensions = JSON.parse(dimensions);
      } catch (err) {
        console.warn("⚠️ Failed to parse dimensions JSON:", dimensions);
      }
    }

    // -----------------------------
    // 6️⃣ Create product
    // -----------------------------
    const slug = slugify(name, { lower: true, strict: true }) + "-" + Date.now();

    const product = await Product.create({
      name,
      slug,
      vendorId,
      staffId: creatorStaffId,
      branchId: normalizedBranchId,
      category: category.trim(),
      subCategory: subCategory && subCategory.trim().length > 0 ? subCategory.trim() : undefined,
      categoryId: mainCategory._id,
      subCategoryId: subCategoryDoc ? subCategoryDoc._id : null,
      description,
      brand,
      images,
      thumbnail,
      price,
      discountPrice,
      inStock,
      stockQuantity,
      availableFrom,
      availableUntil,
      variants,
      tags,
      weight,
      dimensions: parsedDimensions,
      isFeatured,
    });

    // -----------------------------
    // 7️⃣ Update vendor & categories
    // -----------------------------
  // -----------------------------
// 7️⃣ Update vendor & categories
// -----------------------------
await Vendor.findByIdAndUpdate(vendorId, {
  $addToSet: {
    products: product._id,
    categories: mainCategory._id,           // add main category to vendor
    ...(subCategoryDoc ? { subCategories: subCategoryDoc._id } : {}), // add subcategory if exists
  },
});

await Category.findByIdAndUpdate(mainCategory._id, {
  $addToSet: { applicableVendors: vendorId },
});

if (subCategoryDoc) {
  await Category.findByIdAndUpdate(subCategoryDoc._id, {
    $addToSet: { applicableVendors: vendorId },
  });
}


    // -----------------------------
    // 8️⃣ Send response
    // -----------------------------
    res.status(201).json({
      success: true,
      message: "✅ Product created successfully",
      product,
    });
  } catch (err) {
    console.error("❌ Create product error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};



/**
 * 🟣 GET ALL PRODUCTS FOR VENDOR
 */
exports.getAllProducts = async (req, res) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.userId || req.vendor?._id || req.params.vendorId || req.user?._id;
    const query = { vendorId };
    if (req.query?.branchId && mongoose.Types.ObjectId.isValid(req.query.branchId)) {
      query.branchId = req.query.branchId;
    }

    const search = (req.query?.search || "").trim();
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { category: searchRegex },
        { subCategory: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
      ];
    }

    const sortKey = (req.query?.sort || "newest").toLowerCase();
    let sort = { createdAt: -1 };
    let useCaseInsensitiveCollation = false;

    switch (sortKey) {
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "alpha_asc":
        sort = { name: 1 };
        useCaseInsensitiveCollation = true;
        break;
      case "alpha_desc":
        sort = { name: -1 };
        useCaseInsensitiveCollation = true;
        break;
      case "most_sold":
        sort = { totalOrders: -1, createdAt: -1 };
        break;
      case "least_sold":
        sort = { totalOrders: 1, createdAt: -1 };
        break;
      case "newest":
      default:
        sort = { createdAt: -1 };
        break;
    }

    let findQuery = Product.find(query)
      .populate("branchId", "name")
      .populate("categoryId", "name slug")
      .populate("subCategoryId", "name slug")
      .sort(sort);

    if (useCaseInsensitiveCollation) {
      findQuery = findQuery.collation({ locale: "en", strength: 2 });
    }

    const products = await findQuery;

    console.log(
      `[GET /api/vendor/products] VendorId: ${vendorId}, Search: "${search}", Sort: "${sortKey}", Found ${products.length} products`
    );
    res.json({ success: true, products, data: { items: products } });
  } catch (err) {
    console.error("❌ Get all products error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 🔵 GET PRODUCT BY ID
 */
exports.getProductById = async (req, res) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.userId || req.vendor?._id || req.user?._id;

    const product = await Product.findOne({ _id: req.params.id, vendorId })
      .populate("categoryId", "name slug description")
      .populate("subCategoryId", "name slug description")
      .populate("vendorId", "shopName name contact")
      .populate("branchId", "name")
      .populate({
        path: "staffId",
        populate: { path: "userId", select: "name email" },
      });

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.json({ success: true, product });
  } catch (err) {
    console.error("❌ Get product by ID error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 🟡 UPDATE PRODUCT
 * Handles category/subcategory renames safely.
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const { category, subCategory } = req.body;

    // Update category/subcategory if provided
    if (category) {
      let mainCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${category}$`, "i") },
        parentCategory: null,
      });
      if (!mainCategory) {
        mainCategory = await Category.create({
          name: category.trim(),
          slug: slugify(category, { lower: true }),
          parentCategory: null,
          applicableVendors: [product.vendorId],
          totalProducts: 1,
          totalVendors: 1,
          status: "active",
        });
      }
      product.category = category.trim();
      product.categoryId = mainCategory._id;

      if (subCategory) {
        let subCategoryDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${subCategory}$`, "i") },
          parentCategory: mainCategory._id,
        });
        if (!subCategoryDoc) {
          subCategoryDoc = await Category.create({
            name: subCategory.trim(),
            slug: slugify(subCategory, { lower: true }),
            parentCategory: mainCategory._id,
            applicableVendors: [product.vendorId],
            totalProducts: 1,
            totalVendors: 1,
            status: "active",
          });
        }
        product.subCategory = subCategory.trim();
        product.subCategoryId = subCategoryDoc._id;
      } else {
        product.subCategory = undefined;
        product.subCategoryId = null;
      }
    }

    Object.assign(product, req.body);

    if (!product.category && product.categoryId) {
      const fallbackCategory = await Category.findById(product.categoryId).select("name");
      if (fallbackCategory?.name) {
        product.category = fallbackCategory.name;
      }
    }

    await product.save();

    res.json({
      success: true,
      message: "✅ Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("❌ Update product error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 🔴 DELETE PRODUCT
 * Decrements product counts for categories.
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Decrement category counts safely
    const category = await Category.findById(product.categoryId);
    if (category) {
      category.totalProducts = Math.max(0, category.totalProducts - 1);
      await category.save();
    }

    if (product.subCategoryId) {
      const sub = await Category.findById(product.subCategoryId);
      if (sub) {
        sub.totalProducts = Math.max(0, sub.totalProducts - 1);
        await sub.save();
      }
    }

    res.json({ success: true, message: "✅ Product deleted successfully" });
  } catch (err) {
    console.error("❌ Delete product error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * 🖼 UPLOAD PRODUCT IMAGES
 */
exports.uploadProductImage = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imagePaths = req.files.map((file) => file.path || file.location);

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // Ensure vendor owns product
    if (req.vendor && product.vendorId.toString() !== req.vendor._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this product" });
    }

    // Add new images
    product.images.push(...imagePaths);
    if (!product.thumbnail && product.images.length > 0) {
      product.thumbnail = product.images[0];
    }

    await product.save();

    res.status(200).json({
      message: "Images uploaded successfully",
      images: product.images,
    });
  } catch (err) {
    console.error("❌ Error uploading product image:", err);
    res.status(500).json({ message: "Error uploading image" });
  }
};

/**
 * 📊 BULK IMPORT PRODUCTS FROM CSV/XLSX
 * Parse uploaded file (CSV or XLSX) and bulk insert products into MongoDB
 */
exports.bulkImportProducts = async (req, res) => {
  try {
    console.log('[BULK IMPORT] Starting...', {
      user: req.user,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
    });

    // Use normalized vendor identity from auth middleware first
    const vendorId = req.user?.vendorId || req.user?._id || req.user?.userId || req.body.vendorId;
    const creatorStaffIdRaw = req.user?.staffId || req.user?._id;
    const isStaffCreator = req.user?.role === "vendor_staff" || !!req.user?.staffId;
    const creatorStaffId =
      isStaffCreator && creatorStaffIdRaw && mongoose.Types.ObjectId.isValid(creatorStaffIdRaw)
        ? creatorStaffIdRaw
        : null;
    const selectedBranchId = req.body?.branchId;
    console.log('[BULK IMPORT] vendorId:', vendorId);

    if (!vendorId) {
      console.error('[BULK IMPORT] No vendorId');
      return res.status(403).json({
        success: false,
        message: "Vendor authentication required",
      });
    }

    if (!req.file) {
      console.error('[BULK IMPORT] No file uploaded');
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    let normalizedBranchId = null;
    if (selectedBranchId) {
      if (!mongoose.Types.ObjectId.isValid(selectedBranchId)) {
        return res.status(400).json({ success: false, message: "Invalid branchId" });
      }

      const branch = await Branch.findOne({ _id: selectedBranchId, vendorId });
      if (!branch) {
        return res.status(400).json({ success: false, message: "Selected branch not found for this vendor" });
      }

      normalizedBranchId = branch._id;
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    console.log('[BULK IMPORT] Processing file:', { filePath, fileExt });

    let rows = [];

    try {
      if (fileExt === ".xlsx" || fileExt === ".xls") {
        // Parse XLSX file
        const workbook = XLSX.readFile(filePath);
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
      } else if (fileExt === ".csv") {
        // Parse CSV file
        rows = await new Promise((resolve, reject) => {
          const data = [];
          fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => data.push(row))
            .on("end", () => resolve(data))
            .on("error", (err) => reject(err));
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "File must be CSV or XLSX format",
        });
      }

      if (!rows || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "File is empty or contains no valid data",
        });
      }

      console.log(`[BULK IMPORT] Parsed ${rows.length} rows, first row:`, rows[0]);

      // Normalize column headers - map actual headers to expected field names
      const normalizeRow = (row) => {
        return {
          name: row['Product Name'] || row['name'] || row['Name'],
          brand: row['Brand'] || row['brand'],
          category: row['Category'] || row['category'],
          subCategory: row['Sub-Category'] || row['subCategory'] || row['SubCategory'],
          price: row['Price (KES)'] || row['price'] || row['Price'],
          discountPrice: row['Discount Price (KES)'] || row['discountPrice'] || row['Discount Price'],
          stockQuantity: row['Stock Quantity'] || row['stockQuantity'] || row['Stock'],
          description: row['Description'] || row['description'],
          tags: row['Tags'] || row['tags'],
          variants: row['Variants'] || row['variants'],
          inStock: row['In Stock'] || row['inStock'],
          weight: row['Weight'] || row['weight'],
          isFeatured: row['Featured'] || row['isFeatured'],
        };
      };

      // Normalize all rows
      rows = rows.map(normalizeRow);
      console.log(`[BULK IMPORT] Normalized first row:`, rows[0]);
      const results = {
        successful: 0,
        failed: 0,
        errors: [],
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2; // Row number for user feedback (header is row 1)

        try {
          // Validate required fields
          const { name, price, category } = row;
          console.log(`[BULK IMPORT] Row ${rowIndex}: name=${name}, price=${price}, category=${category}`);

          if (!name || !name.trim()) {
            throw new Error("Product name is required");
          }

          if (!price || isNaN(parseFloat(price))) {
            throw new Error("Valid price is required");
          }

          if (!category || !category.trim()) {
            throw new Error("Category is required");
          }

          // Get or create category
          let mainCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${category.trim()}$`, "i") },
            parentCategory: null,
          });

          if (!mainCategory) {
            mainCategory = await Category.create({
              name: category.trim(),
              slug: slugify(category, { lower: true, strict: true }),
              parentCategory: null,
              applicableVendors: [vendorId],
              totalProducts: 1,
              totalVendors: 1,
              status: "active",
            });
          } else {
            if (!Array.isArray(mainCategory.applicableVendors)) {
              mainCategory.applicableVendors = [];
            }
            mainCategory.totalProducts += 1;
            if (
              !mainCategory.applicableVendors.some(
                (id) => id.toString() === vendorId.toString()
              )
            ) {
              mainCategory.applicableVendors.push(vendorId);
              mainCategory.totalVendors += 1;
            }
            await mainCategory.save();
          }

          // Get or create subcategory if provided
          let subCategoryDoc = null;
          if (row.subCategory && row.subCategory.trim()) {
            subCategoryDoc = await Category.findOne({
              name: {
                $regex: new RegExp(`^${row.subCategory.trim()}$`, "i"),
              },
              parentCategory: mainCategory._id,
            });

            if (!subCategoryDoc) {
              subCategoryDoc = await Category.create({
                name: row.subCategory.trim(),
                slug: slugify(row.subCategory, {
                  lower: true,
                  strict: true,
                }),
                parentCategory: mainCategory._id,
                applicableVendors: [vendorId],
                totalProducts: 1,
                totalVendors: 1,
                status: "active",
              });
            } else {
              if (!Array.isArray(subCategoryDoc.applicableVendors)) {
                subCategoryDoc.applicableVendors = [];
              }
              subCategoryDoc.totalProducts += 1;
              if (
                !subCategoryDoc.applicableVendors.some(
                  (id) => id.toString() === vendorId.toString()
                )
              ) {
                subCategoryDoc.applicableVendors.push(vendorId);
                subCategoryDoc.totalVendors += 1;
              }
              await subCategoryDoc.save();
            }
          }

          // Parse variants if provided as JSON string
          let variants = [];
          if (row.variants) {
            try {
              variants = JSON.parse(row.variants);
            } catch (err) {
              console.warn(`⚠️ Row ${rowIndex}: Invalid variants JSON, skipping`);
            }
          }

          // Parse tags
          let tags = [];
          if (row.tags) {
            tags = row.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);
          }

          // Create product
          const slug =
            slugify(name, { lower: true, strict: true }) + "-" + Date.now();

          const product = await Product.create({
            name: name.trim(),
            slug,
            vendorId,
            staffId: creatorStaffId,
            branchId: normalizedBranchId,
            category: category.trim(),
            subCategory: row.subCategory && row.subCategory.trim() ? row.subCategory.trim() : undefined,
            categoryId: mainCategory._id,
            subCategoryId: subCategoryDoc ? subCategoryDoc._id : null,
            description: row.description || "",
            brand: row.brand || "",
            price: parseFloat(price),
            discountPrice: row.discountPrice
              ? parseFloat(row.discountPrice)
              : undefined,
            inStock: row.inStock
              ? row.inStock.toLowerCase() === "true"
              : true,
            stockQuantity: row.stockQuantity
              ? parseInt(row.stockQuantity)
              : 0,
            variants,
            tags,
            weight: row.weight ? parseFloat(row.weight) : undefined,
            isFeatured: row.isFeatured
              ? row.isFeatured.toLowerCase() === "true"
              : false,
            status: "active",
          });

          results.successful += 1;
          console.log(`✅ [BULK IMPORT] Row ${rowIndex} SUCCESS - created product: ${name}`);
        } catch (err) {
          results.failed += 1;
          results.errors.push({
            row: rowIndex,
            error: err.message,
            data: row,
          });
          console.error(`❌ Row ${rowIndex} failed:`, err.message);
        }
      }

      console.log(`[BULK IMPORT] COMPLETE - Results: ${results.successful} successful, ${results.failed} failed`, results.errors.map(e => e.error).slice(0, 3));

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('[BULK IMPORT] Could not delete temp file:', unlinkErr.message);
      }

      res.status(200).json({
        success: true,
        message: `Bulk import completed: ${results.successful} products created, ${results.failed} failed`,
        results,
      });
    } catch (parseErr) {
      fs.unlinkSync(filePath);
      console.error("❌ File parsing error:", parseErr);
      res.status(400).json({
        success: false,
        message: "Error parsing file: " + parseErr.message,
      });
    }
  } catch (err) {
    console.error("❌ Bulk import error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during bulk import",
      error: err.message,
    });
  }
};
