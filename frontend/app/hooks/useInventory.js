import { useState, useEffect, useCallback } from 'react';
import useAuth from './useAuth';
import { InventoryAPI } from '../lib/api/inventory';

export default function useInventory(branchId = null) {
  const { user, isVendorStaff } = useAuth();
  const [vendorId, setVendorId] = useState(null);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total:0, lowStock:0, categories:0, branches:0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      const vid = user.vendorId || (user.vendorIds && user.vendorIds[0]);
      setVendorId(vid);
    }
  }, [user]);

  const fetch = useCallback(async (options = {}) => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (branchId) params.branchId = branchId;
      if (options.search) params.search = options.search;
      if (options.sort) params.sort = options.sort;
      const [invResp, catResp] = await Promise.all([
        InventoryAPI.getInventory(vendorId, params),
        InventoryAPI.getCategories(vendorId),
      ]);
      
      if (invResp.success) {
        // invResp.data contains the entire JSON response from backend
        // Backend returns: { success: true, products: [...], data: { items: [...] } }
        const backendData = invResp.data || {};
        let products = backendData.products || backendData.data?.items || backendData.data || [];
        
        // Ensure products is always an array
        if (!Array.isArray(products)) {
          console.warn('Products response is not an array:', products, 'Full response:', backendData);
          products = [];
        }
        
        // Map product fields to inventory item format
        const mappedItems = products.map(product => ({
          id: product._id,
          _id: product._id,
          name: product.name || '',
          sku: product.sku || '',
          quantity: product.stockQuantity || 0,
          category: typeof product.categoryId === 'object' ? product.categoryId?.name : product.categoryId || product.category || '',
          status: product.status || 'active',
          price: product.price || 0,
          brand: product.brand || '',
          description: product.description || '',
          branchId:
            typeof product.branchId === 'object'
              ? product.branchId?.name || product.branchId?.value || product.branchId?._id || ''
              : product.branchId || '',
        }));
        
        setItems(mappedItems);
        
        // Compute stats
        const total = mappedItems.length;
        const low = mappedItems.filter(i => i.quantity <= (i.reorderLevel || 10)).length;
        setStats({ 
          total, 
          lowStock: low, 
          categories: catResp.success ? (catResp.data.length || 0) : 0, 
          branches: 0 
        });
      }
      
      if (catResp.success) {
        setCategories(catResp.data || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId, branchId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, categories, stats, loading, error, refresh: fetch };
}
