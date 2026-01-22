export interface BundleUsage {
  quackMessages: number;
  workflowRuns: number;
  logicArtVisualizations: number;
}

export interface BundleStatus {
  active: boolean;
  plan: 'free' | 'orchestrate' | 'enterprise';
  features: string[];
  expiresAt?: string;
  usage?: BundleUsage;
}

export interface SubscriptionRequest {
  email: string;
  plan: 'orchestrate' | 'enterprise';
  paymentMethod?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  checkoutUrl?: string;
  message?: string;
}

export class VoyaiClient {
  private apiKey?: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey;
    // Default to local server API; for production use https://voyai.org/api
    this.baseUrl = options?.baseUrl || '/api';
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Voyai API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getStatus(): Promise<BundleStatus> {
    try {
      return await this.fetch<BundleStatus>('/orchestrate/status');
    } catch {
      return {
        active: false,
        plan: 'free',
        features: ['quack_basic', 'logicart_basic'],
      };
    }
  }

  async subscribe(request: SubscriptionRequest): Promise<SubscriptionResponse> {
    return this.fetch<SubscriptionResponse>('/orchestrate/subscribe', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async checkFeature(feature: string): Promise<boolean> {
    const status = await this.getStatus();
    return status.features.includes(feature);
  }

  async getUsage(): Promise<BundleUsage | null> {
    const status = await this.getStatus();
    return status.usage || null;
  }
}

export function createVoyaiClient(apiKey?: string): VoyaiClient {
  return new VoyaiClient({ apiKey });
}
