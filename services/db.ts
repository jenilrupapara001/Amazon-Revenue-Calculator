
import { AsinItem, ReferralFee, ClosingFee, ShippingFee, StorageFee, User, CategoryMap, NodeMap, RefundFee } from '../types';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'https://kitnamilegaamazon.vercel.app/api';

const request = async <T>(path: string, options: RequestInit = {}, fallback: T): Promise<T> => {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[DB] Request failed for ${path}:`, error);
    return fallback;
  }
};

export const initializeDatabase = async (): Promise<void> => {
  console.log('[DB] Remote mode: MongoDB backend via API');
};

class DatabaseService {
  // --- Auth & Config (Keep in LocalStorage for sync access) ---
  async login(email: string, password: string): Promise<User | null> {
    const user = await request<User | null>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      null
    );
    if (user) {
      localStorage.setItem('fba_user_session', JSON.stringify(user));
      return user;
    }
    return null;
  }

  logout() {
    localStorage.removeItem('fba_user_session');
  }

  getUser(): User | null {
    const u = localStorage.getItem('fba_user_session');
    return u ? JSON.parse(u) : null;
  }

  getKeepaKey(): string {
    return localStorage.getItem('fba_keepa_key') || '';
  }

  saveKeepaKey(key: string) {
    localStorage.setItem('fba_keepa_key', key);
  }

  saveUser(user: Partial<User>) {
    const existing = this.getUser();
    const merged = { ...(existing || {}), ...user };
    localStorage.setItem('fba_user_session', JSON.stringify(merged));
  }

  // --- Referral Fees ---
  async getReferralFees(): Promise<ReferralFee[]> {
    return request<ReferralFee[]>('/fees/referral', {}, []);
  }

  async saveReferralFee(fee: ReferralFee | Omit<ReferralFee, 'id'>) {
    const data = { ...fee, id: (fee as any).id || crypto.randomUUID() };
    await request('/fees/referral', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async saveReferralFeesBulk(fees: Omit<ReferralFee, 'id'>[]) {
    for (const fee of fees) {
      await this.saveReferralFee(fee as any);
    }
  }

  async deleteReferralFee(id: string) {
    await request(`/fees/referral/${id}`, { method: 'DELETE' }, null);
  }

  async clearReferralFees() {
    await request('/fees/referral/all', { method: 'DELETE' }, null);
  }

  // --- Closing Fees ---
  async getClosingFees(): Promise<ClosingFee[]> {
    return request<ClosingFee[]>('/fees/closing', {}, []);
  }

  async saveClosingFee(fee: ClosingFee | Omit<ClosingFee, 'id'>) {
    const data = { ...fee, id: (fee as any).id || crypto.randomUUID() };
    await request('/fees/closing', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async saveClosingFeesBulk(fees: Omit<ClosingFee, 'id'>[]) {
    for (const fee of fees) {
      await this.saveClosingFee(fee as any);
    }
  }

  async deleteClosingFee(id: string) {
    await request(`/fees/closing/${id}`, { method: 'DELETE' }, null);
  }

  async clearClosingFees() {
    await request('/fees/closing/all', { method: 'DELETE' }, null);
  }

  // --- Shipping Fees ---
  async getShippingFees(): Promise<ShippingFee[]> {
    return request<ShippingFee[]>('/fees/shipping', {}, []);
  }

  async saveShippingFee(fee: ShippingFee | Omit<ShippingFee, 'id'>) {
    const data = { ...fee, id: (fee as any).id || crypto.randomUUID() };
    await request('/fees/shipping', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async saveShippingFeesBulk(fees: Omit<ShippingFee, 'id'>[]) {
    for (const fee of fees) {
      await this.saveShippingFee(fee as any);
    }
  }

  async deleteShippingFee(id: string) {
    await request(`/fees/shipping/${id}`, { method: 'DELETE' }, null);
  }

  async clearShippingFees() {
    await request('/fees/shipping/all', { method: 'DELETE' }, null);
  }

  // --- Storage Fees ---
  async getStorageFees(): Promise<StorageFee[]> {
    return request<StorageFee[]>('/fees/storage', {}, []);
  }

  async saveStorageFee(fee: StorageFee | Omit<StorageFee, 'id'>) {
    const data = { ...fee, id: (fee as any).id || crypto.randomUUID() };
    await request('/fees/storage', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async deleteStorageFee(id: string) {
    await request(`/fees/storage/${id}`, { method: 'DELETE' }, null);
  }

  // --- Category Mapping ---
  async getCategoryMappings(): Promise<CategoryMap[]> {
    return request<CategoryMap[]>('/mappings', {}, []);
  }

  async saveCategoryMapping(map: CategoryMap | Omit<CategoryMap, 'id'>) {
    const data = { ...map, id: (map as any).id || crypto.randomUUID() };
    await request('/mappings', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async deleteCategoryMapping(id: string) {
    await request(`/mappings/${id}`, { method: 'DELETE' }, null);
  }

  async clearCategoryMappings() {
    await request('/mappings/all', { method: 'DELETE' }, null);
  }

  // --- Node Map ---
  async getNodeMaps(): Promise<NodeMap[]> {
    return request<NodeMap[]>('/nodemaps', {}, []);
  }

  async saveNodeMap(map: NodeMap | Omit<NodeMap, 'id'>) {
    const data = { ...map, id: (map as any).id || crypto.randomUUID() };
    await request('/nodemaps', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async deleteNodeMap(id: string) {
    await request(`/nodemaps/${id}`, { method: 'DELETE' }, null);
  }

  async clearNodeMaps() {
    await request('/nodemaps/all', { method: 'DELETE' }, null);
  }

  // --- ASINs ---
  async getAsins(): Promise<AsinItem[]> {
    return request<AsinItem[]>('/asins', {}, []);
  }

  async addAsinsBulk(items: { asin: string; stapleLevel: any }[]) {
    const payload = items.map((item) => ({
      ...item,
      status: 'pending',
      stepLevel: 'Standard',
      createdAt: new Date().toISOString(),
    }));
    await request('/asins/bulk', { method: 'POST', body: JSON.stringify(payload) }, null);
  }

  async updateMissingStepLevels() {
    const items = await this.getAsins();
    const missing = items.filter((i) => !i.stepLevel);
    for (const item of missing) {
      await this.updateAsin(item.id, { stepLevel: 'Standard' });
    }
    return missing.length;
  }

  async updateAsin(id: string, updates: Partial<AsinItem>) {
    await request(`/asins/${id}`, { method: 'PUT', body: JSON.stringify(updates) }, null);
  }

  async clearAsins() {
    await request('/asins', { method: 'DELETE' }, null);
  }

  async deleteAsin(id: string) {
    await request(`/asins/${id}`, { method: 'DELETE' }, null);
  }

  // --- Refund Fees ---
  async getRefundFees(): Promise<RefundFee[]> {
    return request<RefundFee[]>('/fees/refund', {}, []);
  }

  async saveRefundFee(fee: RefundFee | Omit<RefundFee, 'id'>) {
    const data = { ...fee, id: (fee as any).id || crypto.randomUUID() };
    await request('/fees/refund', { method: 'POST', body: JSON.stringify(data) }, null);
  }

  async deleteRefundFee(id: string) {
    await request(`/fees/refund/${id}`, { method: 'DELETE' }, null);
  }

  async clearRefundFees() {
    await request('/fees/refund/all', { method: 'DELETE' }, null);
  }
}

export const db = new DatabaseService();
