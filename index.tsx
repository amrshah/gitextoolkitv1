import React, { useState, useRef, useEffect } from 'react';
import { Camera, QrCode, User, Notebook, Calendar, Share2, Plus, Mic, X, Search, Mail, Phone, Building, Wifi, WifiOff, RefreshCw, LogOut, CheckCircle, Download, Bell, BellOff } from 'lucide-react';

// ============================================
// PWA MANIFEST CONFIGURATION
// ============================================
const PWA_MANIFEST = {
  name: "GITEX 2025 Toolkit",
  short_name: "GITEX",
  description: "Complete event management toolkit for GITEX 2025",
  start_url: "/",
  display: "standalone",
  background_color: "#1a0b2e",
  theme_color: "#7c3aed",
  orientation: "portrait",
  icons: [
    {
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%237c3aed'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='256' fill='white' font-family='Arial, sans-serif' font-weight='bold'%3EG%3C/text%3E%3C/svg%3E",
      sizes: "192x192",
      type: "image/svg+xml",
      purpose: "any maskable"
    },
    {
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%237c3aed'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='256' fill='white' font-family='Arial, sans-serif' font-weight='bold'%3EG%3C/text%3E%3C/svg%3E",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ]
};

// ============================================
// SERVICE WORKER CODE (to be registered)
// ============================================
const SERVICE_WORKER_CODE = `
const CACHE_NAME = 'gitex-pwa-v1';
const RUNTIME_CACHE = 'gitex-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Cache-first strategy for app shell
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      }).catch(() => {
        // Return offline page if available
        return caches.match('/offline.html');
      })
    );
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(
      // Notify all clients to process sync queue
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'BACKGROUND_SYNC' });
        });
      })
    );
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New update available',
    icon: data.icon || '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'GITEX 2025', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
`;

// ============================================
// API CONFIGURATION
// ============================================
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://your-laravel-backend.com/api',
  ENDPOINTS: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    ME: '/auth/me',
    GOOGLE_LOGIN: '/auth/google',
    LINKEDIN_LOGIN: '/auth/linkedin',
    APPLE_LOGIN: '/auth/apple',
    NOTES: '/notes',
    LEADS: '/leads',
    USER_CARD: '/user/card',
    EVENTS: '/events',
    SYNC: '/sync',
    SUBSCRIBE_PUSH: '/push/subscribe'
  }
};

// ============================================
// PWA MANAGER - Service Worker & Manifest
// ============================================
class PWAManager {
  static async initialize() {
    this.createManifest();
    await this.registerServiceWorker();
    this.setupBeforeInstallPrompt();
    return true;
  }

  static createManifest() {
    const manifestJSON = JSON.stringify(PWA_MANIFEST);
    const blob = new Blob([manifestJSON], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);
    
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestURL;

    // Add theme color
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      document.head.appendChild(themeColor);
    }
    themeColor.content = PWA_MANIFEST.theme_color;

    // Add apple touch icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = PWA_MANIFEST.icons[0].src;
  }

  static async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return false;
    }

    try {
      const blob = new Blob([SERVICE_WORKER_CODE], { type: 'application/javascript' });
      const swURL = URL.createObjectURL(blob);
      
      const registration = await navigator.serviceWorker.register(swURL);
      console.log('Service Worker registered:', registration);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC') {
          window.dispatchEvent(new CustomEvent('background-sync'));
        }
      });

      // Request background sync permission
      if ('sync' in registration) {
        try {
          await registration.sync.register('sync-queue');
          console.log('Background sync registered');
        } catch (error) {
          console.log('Background sync not available:', error);
        }
      }

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  static setupBeforeInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      window.dispatchEvent(new CustomEvent('app-installable'));
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      window.deferredPrompt = null;
    });
  }

  static async promptInstall() {
    if (!window.deferredPrompt) {
      return false;
    }

    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    window.deferredPrompt = null;
    
    return outcome === 'accepted';
  }

  static async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            process.env.REACT_APP_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY'
          )
        });
      }

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  static urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
class SecureStorage {
  static getCurrentUserId() {
    const user = this.getGlobalItem('current_user');
    return user ? JSON.parse(user).id : null;
  }

