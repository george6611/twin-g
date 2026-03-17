// Core fetch wrapper for frontend API calls
// handles credentials, timeouts, structured responses, and common error handling

const DEFAULT_TIMEOUT = 15000; // 15 seconds
const BACKEND_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL) ||
  'http://localhost:5000';

function resolveUrl(url) {
  if (typeof url !== 'string') return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return url;
  return url;
}

function buildUrl(url, params) {
  const baseUrl = resolveUrl(url);
  if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
    return baseUrl;
  }
  const u = new URL(baseUrl, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    u.searchParams.append(k, String(v));
  });
  return u.toString();
}

async function request(method, url, options = {}) {
  const { params, body, timeout = DEFAULT_TIMEOUT, headers = {}, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  // if caller provided a signal, forward its abort to our controller
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const finalUrl = buildUrl(url, params);
  
  console.log(`📡 [API Client] ${method} ${finalUrl}`);
  if (body) console.log('📡 [API Client] Body:', JSON.stringify(body).substring(0, 200));
  
  const reqHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });
  const init = {
    method,
    credentials: 'include',
    headers: reqHeaders,
    signal: controller.signal,
  };
  if (body !== undefined && body !== null) {
    try {
      init.body = JSON.stringify(body);
    } catch (e) {
      // fallback: send as-is (maybe a FormData)
      init.body = body;
    }
  }

  try {
    const res = await fetch(finalUrl, init);
    clearTimeout(timer);
    
    console.log(`📡 [API Client] Response: ${res.status} ${res.statusText}`);
    
    const result = {
      success: false,
      data: null,
      error: null,
      status: res.status,
    };
    let text = null;
    try {
      text = await res.text();
      result.data = text ? JSON.parse(text) : null;
    } catch (e) {
      // not JSON
      result.data = text;
    }
    if (res.ok) {
      result.success = true;
      return result;
    }
    // handle status codes
    if (res.status === 401) {
      result.error = 'unauthorized';
      return result;
    }
    if (res.status === 403) {
      result.error = 'forbidden';
      return result;
    }
    result.error = result.data && result.data.error ? result.data.error : res.statusText || 'request failed';
    return result;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { success: false, data: null, error: 'timeout', status: 0 };
    }
    return { success: false, data: null, error: 'network_error', status: 0 };
  }
}

export const client = {
  get: (url, opts) => request('GET', url, opts),
  post: (url, opts) => request('POST', url, opts),
  patch: (url, opts) => request('PATCH', url, opts),
  del: (url, opts) => request('DELETE', url, opts),
  delete: (url, opts) => request('DELETE', url, opts),
  postFormData: async (url, formData, opts = {}) => {
    const finalUrl = resolveUrl(url);
    console.log(`📡 [API Client] POST (FormData) ${finalUrl}`);
    
    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData, // Don't set Content-Type header, browser will set it with boundary
        ...opts,
      });
      
      console.log(`📡 [API Client] Response: ${res.status} ${res.statusText}`);
      
      const result = {
        success: false,
        data: null,
        error: null,
        status: res.status,
      };
      
      try {
        const text = await res.text();
        result.data = text ? JSON.parse(text) : null;
      } catch (e) {
        // not JSON
        result.data = null;
      }
      
      if (res.ok) {
        result.success = true;
        return result;
      }
      
      result.error = result.data?.error || result.data?.message || res.statusText || 'upload failed';
      return result;
    } catch (err) {
      console.error('📡 [API Client] FormData upload error:', err);
      return { success: false, data: null, error: 'network_error', status: 0 };
    }
  },
};
