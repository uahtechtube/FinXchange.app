// Squad API integration for FinXchange
export interface SquadBank {
  bank_name: string;
  bank_code: string;
}

export interface SquadVirtualAccountData {
  customer_identifier: string;
  first_name: string;
  last_name: string;
  mobile_num: string;
  email: string;
  bvn?: string;
  beneficiary_account: string;
}

export interface SquadTransferData {
  amount: number; // in kobo
  bank_code: string;
  account_number: string;
  account_name: string;
  currency_id: string;
  transaction_reference: string;
  callback_url?: string;
  email: string;
}

export interface SquadAccountLookupData {
  bank_code: string;
  account_number: string;
}

class SquadAPI {
  private baseURL = 'https://squadco.com/api/v1';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_SQUAD_API_KEY || process.env.SQUAD_API_KEY || '';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Squad API Error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  async getBanks(): Promise<{ success: boolean; data: SquadBank[] }> {
    return this.makeRequest('/banks');
  }

  async createVirtualAccount(data: SquadVirtualAccountData) {
    return this.makeRequest('/virtual-account', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyAccountNumber(data: SquadAccountLookupData) {
    const params = new URLSearchParams({
      bank_code: data.bank_code,
      account_number: data.account_number,
    });
    
    return this.makeRequest(`/account-lookup?${params}`);
  }

  async initiateTransfer(data: SquadTransferData) {
    return this.makeRequest('/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransactionStatus(transactionReference: string) {
    return this.makeRequest(`/transaction/verify/${transactionReference}`);
  }

  async initiateBulkTransfer(transfers: SquadTransferData[]) {
    return this.makeRequest('/transaction/bulk', {
      method: 'POST',
      body: JSON.stringify({ transfers }),
    });
  }

  // Bill payment methods
  async purchaseAirtime(data: {
    phone_number: string;
    amount: number;
    network_id: string;
  }) {
    return this.makeRequest('/bills/airtime', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async purchaseData(data: {
    phone_number: string;
    plan_id: string;
    network_id: string;
  }) {
    return this.makeRequest('/bills/data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payElectricityBill(data: {
    service_id: string;
    meter_number: string;
    amount: number;
    phone: string;
  }) {
    return this.makeRequest('/bills/electricity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async payCableTVBill(data: {
    service_id: string;
    smart_card_number: string;
    plan_id: string;
    phone: string;
  }) {
    return this.makeRequest('/bills/cable-tv', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Webhook validation
  validateWebhook(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const computedSignature = crypto
      .createHmac('sha512', secret)
      .update(payload)
      .digest('hex');
    
    return computedSignature === signature;
  }
}

export const squadAPI = new SquadAPI();

// Helper functions for frontend use
export const formatAmountToKobo = (nairaAmount: string | number): number => {
  return Math.round(parseFloat(nairaAmount.toString()) * 100);
};

export const formatAmountFromKobo = (koboAmount: number): string => {
  return (koboAmount / 100).toFixed(2);
};

export const generateTransactionReference = (prefix: string = 'FXC'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

// Network and service provider mappings
export const NETWORK_PROVIDERS = {
  MTN: { id: '1', name: 'MTN' },
  GLO: { id: '2', name: 'Glo' },
  AIRTEL: { id: '3', name: 'Airtel' },
  '9MOBILE': { id: '4', name: '9mobile' },
};

export const ELECTRICITY_PROVIDERS = {
  AEDC: { id: 'aedc', name: 'Abuja Electricity Distribution Company' },
  EKEDC: { id: 'ekedc', name: 'Eko Electricity Distribution Company' },
  IKEDC: { id: 'ikedc', name: 'Ikeja Electric' },
  KEDCO: { id: 'kedco', name: 'Kano Electricity Distribution Company' },
};

export const CABLE_TV_PROVIDERS = {
  DSTV: { id: 'dstv', name: 'DSTV' },
  GOTV: { id: 'gotv', name: 'GOTV' },
  STARTIMES: { id: 'startimes', name: 'StarTimes' },
};

export default squadAPI;
