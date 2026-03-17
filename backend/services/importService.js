const { fetchFromAPI } = require('../connectors/apiConnector');
const { fetchFromMongoDB } = require('../connectors/mongodbConnector');
const { fetchFromMySQL } = require('../connectors/mysqlConnector');
const { fetchFromPostgres } = require('../connectors/postgresConnector');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Branch = require('../models/Branch');
const Vendor = require('../models/Vendor');
const slugify = require('slugify');
const mongoose = require('mongoose');

/**
 * Product Import Service
 * Handles importing products from external sources
 */

/**
 * Normalize external product data to Twin-G format
 */
function normalizeProduct(externalProduct, branchId, vendorId) {
  // Common field mappings (try multiple possible field names)
  const getName = (obj) => 
    obj.name || obj.productName || obj.product_name || obj.title || obj.item_name || '';
  
  const getBrand = (obj) => 
    obj.brand || obj.brandName || obj.brand_name || obj.manufacturer || '';
  
  const getCategory = (obj) => 
    obj.category || obj.categoryName || obj.category_name || obj.product_category || '';
  
  const getSubCategory = (obj) => 
    obj.subCategory || obj.subcategory || obj.sub_category || obj.subCategoryName || '';
  
  const getPrice = (obj) => {
    const price = obj.price || obj.unitPrice || obj.unit_price || obj.sellingPrice || obj.selling_price || 0;
    return parseFloat(price) || 0;
  };
  
  const getDiscountPrice = (obj) => {
    const discount = obj.discountPrice || obj.discount_price || obj.salePrice || obj.sale_price || null;
    return discount ? parseFloat(discount) : null;
  };
  
  const getStock = (obj) => {
    const stock = obj.stock || obj.stockQuantity || obj.stock_quantity || obj.quantity || obj.inventory || 0;
    return parseInt(stock) || 0;
  };
  
  const getDescription = (obj) => 
    obj.description || obj.desc || obj.details || obj.product_description || '';
  
  const getTags = (obj) => {
    const tags = obj.tags || obj.keywords || obj.labels || [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
    return [];
  };
  
  const getImage = (obj) => 
    obj.image || obj.imageUrl || obj.image_url || obj.thumbnail || obj.photo || null;

  return {
    name: getName(externalProduct),
    brand: getBrand(externalProduct),
    category: getCategory(externalProduct),
    subCategory: getSubCategory(externalProduct),
    price: getPrice(externalProduct),
    discountPrice: getDiscountPrice(externalProduct),
    stockQuantity: getStock(externalProduct),
    description: getDescription(externalProduct),
    tags: getTags(externalProduct),
    image: getImage(externalProduct),
    branchId,
    vendorId,
  };
}

/**
 * Create or update category and return its ID
 */
async function ensureCategory(categoryName, vendorId, parentCategoryId = null) {
  if (!categoryName || !categoryName.trim()) {
    return null;
  }

  let category = await Category.findOne({
    name: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
    parentCategory: parentCategoryId,
  });

  if (!category) {
    category = await Category.create({
      name: categoryName.trim(),
      slug: slugify(categoryName, { lower: true, strict: true }),
      parentCategory: parentCategoryId,
      applicableVendors: [vendorId],
      totalProducts: 0,
      totalVendors: 1,
      status: 'active',
    });
  } else {
    if (!Array.isArray(category.applicableVendors)) {
      category.applicableVendors = [];
    }
    if (!category.applicableVendors.some(id => id.toString() === vendorId.toString())) {
      category.applicableVendors.push(vendorId);
      category.totalVendors += 1;
      await category.save();
    }
  }

  return category._id;
}

/**
 * Import products from external connector
 */
async function importProducts(config, vendorId) {
  const { branchId, type, ...connectorConfig } = config;

  // Validate branchId
  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
    throw new Error('Valid branch ID is required');
  }

  const branch = await Branch.findOne({ _id: branchId, vendorId });
  if (!branch) {
    throw new Error('Branch not found or does not belong to this vendor');
  }

  // Fetch products from external source based on type
  let externalProducts = [];
  
  switch (type) {
    case 'api':
      externalProducts = await fetchFromAPI(connectorConfig);
      break;
    case 'mongodb':
      externalProducts = await fetchFromMongoDB(connectorConfig);
      break;
    case 'mysql':
      externalProducts = await fetchFromMySQL(connectorConfig);
      break;
    case 'postgres':
    case 'postgresql':
      externalProducts = await fetchFromPostgres(connectorConfig);
      break;
    default:
      throw new Error(`Unsupported connector type: ${type}`);
  }

  if (!Array.isArray(externalProducts)) {
    throw new Error('Connector did not return an array of products');
  }

  // Limit to 10,000 products per import
  if (externalProducts.length > 10000) {
    console.warn(`[Import Service] Limiting import from ${externalProducts.length} to 10,000 products`);
    externalProducts = externalProducts.slice(0, 10000);
  }

  console.log(`[Import Service] Processing ${externalProducts.length} products...`);

  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Process each product
  for (let i = 0; i < externalProducts.length; i++) {
    try {
      const externalProduct = externalProducts[i];
      const normalized = normalizeProduct(externalProduct, branchId, vendorId);

      // Validate required fields
      if (!normalized.name || !normalized.name.trim()) {
        throw new Error('Product name is required');
      }

      if (!normalized.price || normalized.price <= 0) {
        throw new Error('Valid price is required');
      }

      // Handle categories
      let mainCategoryId = null;
      let subCategoryId = null;

      if (normalized.category) {
        mainCategoryId = await ensureCategory(normalized.category, vendorId);
        
        if (normalized.subCategory) {
          subCategoryId = await ensureCategory(normalized.subCategory, vendorId, mainCategoryId);
        }
      }

      // Create product
      const slug = slugify(normalized.name, { lower: true, strict: true }) + '-' + Date.now() + '-' + i;

      const product = await Product.create({
        name: normalized.name.trim(),
        slug,
        vendorId,
        branchId: new mongoose.Types.ObjectId(branchId),
        category: normalized.category || 'General',
        subCategory: normalized.subCategory || undefined,
        categoryId: mainCategoryId,
        subCategoryId: subCategoryId,
        description: normalized.description || '',
        brand: normalized.brand || '',
        price: normalized.price,
        discountPrice: normalized.discountPrice,
        inStock: normalized.stockQuantity > 0,
        stockQuantity: normalized.stockQuantity,
        tags: Array.isArray(normalized.tags) ? normalized.tags : [],
        status: 'active',
      });

      // Update vendor products
      await Vendor.findByIdAndUpdate(vendorId, {
        $addToSet: {
          products: product._id,
          categories: mainCategoryId,
        },
      });

      // Update category product count
      if (mainCategoryId) {
        await Category.findByIdAndUpdate(mainCategoryId, {
          $inc: { totalProducts: 1 },
        });
      }

      if (subCategoryId) {
        await Category.findByIdAndUpdate(subCategoryId, {
          $inc: { totalProducts: 1 },
        });
      }

      results.successful += 1;
    } catch (error) {
      results.failed += 1;
      results.errors.push({
        row: i + 1,
        error: error.message,
      });
      console.error(`[Import Service] Failed to import product ${i + 1}:`, error.message);
    }
  }

  console.log(`[Import Service] Import complete: ${results.successful} successful, ${results.failed} failed`);
  return results;
}

module.exports = { importProducts };
