"use client";

import React, { useEffect, useState } from "react";
import { Upload, File, AlertCircle } from "lucide-react";
import { VendorsAPI } from "../../../lib/api/vendors";

function extractBranchesArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.branches)) return payload.branches;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.branches)) return payload.data.branches;

    if (payload.data.data && typeof payload.data.data === "object") {
      if (Array.isArray(payload.data.data.items)) return payload.data.data.items;
      if (Array.isArray(payload.data.data.branches)) return payload.data.data.branches;
    }
  }

  return [];
}

// Helper function to parse pasted product data
function parseProducts(text) {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Detect delimiter by checking first line
  const detectDelimiter = (line) => {
    const delimiters = ['\t', '|', ','];
    let bestDelimiter = '\t';
    let maxCount = 0;

    for (const delim of delimiters) {
      const count = line.split(delim).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delim;
      }
    }
    return bestDelimiter;
  };

  const delimiter = detectDelimiter(lines[0]);

  return lines.map((line, idx) => {
    const columns = line.split(delimiter).map(col => col.trim());

    // Column mapping (name, brand, category, subcategory, price, discountPrice, stock, description, tags, image)
    const name = columns[0] || '';
    const brand = columns[1] || '';
    const category = columns[2] || '';
    const subCategory = columns[3] || '';
    const price = parseFloat(columns[4]) || 0;
    const discountPrice = columns[5] ? parseFloat(columns[5]) : null;
    const stockQuantity = parseInt(columns[6]) || 0;
    const description = columns[7] || '';
    const tags = columns[8] ? columns[8].split(',').map(t => t.trim()).filter(Boolean) : [];
    const image = columns[9] || null;

    return {
      _rowIndex: idx + 1,
      name,
      brand,
      category,
      subCategory,
      price,
      discountPrice,
      stockQuantity,
      description,
      tags,
      image,
    };
  });
}

