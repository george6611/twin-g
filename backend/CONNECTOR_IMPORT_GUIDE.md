# Connector Import Feature

## Overview

The Connector Import feature allows vendors to import products directly from external systems including:
- REST APIs
- MongoDB databases
- MySQL databases
- PostgreSQL databases

This is the **fourth product upload method** in the Twin-G platform, complementing:
1. Manual single-item creation
2. CSV/XLSX bulk upload
3. Smart Paste import

## Installation

Install the required dependencies:

```bash
cd backend
npm install
```

The following packages are required:
- `axios` - For REST API connections (already installed)
- `mongodb` - For MongoDB connections
- `mysql2` - For MySQL connections
- `pg` - For PostgreSQL connections

## API Endpoint

### Import from Connector

**POST** `/api/import/connector`

**Authentication:** Required (JWT token)

**Request Body:**

The request format varies by connector type:

#### REST API Connector

Simple URL:
```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "api",
  "endpoint": "https://vendor.com/api/products"
}
```

With authentication:
```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "api",
  "endpoint": "https://api.example.com/products",
  "headers": {
    "Authorization": "Bearer YOUR_API_TOKEN",
    "X-Custom-Header": "value"
  }
}
```

#### MongoDB Connector

```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "mongodb",
  "connection": {
    "uri": "mongodb+srv://user:password@cluster.mongodb.net/database"
  },
  "collection": "products"
}
```

#### MySQL Connector

```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "mysql",
  "connection": {
    "host": "localhost",
    "port": 3306,
    "user": "admin",
    "password": "password",
    "database": "shop"
  },
  "table": "products"
}
```

#### PostgreSQL Connector

```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "postgres",
  "connection": {
    "host": "localhost",
    "port": 5432,
    "user": "admin",
    "password": "password",
    "database": "shop"
  },
  "table": "products"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Import completed: 324 products imported, 2 failed",
  "branchId": "64c8f9e123456789abcd1234",
  "imported": 324,
  "failed": 2,
  "results": {
    "successful": 324,
    "failed": 2,
    "errors": [
      {
        "row": 125,
        "error": "Product name is required"
      }
    ]
  }
}
```

## Frontend Usage

The Connector Import UI is accessible from the vendor dashboard:

**Dashboard → Inventory → Add Item → 🔌 Connector Tab**

### Steps:
1. Select a **Branch** from the dropdown
2. Choose **Connector Type** (API, MongoDB, MySQL, PostgreSQL)
3. Paste the **Connector Configuration** (JSON or simple URL for APIs)
4. Click **Import from Connector**

## Data Mapping

External product data is automatically mapped to Twin-G's product schema. The system tries multiple field name variations:

| Twin-G Field | External Field Names (tried in order) |
|-------------|--------------------------------------|
| name | name, productName, product_name, title, item_name |
| brand | brand, brandName, brand_name, manufacturer |
| category | category, categoryName, category_name, product_category |
| subCategory | subCategory, subcategory, sub_category, subCategoryName |
| price | price, unitPrice, unit_price, sellingPrice, selling_price |
| discountPrice | discountPrice, discount_price, salePrice, sale_price |
| stockQuantity | stock, stockQuantity, stock_quantity, quantity, inventory |
| description | description, desc, details, product_description |
| tags | tags, keywords, labels |
| image | image, imageUrl, image_url, thumbnail, photo |

**Required Fields:**
- name (must not be empty)
- price (must be greater than 0)

**Default Values:**
- brand: ""
- category: "General"
- subCategory: ""
- discountPrice: null
- stockQuantity: 0
- description: ""
- tags: []
- image: null

## Security Features

1. **Branch Validation:** Only branches belonging to the authenticated vendor can be used
2. **Connection Limits:** Maximum 10,000 products per import
3. **Timeout Protection:** 30-second timeout for API requests
4. **No Credential Storage:** Database credentials are never permanently stored
5. **Connection Cleanup:** All database connections are closed after import
6. **Rate Limiting:** Standard API rate limits apply

## Architecture

### Backend Structure

```
backend/
├── connectors/
│   ├── apiConnector.js       # REST API connector
│   ├── mongodbConnector.js   # MongoDB connector
│   ├── mysqlConnector.js     # MySQL connector
│   └── postgresConnector.js  # PostgreSQL connector
├── services/
│   └── importService.js      # Orchestrates imports and data normalization
├── controllers/
│   └── import/
│       └── connectorController.js  # HTTP request handler
└── routes/
    └── import.js             # Route definitions
```

### Frontend Structure

```
frontend/app/(dashboard)/vendor/inventory/
└── InventoryUploadModal.jsx  # Contains 4 tabs including Connector Import
```

## Error Handling

The import service handles errors gracefully:

- **Connection Errors:** Timeout or authentication failures
- **Data Validation Errors:** Missing required fields
- **Partial Imports:** Successfully imported products are saved even if some fail

Failed products are reported in the response with specific error messages.

## Example Workflows

### Importing from Shopify API

```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "api",
  "endpoint": "https://your-store.myshopify.com/admin/api/2024-01/products.json",
  "headers": {
    "X-Shopify-Access-Token": "your_access_token"
  }
}
```

### Importing from WooCommerce Database

```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "mysql",
  "connection": {
    "host": "localhost",
    "user": "woocommerce",
    "password": "password",
    "database": "wp_woocommerce"
  },
  "table": "wp_posts",
  "query": "SELECT * FROM wp_posts WHERE post_type='product' AND post_status='publish' LIMIT 10000"
}
```

### Importing from Custom MongoDB

```json
{
  "branchId": "64c8f9e123456789abcd1234",
  "type": "mongodb",
  "connection": {
    "uri": "mongodb://localhost:27017/inventory"
  },
  "collection": "products"
}
```

## Troubleshooting

### "Branch not found or does not belong to this vendor"
- Ensure the branchId is valid and belongs to your vendor account
- Check that you've created at least one branch

### "Failed to connect to [database]"
- Verify connection credentials
- Check network access and firewall rules
- Ensure database server is running

### "Unsupported connector type"
- Valid types: api, mongodb, mysql, postgres, postgresql
- Check for typos in the type field

### "Import completed: 0 products imported"
- Check external data source has products
- Verify table/collection name is correct
- Check data mapping - products need name and price fields

## Future Enhancements

Potential additions:
- Support for custom field mapping
- Scheduled periodic imports
- Import history and logs
- More connector types (Firebase, Supabase, etc.)
- CSV file output of failed imports
