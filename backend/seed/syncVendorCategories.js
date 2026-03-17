// seed/syncVendorCategories.js
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");

module.exports = async function syncVendorCategories() {
  const vendors = await Vendor.find();

  for (const vendor of vendors) {
    const products = await Product.find({ vendorId: vendor._id });

    const categories = [
      ...new Set(products.map(p => p.categoryId.toString())),
    ];

    const subCategories = [
      ...new Set(products.map(p => p.subCategoryId?.toString())),
    ];

    vendor.categories = categories;
    vendor.subCategories = subCategories;
    vendor.products = products.map(p => p._id);

    await vendor.save();
  }
};