  static getGlobalItem(key) {
    return localStorage.getItem(key);
  }

  static setGlobalItem(key, value) {
    localStorage.setItem(key, value);
  }

  static removeGlobalItem(key) {
    localStorage.removeItem(key);
  }

  static getUserKey(key) {
    const userId = this.getCurrentUserId();
    if (!userId) return null;
    return `user_${userId}_${key}`;
  }

  static setItem(key, value) {
    const userKey = this.getUserKey(key);
    if (!userKey) {
      console.warn('No user context for storage operation');
      return;
    }
    localStorage.setItem(userKey, value);
  }

  static getItem(key) {
    const userKey = this.getUserKey(key);
    if (!userKey) return null;
    return localStorage.getItem(userKey);
  }

  static removeItem(key) {
    const userKey = this.getUserKey(key);
    if (!userKey) return;
    localStorage.removeItem(userKey);
  }

  static clearUserData() {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`user_${userId}_`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} user-specific items`);
  }

  static clearAllAuth() {
    this.removeGlobalItem('auth_token');
    this.removeGlobalItem('refresh_token');
    this.removeGlobalItem('current_user');
  }

  static clearEverything() {
    this.clearUserData();
    this.clearAllAuth();
  }
}

// ============================================
// API SERVICE LAYER
// ============================================
class APIService {
  static async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const token = SecureStorage.getGlobalItem('auth_token');
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
      });

      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request(endpoint, options);
        } else {
          throw new Error('Session expired');
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  static async refreshToken() {
    try {
      const refreshToken = SecureStorage.getGlobalItem('refresh_token');
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        SecureStorage.setGlobalItem('auth_token', data.access_token);
        SecureStorage.setGlobalItem('refresh_token', data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static async register(userData) {
    return this.request(API_CONFIG.ENDPOINTS.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async login(credentials) {
    return this.request(API_CONFIG.ENDPOINTS.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  static async logout() {
    return this.request(API_CONFIG.ENDPOINTS.LOGOUT, {
      method: 'POST'
    });
  }

  static initiateSocialLogin(provider) {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[`${provider.toUpperCase()}_LOGIN`]}`,
      'OAuth Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    return new Promise((resolve, reject) => {
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          reject(new Error('Login cancelled'));
        }
      }, 1000);

      window.addEventListener('message', (event) => {
        if (event.origin !== API_CONFIG.BASE_URL.replace('/api', '')) return;
        
        if (event.data.type === 'oauth_success') {
          clearInterval(checkPopup);
          popup.close();
          resolve(event.data);
        } else if (event.data.type === 'oauth_error') {
          clearInterval(checkPopup);
          popup.close();
          reject(new Error(event.data.message));
        }
      });
    });
  }

  static async getNotes() {
    return this.request(API_CONFIG.ENDPOINTS.NOTES);
  }

  static async createNote(noteData) {
    return this.request(API_CONFIG.ENDPOINTS.NOTES, {
      method: 'POST',
      body: JSON.stringify(noteData)
    });
  }

  static async updateNote(id, noteData) {
    return this.request(`${API_CONFIG.ENDPOINTS.NOTES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(noteData)
    });
  }

  static async deleteNote(id) {
    return this.request(`${API_CONFIG.ENDPOINTS.NOTES}/${id}`, {
      method: 'DELETE'
    });
  }

  static async getLeads() {
    return this.request(API_CONFIG.ENDPOINTS.LEADS);
  }

  static async createLead(leadData) {
    return this.request(API_CONFIG.ENDPOINTS.LEADS, {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  }

  static async updateLead(id, leadData) {
    return this.request(`${API_CONFIG.ENDPOINTS.LEADS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leadData)
    });
  }

  static async getUserCard() {
    return this.request(API_CONFIG.ENDPOINTS.USER_CARD);
  }

  static async updateUserCard(cardData) {
    return this.request(API_CONFIG.ENDPOINTS.USER_CARD, {
      method: 'PUT',
      body: JSON.stringify(cardData)
    });
  }

  static async getEvents() {
    return this.request(API_CONFIG.ENDPOINTS.EVENTS);
  }

  static async syncData(syncPayload) {
    return this.request(API_CONFIG.ENDPOINTS.SYNC, {
      method: 'POST',
      body: JSON.stringify(syncPayload)
    });
  }

  static async subscribePushNotifications(subscription) {
    return this.request(API_CONFIG.ENDPOINTS.SUBSCRIBE_PUSH, {
      method: 'POST',
      body: JSON.stringify(subscription)
    });
  }
}