export default function InventoryUploadModal({ onAdded, onClose, vendorId }) {
  const [activeTab, setActiveTab] = useState("single"); // "single", "bulk", "paste", or "connector"
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Single item form
  const [singleForm, setSingleForm] = useState({
    name: "",
    description: "",
    category: "",
    subCategory: "",
    price: "",
    discountPrice: "",
    stockQuantity: "",
    brand: "",
    tags: "",
    images: [],
    previewImages: [],
  });

  // Bulk form
  const [bulkFile, setBulkFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Smart Paste form
  const [pasteText, setPasteText] = useState("");
  const [parsedProducts, setParsedProducts] = useState([]);

  // Connector Import form
  const [connectorType, setConnectorType] = useState("api");
  const [connectorConfig, setConnectorConfig] = useState("");

  useEffect(() => {
    const loadBranches = async () => {
      if (!vendorId) return;
      setBranchesLoading(true);
      try {
        const response = await VendorsAPI.getBranches(vendorId, { limit: 100 });
        const branchList = extractBranchesArray(response?.data || response);

        setBranches(branchList);
        if (branchList.length === 1) {
          const onlyBranchId = branchList[0]?._id || branchList[0]?.id || "";
          setSelectedBranchId(onlyBranchId);
        }
      } catch (error) {
        console.error("[InventoryUploadModal] Failed to load branches:", error);
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    };

    loadBranches();
  }, [vendorId]);

  // ================== SINGLE ITEM HANDLERS ==================

  const handleSingleInputChange = (e) => {
    const { name, value } = e.target;
    setSingleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSingleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const previews = files.map((file) => URL.createObjectURL(file));

    setSingleForm((prev) => ({
      ...prev,
      images: files,
      previewImages: previews,
    }));
  };

  const removePreviewImage = (index) => {
    setSingleForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      previewImages: prev.previewImages.filter((_, i) => i !== index),
    }));
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate required fields
      if (!singleForm.name.trim()) {
        throw new Error("Product name is required");
      }
      if (!singleForm.price || parseFloat(singleForm.price) <= 0) {
        throw new Error("Valid price is required");
      }
      if (!singleForm.category.trim()) {
        throw new Error("Category is required");
      }
      if (!selectedBranchId) {
        throw new Error("Please select a branch");
      }

      const formData = new FormData();
      formData.append("name", singleForm.name);
      formData.append("description", singleForm.description);
      formData.append("category", singleForm.category);
      formData.append("subCategory", singleForm.subCategory);
      formData.append("price", singleForm.price);
      formData.append("discountPrice", singleForm.discountPrice);
      formData.append("stockQuantity", singleForm.stockQuantity);
      formData.append("brand", singleForm.brand);
      formData.append("tags", singleForm.tags);
      formData.append("branchId", selectedBranchId);

      // Add images
      singleForm.images.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/vendor/products", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add product");
      }

      setMessageType("success");
      setMessage("✅ Product added successfully!");

      // Reset form
      setSingleForm({
        name: "",
        description: "",
        category: "",
        subCategory: "",
        price: "",
        discountPrice: "",
        stockQuantity: "",
        brand: "",
        tags: "",
        images: [],
        previewImages: [],
      });

      setTimeout(() => {
        if (onAdded) onAdded();
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setMessageType("error");
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ================== CONNECTOR IMPORT HANDLERS ==================

  const handleConnectorSubmit = async (e) => {
    e.preventDefault();

    if (!connectorConfig || !connectorConfig.trim()) {
      setMessageType("error");
      setMessage("❌ Please provide connector configuration");
      return;
    }

    if (!selectedBranchId) {
      setMessageType("error");
      setMessage("❌ Please select a branch");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      let config;
      try {
        config = JSON.parse(connectorConfig);
      } catch (e) {
        // If not valid JSON, treat as simple URL for API connector
        if (connectorType === "api") {
          config = { endpoint: connectorConfig.trim() };
        } else {
          throw new Error("Invalid JSON configuration");
        }
      }

      const payload = {
        branchId: selectedBranchId,
        type: connectorType,
        ...config,
      };

      console.log('[CONNECTOR SUBMIT] Sending payload:', payload);

      const response = await fetch("/api/import/connector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await response.json();
      console.log('[CONNECTOR SUBMIT] Response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.message || "Connector import failed");
      }

      setMessageType("success");
      setMessage(
        `✅ ${data.imported} products imported successfully! ${
          data.failed > 0 ? `${data.failed} products failed.` : ""
        }`
      );

      setConnectorConfig("");

      setTimeout(() => {
        if (onAdded) onAdded();
      }, 500);

      setTimeout(() => {
        if (onClose) onClose();
      }, 2500);
    } catch (err) {
      setMessageType("error");
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ================== SMART PASTE HANDLERS ==================

  const handlePasteChange = (e) => {
    const text = e.target.value;
    setPasteText(text);
    
    if (text.trim()) {
      const products = parseProducts(text);
      setParsedProducts(products);
    } else {
      setParsedProducts([]);
    }
  };

  const handlePasteSubmit = async (e) => {
    e.preventDefault();

    if (parsedProducts.length === 0) {
      setMessageType("error");
      setMessage("❌ No products to import. Please paste product data.");
      return;
    }

    if (!selectedBranchId) {
      setMessageType("error");
      setMessage("❌ Please select a branch");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Create a CSV-like structure from parsed products to send to bulk API
      const csvHeaders = [
        "Product Name",
        "Brand",
        "Category",
        "Sub-Category",
        "Price (KES)",
        "Discount Price (KES)",
        "Stock Quantity",
        "Description",
        "Tags",
        "Product Images (URLs)"
      ];

      const csvRows = parsedProducts.map(p => [
        p.name,
        p.brand,
        p.category,
        p.subCategory,
        p.price,
        p.discountPrice || '',
        p.stockQuantity,
        p.description,
        Array.isArray(p.tags) ? p.tags.join(',') : p.tags,
        p.image || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => {
          const stringCell = String(cell || '');
          // Escape quotes and wrap in quotes if contains comma
          if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
            return '"' + stringCell.replace(/"/g, '""') + '"';
          }
          return stringCell;
        }).join(','))
      ].join('\n');

      // Create a Blob and FormData to mimic file upload
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'smart-paste-import.csv', { type: 'text/csv' });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("branchId", selectedBranchId);

      console.log('[PASTE SUBMIT] Sending', parsedProducts.length, 'products');

      const response = await fetch("/api/vendor/products/bulk/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();
      console.log('[PASTE SUBMIT] Response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.message || "Import failed");
      }

      setMessageType("success");
      const errorDetails = data.results.errors && data.results.errors.length > 0 
        ? `\n\nFirst error: ${data.results.errors[0].error}`
        : '';
      setMessage(
        `✅ ${data.results.successful} products imported successfully! ${
          data.results.failed > 0
            ? `${data.results.failed} rows failed.${errorDetails}`
            : ""
        }`
      );

      setPasteText("");
      setParsedProducts([]);

      setTimeout(() => {
        if (onAdded) onAdded();
      }, 500);

      setTimeout(() => {
        if (onClose) onClose();
      }, 2500);
    } catch (err) {
      setMessageType("error");
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ================== BULK IMPORT HANDLERS ==================

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetBulkFile(file);
    }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetBulkFile(file);
    }
  };

  const validateAndSetBulkFile = (file) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setMessageType("error");
      setMessage("❌ Only .csv, .xlsx, and .xls files are supported");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setMessageType("error");
      setMessage("❌ File size must be less than 10MB");
      return;
    }

    setBulkFile(file);
    setMessage(null);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      setMessageType("error");
      setMessage("❌ Please select a file");
      return;
    }
    if (!selectedBranchId) {
      setMessageType("error");
      setMessage("❌ Please select a branch");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("branchId", selectedBranchId);

      console.log('[BULK SUBMIT] Sending file:', bulkFile.name, bulkFile.size, 'bytes');

      const response = await fetch("/api/vendor/products/bulk/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();
      console.log('[BULK SUBMIT] Response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.message || "Bulk import failed");
      }

      console.log('[BULK SUBMIT] Results:', data.results);
      setMessageType("success");
      const errorDetails = data.results.errors && data.results.errors.length > 0 
        ? `\n\nFirst error: ${data.results.errors[0].error}`
        : '';
      setMessage(
        `✅ ${data.results.successful} products imported successfully! ${
          data.results.failed > 0
            ? `${data.results.failed} rows failed.${errorDetails}`
            : ""
        }`
      );

      setBulkFile(null);

      setTimeout(() => {
        if (onAdded) onAdded();
      }, 500);

      setTimeout(() => {
        if (onClose) onClose();
      }, 2500);
    } catch (err) {
      setMessageType("error");
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 border-b flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Add Products to Inventory</h2>
            <p className="text-orange-100 mt-1">
              Add single items or bulk import from files
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-orange-700 p-2 rounded-lg transition text-xl font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 sticky top-16">
          <button
            onClick={() => {
              setActiveTab("single");
              setMessage(null);
            }}
            className={`flex-1 py-4 px-4 font-semibold border-b-2 transition text-sm ${
              activeTab === "single"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            📦 Single Item
          </button>
          <button
            onClick={() => {
              setActiveTab("bulk");
              setMessage(null);
            }}
            className={`flex-1 py-4 px-4 font-semibold border-b-2 transition text-sm ${
              activeTab === "bulk"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 File Upload
          </button>
          <button
            onClick={() => {
              setActiveTab("paste");
              setMessage(null);
            }}
            className={`flex-1 py-4 px-4 font-semibold border-b-2 transition text-sm ${
              activeTab === "paste"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            ✨ Smart Paste
          </button>
          <button
            onClick={() => {
              setActiveTab("connector");
              setMessage(null);
            }}
            className={`flex-1 py-4 px-3 font-semibold border-b-2 transition text-xs ${
              activeTab === "connector"
                ? "border-orange-500 text-orange-600 bg-white"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            🔌 Connector
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`m-4 p-4 rounded-lg flex items-start gap-3 ${
              messageType === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* SINGLE ITEM TAB */}
          {activeTab === "single" && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={branchesLoading || branches.length === 0}
                  required
                >
                  <option value="">
                    {branchesLoading
                      ? "Loading branches..."
                      : branches.length === 0
                      ? "No branches available"
                      : "Select branch"}
                  </option>
                  {branches.map((branch) => {
                    const id = branch?._id || branch?.id;
                    const name = branch?.name || "Unnamed branch";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {branches.length === 0 && !branchesLoading && (
                  <p className="text-xs text-red-600 mt-2">
                    Create at least one branch before uploading inventory.
                  </p>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={singleForm.name}
                    onChange={handleSingleInputChange}
                    placeholder="e.g., Fresh Tomatoes"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={singleForm.brand}
                    onChange={handleSingleInputChange}
                    placeholder="Brand name"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={singleForm.category}
                    onChange={handleSingleInputChange}
                    placeholder="e.g., Produce, Electronics"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-Category
                  </label>
                  <input
                    type="text"
                    name="subCategory"
                    value={singleForm.subCategory}
                    onChange={handleSingleInputChange}
                    placeholder="e.g., Vegetables"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (KES) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={singleForm.price}
                    onChange={handleSingleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Price
                  </label>
                  <input
                    type="number"
                    name="discountPrice"
                    value={singleForm.discountPrice}
                    onChange={handleSingleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={singleForm.stockQuantity}
                    onChange={handleSingleInputChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Description & Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={singleForm.description}
                  onChange={handleSingleInputChange}
                  placeholder="Product description"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={singleForm.tags}
                  onChange={handleSingleInputChange}
                  placeholder="e.g., organic, fresh, local"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleSingleImageChange}
                  className="w-full px-4 py-2 border rounded-lg cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload up to 5 images (JPG, PNG, etc.)
                </p>

                {/* Image Previews */}
                {singleForm.previewImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {singleForm.previewImages.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`preview-${idx}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removePreviewImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          )}

          {/* BULK IMPORT TAB */}
          {activeTab === "bulk" && (
            <form onSubmit={handleBulkSubmit} className="space-y-6">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={branchesLoading || branches.length === 0}
                  required
                >
                  <option value="">
                    {branchesLoading
                      ? "Loading branches..."
                      : branches.length === 0
                      ? "No branches available"
                      : "Select branch"}
                  </option>
                  {branches.map((branch) => {
                    const id = branch?._id || branch?.id;
                    const name = branch?.name || "Unnamed branch";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {branches.length === 0 && !branchesLoading && (
                  <p className="text-xs text-red-600 mt-2">
                    Create at least one branch before uploading inventory.
                  </p>
                )}
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                  dragActive
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 hover:border-orange-400"
                }`}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-lg font-semibold text-gray-700">
                  Drag and drop your file here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to select a file
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Supported formats: CSV, XLSX, XLS
                </p>

                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleBulkFileChange}
                  className="hidden"
                  id="bulk-file-input"
                />
                <label
                  htmlFor="bulk-file-input"
                  className="inline-block mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer transition"
                >
                  Browse Files
                </label>
              </div>

              {/* Selected File Info */}
              {bulkFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                  <File className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">{bulkFile.name}</p>
                    <p className="text-sm text-blue-700">
                      {(bulkFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkFile(null)}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* CSV Format Guide */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  📋 CSV/XLSX Format Guide
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Your file should have these columns:
                </p>
                <div className="bg-white p-3 rounded border border-gray-200 text-xs font-mono text-gray-600 overflow-x-auto">
                  <p>name, category, price, stockQuantity, brand, description, subCategory, discountPrice, tags, variants</p>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  ✅ Required: name, category, price<br/>
                  ℹ️ Tags: comma-separated (e.g., "organic,fresh")<br/>
                  {"ℹ️ Variants: JSON format (e.g., '[{\"name\":\"Size\",\"value\":\"Large\"}]')"}
                </p>
                <div className="mt-4">
                  <a
                    href="/sample-inventory.csv"
                    download="sample-inventory.csv"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                  >
                    📥 Download Sample CSV
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={!bulkFile || loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Importing..." : "Import Products"}
                </button>
              </div>
            </form>
          )}

          {/* SMART PASTE TAB */}
          {activeTab === "paste" && (
            <form onSubmit={handlePasteSubmit} className="space-y-6">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={branchesLoading || branches.length === 0}
                  required
                >
                  <option value="">
                    {branchesLoading
                      ? "Loading branches..."
                      : branches.length === 0
                      ? "No branches available"
                      : "Select branch"}
                  </option>
                  {branches.map((branch) => {
                    const id = branch?._id || branch?.id;
                    const name = branch?.name || "Unnamed branch";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {branches.length === 0 && !branchesLoading && (
                  <p className="text-xs text-red-600 mt-2">
                    Create at least one branch before uploading inventory.
                  </p>
                )}
              </div>

              {/* Paste Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 Paste Product Data
                </label>
                <textarea
                  value={pasteText}
                  onChange={handlePasteChange}
                  placeholder="Paste rows from Excel, Google Sheets, or any tabular data...\n\nExample:\nFresh Milk 1L\tBrookside\tBeverages\tDairy\t65\t60\t200\tFresh milk\tmilk,dairy\thttps://...\nBread White\tSupaloaf\tBakery\tBread\t55\t50\t150\tFresh bread\tbread\t"
                  rows={8}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Supports TAB, comma, or pipe-separated values. Columns: Name | Brand | Category | SubCategory | Price | DiscountPrice | Stock | Description | Tags | ImageURL
                </p>
              </div>

              {/* Preview Table */}
              {parsedProducts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📊 Preview ({parsedProducts.length} products)
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Brand</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Price</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {parsedProducts.map((product, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {product.name || <span className="text-red-500">Missing</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{product.brand || '-'}</td>
                              <td className="px-3 py-2 text-gray-600">{product.category || '-'}</td>
                              <td className="px-3 py-2 text-gray-900">
                                {product.price > 0 ? `KES ${product.price}` : <span className="text-red-500">Missing</span>}
                              </td>
                              <td className="px-3 py-2 text-gray-600">{product.stockQuantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Guide */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  How to use Smart Paste
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Copy product rows from Excel, Google Sheets, or database exports</li>
                  <li>• Paste directly into the textarea above</li>
                  <li>• Preview will show parsed products automatically</li>
                  <li>• Only <strong>Name</strong> and <strong>Price</strong> are required</li>
                  <li>• Supports TAB, comma, or pipe (|) delimiters</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={parsedProducts.length === 0 || loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Importing..." : `Import ${parsedProducts.length} Products`}
                </button>
              </div>
            </form>
          )}

          {/* CONNECTOR IMPORT TAB */}
          {activeTab === "connector" && (
            <form onSubmit={handleConnectorSubmit} className="space-y-6">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  disabled={branchesLoading || branches.length === 0}
                  required
                >
                  <option value="">
                    {branchesLoading
                      ? "Loading branches..."
                      : branches.length === 0
                      ? "No branches available"
                      : "Select branch"}
                  </option>
                  {branches.map((branch) => {
                    const id = branch?._id || branch?.id;
                    const name = branch?.name || "Unnamed branch";
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {branches.length === 0 && !branchesLoading && (
                  <p className="text-xs text-red-600 mt-2">
                    Create at least one branch before uploading inventory.
                  </p>
                )}
              </div>

              {/* Connector Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔌 Connector Type
                </label>
                <select
                  value={connectorType}
                  onChange={(e) => setConnectorType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="api">REST API</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgres">PostgreSQL</option>
                </select>
              </div>

              {/* Connector Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⚙️ Connector Configuration
                </label>
                <textarea
                  value={connectorConfig}
                  onChange={(e) => setConnectorConfig(e.target.value)}
                  placeholder={getConnectorPlaceholder(connectorType)}
                  rows={10}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 {getConnectorHint(connectorType)}
                </p>
              </div>

              {/* Info Guide */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  How Connector Import Works
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Connect to external product databases or APIs</li>
                  <li>• Automatically fetch and import product data</li>
                  <li>• Supports multiple data sources (API, MongoDB, MySQL, PostgreSQL)</li>
                  <li>• Products are normalized and assigned to selected branch</li>
                  <li>• Secure: credentials are not stored permanently</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={!connectorConfig || loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Importing..." : "Import from Connector"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions for connector placeholders and hints
function getConnectorPlaceholder(type) {
  switch (type) {
    case "api":
      return 'Simple URL:\nhttps://vendor.com/api/products\n\nOr JSON config:\n{\n  "endpoint": "https://api.example.com/products",\n  "headers": {\n    "Authorization": "Bearer YOUR_TOKEN"\n  }\n}';
    case "mongodb":
      return '{\n  "connection": {\n    "uri": "mongodb+srv://user:password@cluster.mongodb.net/database"\n  },\n  "collection": "products"\n}';
    case "mysql":
      return '{\n  "connection": {\n    "host": "localhost",\n    "user": "admin",\n    "password": "password",\n    "database": "shop"\n  },\n  "table": "products"\n}';
    case "postgres":
      return '{\n  "connection": {\n    "host": "localhost",\n    "port": 5432,\n    "user": "admin",\n    "password": "password",\n    "database": "shop"\n  },\n  "table": "products"\n}';
    default:
      return "Enter connector configuration...";
  }
}

function getConnectorHint(type) {
  switch (type) {
    case "api":
      return "Paste API endpoint URL or full JSON configuration with headers";
    case "mongodb":
      return "Provide MongoDB connection URI and collection name in JSON format";
    case "mysql":
      return "Provide MySQL connection details and table name in JSON format";
    case "postgres":
      return "Provide PostgreSQL connection details and table name in JSON format";
    default:
      return "";
  }
}
