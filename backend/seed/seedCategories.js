// seed/seedCategories.js
const Category = require("../models/Category");

module.exports = async function seedCategories() {
  await Category.deleteMany({});

  const structure = [
    { name: "Food", subs: ["Restaurants", "Fast Food", "Groceries"] },
    { name: "Services", subs: ["Plumbing", "Electrical", "Cleaning"] },
    { name: "Retail", subs: ["Electronics", "Clothing", "Hardware"] },
  ];

  const result = [];

  for (const group of structure) {
    const main = await Category.create({
      name: group.name,
      status: "active",
    });

    for (const subName of group.subs) {
      const sub = await Category.create({
        name: subName,
        parentCategory: main._id,
        status: "active",
      });

      result.push({ main, sub });
    }
  }

  return result; // [{ main, sub }]
};