// ============================================
// AUTH SERVICE - Secure session management
// ============================================
class AuthService {
  static setAuth(data) {
    SecureStorage.setGlobalItem('auth_token', data.access_token);
    SecureStorage.setGlobalItem('refresh_token', data.refresh_token);
    SecureStorage.setGlobalItem('current_user', JSON.stringify(data.user));
  }

  static getUser() {
    const user = SecureStorage.getGlobalItem('current_user');
    return user ? JSON.parse(user) : null;
  }

  static isAuthenticated() {
    return !!SecureStorage.getGlobalItem('auth_token') && !!SecureStorage.getGlobalItem('current_user');
  }

  static async logout() {
    try {
      await APIService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      SecureStorage.clearEverything();
      window.location.reload();
    }
  }
}

// ============================================
// SYNC MANAGER - User-scoped sync queue
// ============================================
class SyncManager {
  static getQueue() {
    const queueData = SecureStorage.getItem('sync_queue');
    return queueData ? JSON.parse(queueData) : [];
  }

  static setQueue(queue) {
    SecureStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  static addToQueue(action, data) {
    const queue = this.getQueue();
    const userId = SecureStorage.getCurrentUserId();
    
    queue.push({
      id: Date.now(),
      userId: userId,
      action,
      data,
      timestamp: new Date().toISOString(),
      retries: 0
    });
    this.setQueue(queue);
  }

  static clearQueue() {
    SecureStorage.setItem('sync_queue', '[]');
  }

  static async processQueue() {
    const queue = this.getQueue();
    const currentUserId = SecureStorage.getCurrentUserId();
    
    if (queue.length === 0) return { success: true, processed: 0 };

    let processed = 0;
    const failedItems = [];

    for (const item of queue) {
      if (item.userId !== currentUserId) {
        console.warn('Skipping queue item from different user');
        continue;
      }

      try {
        await this.processQueueItem(item);
        processed++;
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        item.retries++;
        if (item.retries < 3) {
          failedItems.push(item);
        }
      }
    }

    this.setQueue(failedItems);
    return { success: true, processed, failed: failedItems.length };
  }

  static async processQueueItem(item) {
    const { action, data } = item;
    
    switch (action) {
      case 'CREATE_NOTE':
        return await APIService.createNote(data);
      case 'UPDATE_NOTE':
        return await APIService.updateNote(data.id, data);
      case 'DELETE_NOTE':
        return await APIService.deleteNote(data.id);
      case 'CREATE_LEAD':
        return await APIService.createLead(data);
      case 'UPDATE_LEAD':
        return await APIService.updateLead(data.id, data);
      case 'UPDATE_USER_CARD':
        return await APIService.updateUserCard(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

// ============================================
// AUTH SCREEN
// ============================================
function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let response;
      if (mode === 'signup') {
        if (formData.password !== formData.password_confirmation) {
          throw new Error('Passwords do not match');
        }
        response = await APIService.register(formData);
      } else {
        response = await APIService.login({
          email: formData.email,
          password: formData.password
        });
      }

      AuthService.setAuth(response);
      onAuthSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');
    setIsLoading(true);

    try {
      const response = await APIService.initiateSocialLogin(provider);
      AuthService.setAuth(response);
      onAuthSuccess(response.user);
    } catch (err) {
      setError(err.message || `${provider} login failed`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            GITEX 2025
          </h1>
          <p className="text-gray-300">Your Complete Event Toolkit</p>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 shadow-2xl">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                mode === 'login'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                mode === 'signup'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
            />

            {mode === 'signup' && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={formData.password_confirmation}
                onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                required
                className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
              />
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Login'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-800 bg-opacity-50 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
              className="w-full bg-white text-gray-800 hover:bg-gray-100 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <button
              onClick={() => handleSocialLogin('linkedin')}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </button>

            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={isLoading}
              className="w-full bg-black hover:bg-gray-900 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function GitexToolkitPWA() {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(AuthService.getUser());
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [events, setEvents] = useState([]);
  const [userCard, setUserCard] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: ''
  });
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentNote, setCurrentNote] = useState({ text: '', type: 'text', media: null });
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // PWA States
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Initialize PWA
  useEffect(() => {
    const initPWA = async () => {
      await PWAManager.initialize();
      
      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }

      // Check notification permission
      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    };

    initPWA();

    // Listen for install prompt
    const handleInstallable = () => {
      setIsInstallable(true);
      setShowInstallPrompt(true);
    };

    window.addEventListener('app-installable', handleInstallable);

    // Listen for background sync
    const handleBackgroundSync = () => {
      if (isAuthenticated) {
        syncWithBackend();
      }
    };

    window.addEventListener('background-sync', handleBackgroundSync);

    return () => {
      window.removeEventListener('app-installable', handleInstallable);
      window.removeEventListener('background-sync', handleBackgroundSync);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadLocalData();
      updateSyncQueueCount();
      
      if (isOnline) {
        fetchFromBackend();
      }
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncWithBackend();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadLocalData = () => {
    const savedNotes = SecureStorage.getItem('notes');
    const savedLeads = SecureStorage.getItem('leads');
    const savedCard = SecureStorage.getItem('card');
    const savedSyncTime = SecureStorage.getItem('last_sync_time');
    
    setNotes(savedNotes ? JSON.parse(savedNotes) : []);
    setLeads(savedLeads ? JSON.parse(savedLeads) : []);
    
    if (savedCard) {
      setUserCard(JSON.parse(savedCard));
    } else if (currentUser) {
      setUserCard({
        name: currentUser.name || '',
        title: '',
        company: '',
        email: currentUser.email || '',
        phone: ''
      });
    }
    
    setLastSyncTime(savedSyncTime);
  };

  const updateSyncQueueCount = () => {
    const queue = SyncManager.getQueue();
    setSyncQueueCount(queue.length);
  };

  const fetchFromBackend = async () => {
    if (!isOnline) return;

    try {
      const [notesData, leadsData, cardData, eventsData] = await Promise.all([
        APIService.getNotes().catch(() => null),
        APIService.getLeads().catch(() => null),
        APIService.getUserCard().catch(() => null),
        APIService.getEvents().catch(() => null)
      ]);

      if (notesData) {
        setNotes(notesData.data || notesData);
        SecureStorage.setItem('notes', JSON.stringify(notesData.data || notesData));
      }
      
      if (leadsData) {
        setLeads(leadsData.data || leadsData);
        SecureStorage.setItem('leads', JSON.stringify(leadsData.data || leadsData));
      }
      
      if (cardData) {
        setUserCard(cardData.data || cardData);
        SecureStorage.setItem('card', JSON.stringify(cardData.data || cardData));
      }
      
      if (eventsData) {
        setEvents(eventsData.data || eventsData);
      }

      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      SecureStorage.setItem('last_sync_time', syncTime);
    } catch (error) {
      console.log('Backend fetch failed (using offline data):', error);
    }
  };

  const syncWithBackend = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await SyncManager.processQueue();
      console.log('Sync completed:', result);
      
      await fetchFromBackend();
      
      updateSyncQueueCount();
      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      SecureStorage.setItem('last_sync_time', syncTime);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveNote = async () => {
    if (!currentNote.text && !currentNote.media) return;

    const newNote = {
      id: Date.now(),
      ...currentNote,
      timestamp: new Date().toISOString()
    };
    
    const updated = [newNote, ...notes];
    setNotes(updated);
    SecureStorage.setItem('notes', JSON.stringify(updated));
    
    SyncManager.addToQueue('CREATE_NOTE', newNote);
    updateSyncQueueCount();
    
    if (isOnline) {
      syncWithBackend();
    }
    
    setCurrentNote({ text: '', type: 'text', media: null });
    setShowNoteModal(false);
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    SecureStorage.setItem('notes', JSON.stringify(updated));
    
    SyncManager.addToQueue('DELETE_NOTE', { id });
    updateSyncQueueCount();
    
    if (isOnline) {
      syncWithBackend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setCurrentNote({ ...currentNote, type: 'voice', media: audioUrl });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
          const photo = canvas.toDataURL('image/jpeg');
          
          setCurrentNote({ ...currentNote, type: 'photo', media: photo });
          stream.getTracks().forEach(track => track.stop());
        }, 100);
      }
    } catch (error) {
      alert('Camera access denied');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (file.type.startsWith('image/')) {
          setCurrentNote({ ...currentNote, type: 'photo', media: event.target.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startQRScanner = async () => {
    setShowQRScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      alert('Camera access denied');
      setShowQRScanner(false);
    }
  };

  const stopQRScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowQRScanner(false);
  };

  const simulateQRScan = () => {
    const mockLead = {
      id: Date.now(),
      name: 'John Doe',
      title: 'CEO',
      company: 'Tech Corp',
      email: 'john.doe@techcorp.com',
      phone: '+971 50 123 4567',
      timestamp: new Date().toISOString(),
      notes: ''
    };
    
    const updated = [mockLead, ...leads];
    setLeads(updated);
    SecureStorage.setItem('leads', JSON.stringify(updated));
    
    SyncManager.addToQueue('CREATE_LEAD', mockLead);
    updateSyncQueueCount();
    
    if (isOnline) {
      syncWithBackend();
    }
    
    stopQRScanner();
    setActiveTab('leads');
  };

  const saveUserCard = () => {
    SecureStorage.setItem('card', JSON.stringify(userCard));
    
    SyncManager.addToQueue('UPDATE_USER_CARD', userCard);
    updateSyncQueueCount();
    
    if (isOnline) {
      syncWithBackend();
    }
    
    setShowCardEditor(false);
  };

  const shareCard = async () => {
    const cardText = `${userCard.name}\n${userCard.title}\n${userCard.company}\n${userCard.email}\n${userCard.phone}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Contact Card',
          text: cardText
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(cardText);
      alert('Contact card copied to clipboard!');
    }
  };

  const generateVCard = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${userCard.name}
TITLE:${userCard.title}
ORG:${userCard.company}
EMAIL:${userCard.email}
TEL:${userCard.phone}
END:VCARD`;
    
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userCard.name.replace(/\s/g, '_')}.vcf`;
    a.click();
  };

  const handleInstallApp = async () => {
    const installed = await PWAManager.promptInstall();
    if (installed) {
      setShowInstallPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await PWAManager.requestNotificationPermission();
    
    if (granted) {
      setNotificationsEnabled(true);
      
      // Subscribe to push notifications
      const subscription = await PWAManager.subscribeToPush();
      if (subscription && isOnline) {
        try {
          await APIService.subscribePushNotifications(subscription);
          
          // Show test notification
          new Notification('GITEX 2025', {
            body: 'Notifications enabled successfully!',
            icon: PWA_MANIFEST.icons[0].src
          });
        } catch (error) {
          console.error('Failed to subscribe push:', error);
        }
      }
    }
  };

  const filteredNotes = notes.filter(note =>
    note.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLeads = leads.filter(lead =>
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={(user) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setUserCard({
        name: user.name || '',
        title: '',
        company: '',
        email: user.email || '',
        phone: ''
      });
    }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="bg-black bg-opacity-30 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            GITEX 2025
          </h1>
          
          <div className="flex items-center gap-4">
            {/* PWA Install Button */}
            {isInstallable && !isInstalled && (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            )}

            {/* Notification Toggle */}
            {isInstalled && (
              <button
                onClick={handleEnableNotifications}
                className={`p-2 rounded-lg ${
                  notificationsEnabled 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
              >
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5" />
                ) : (
                  <BellOff className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Sync Status */}
            <div className="flex items-center gap-2 text-sm">
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-400" />
              )}
              {syncQueueCount > 0 && (
                <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                  {syncQueueCount}
                </span>
              )}
            </div>

            {/* Manual Sync Button */}
            {isOnline && (
              <button
                onClick={syncWithBackend}
                disabled={isSyncing}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                <User className="w-5 h-5" />
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl p-4">
                  <div className="mb-4 pb-4 border-b border-gray-700">
                    <p className="font-semibold">{currentUser?.name}</p>
                    <p className="text-sm text-gray-400">{currentUser?.email}</p>
                  </div>
                  
                  {lastSyncTime && (
                    <p className="text-xs text-gray-400 mb-4">
                      Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
                    </p>
                  )}
                  
                  <button
                    onClick={() => AuthService.logout()}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
                    <p className="text-sm text-gray-400">{currentUser?.email}</p>
                  </div>
                  
                  {lastSyncTime && (
                    <p className="text-xs text-gray-400 mb-4">
                      Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
                    </p>
                  )}
                  
                  <button
                    onClick={() => AuthService.logout()}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        {/* Navigation Tabs */}
        <nav className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'notes', icon: Notebook, label: 'Notes' },
            { id: 'scanner', icon: QrCode, label: 'QR Scanner' },
            { id: 'leads', icon: User, label: 'My Leads' },
            { id: 'card', icon: Share2, label: 'My Card' },
            { id: 'events', icon: Calendar, label: 'Events' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 shadow-lg'
                  : 'bg-white bg-opacity-10 hover:bg-opacity-20'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 min-h-96">
          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">My Notes</h2>
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                  New Note
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {filteredNotes.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No notes yet. Create your first note!</p>
                ) : (
                  filteredNotes.map(note => (
                    <div key={note.id} className="bg-gray-800 bg-opacity-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {note.type === 'voice' && <Mic className="w-4 h-4 text-purple-400" />}
                          {note.type === 'photo' && <Camera className="w-4 h-4 text-purple-400" />}
                          <span className="text-xs text-gray-400">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {note.text && <p className="text-gray-200 mb-2">{note.text}</p>}
                      
                      {note.type === 'voice' && note.media && (
                        <audio controls src={note.media} className="w-full mt-2" />
                      )}
                      
                      {note.type === 'photo' && note.media && (
                        <img src={note.media} alt="Note" className="w-full rounded-lg mt-2 max-h-64 object-cover" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* QR SCANNER TAB */}
          {activeTab === 'scanner' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-6">Scan QR Code</h2>
              <p className="text-gray-300 mb-6">Scan contact QR codes to instantly add leads</p>
              
              {!showQRScanner ? (
                <button
                  onClick={startQRScanner}
                  className="bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded-lg text-lg font-semibold"
                >
                  Start Scanner
                </button>
              ) : (
                <div>
                  <video ref={videoRef} className="w-full max-w-md mx-auto rounded-lg mb-4" />
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={simulateQRScan}
                      className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg"
                    >
                      Simulate Scan
                    </button>
                    <button
                      onClick={stopQRScanner}
                      className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg"
                    >
                      Stop Scanner
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEADS TAB */}
          {activeTab === 'leads' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">My Leads</h2>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Leads List */}
              <div className="grid md:grid-cols-2 gap-4">
                {filteredLeads.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 col-span-2">No leads yet. Scan a QR code to add!</p>
                ) : (
                  filteredLeads.map(lead => (
                    <div key={lead.id} className="bg-gray-800 bg-opacity-50 rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-1">{lead.name}</h3>
                      <p className="text-purple-400 text-sm mb-3">{lead.title} at {lead.company}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail className="w-4 h-4" />
                          {lead.email}
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-3">
                        Added: {new Date(lead.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MY CARD TAB */}
          {activeTab === 'card' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">My Digital Card</h2>
              
              {!showCardEditor ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-purple-700 to-blue-700 rounded-lg p-6 shadow-2xl mb-6">
                    <h3 className="text-2xl font-bold mb-2">{userCard.name}</h3>
                    <p className="text-purple-200 mb-4">{userCard.title}</p>
                    <p className="text-purple-200 mb-6">{userCard.company}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{userCard.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{userCard.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCardEditor(true)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold"
                    >
                      Edit Card
                    </button>
                    <button
                      onClick={shareCard}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold"
                    >
                      Share
                    </button>
                    <button
                      onClick={generateVCard}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={userCard.name}
                    onChange={(e) => setUserCard({ ...userCard, name: e.target.value })}
                    className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Job Title"
                    value={userCard.title}
                    onChange={(e) => setUserCard({ ...userCard, title: e.target.value })}
                    className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={userCard.company}
                    onChange={(e) => setUserCard({ ...userCard, company: e.target.value })}
                    className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={userCard.email}
                    onChange={(e) => setUserCard({ ...userCard, email: e.target.value })}
                    className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={userCard.phone}
                    onChange={(e) => setUserCard({ ...userCard, phone: e.target.value })}
                    className="w-full bg-gray-800 bg-opacity-50 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                  />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={saveUserCard}
                      className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowCardEditor(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Event Schedule</h2>
              
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-4">No events scheduled yet</p>
                  <p className="text-sm text-gray-500">Your event schedule will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="bg-gray-800 bg-opacity-50 rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                      <div className="flex items-center gap-2 text-gray-300 text-sm mb-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.date).toLocaleString()}
                      </div>
                      <p className="text-gray-400 text-sm">{event.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create Note</h3>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setCurrentNote({ text: '', type: 'text', media: null });
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Text Input */}
              <textarea
                placeholder="Type your note here..."
                value={currentNote.text}
                onChange={(e) => setCurrentNote({ ...currentNote, text: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 min-h-32"
              />

              {/* Media Preview */}
              {currentNote.media && (
                <div className="relative">
                  {currentNote.type === 'photo' && (
                    <img src={currentNote.media} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                  )}
                  {currentNote.type === 'voice' && (
                    <audio controls src={currentNote.media} className="w-full" />
                  )}
                  <button
                    onClick={() => setCurrentNote({ ...currentNote, media: null, type: 'text' })}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg"
                  disabled={currentNote.media}
                >
                  <Camera className="w-5 h-5" />
                  Photo
                </button>
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  disabled={currentNote.media}
                >
                  <Mic className="w-5 h-5" />
                  {isRecording ? 'Stop' : 'Voice'}
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Save Button */}
              <button
                onClick={saveNote}
                disabled={!currentNote.text && !currentNote.media}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Video Element for Camera */}
      <video ref={videoRef} className="hidden" />
    </div>
  );
}
