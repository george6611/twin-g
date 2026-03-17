// seed/seedProducts.js
const Product = require("../models/Product");

module.exports = async function seedProducts(vendors, perVendor = 20) {
  await Product.deleteMany({});

  const products = [];

  for (const vendor of vendors) {
    const mainCategory = vendor.categories[0];
    const subCategory = vendor.subCategories[0];

    for (let i = 0; i < perVendor; i++) {
      const price = Math.floor(Math.random() * 1000) + 100;

      products.push({
        name: `Product ${i + 1} - ${vendor.shopName}`,
        slug: `product-${vendor._id}-${i}`,
        vendorId: vendor._id,
        categoryId: mainCategory,
        subCategoryId: subCategory,
        price,
        inStock: true,
        status: "active",
        sku: `SKU-${vendor._id.toString().slice(-4)}-${i + 1}`,
        tags: ["test", "seeded"],
      });
    }
  }

  await Product.insertMany(products);
  console.log(`✅ Seeded ${products.length} products for ${vendors.length} vendors`);
};
