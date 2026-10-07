import { calculateNutriScore, convertOpenFoodFactsToNutrition, determineProductCategory } from '../utils/nutriScore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ProductNutrients {
  fat: number;
  sugar: number;
  protein: number;
}

export interface ProductResponse {
  barcode: string;
  name: string;
  brand: string;
  nutrients: ProductNutrients;
  health_score: number;
  raw_product_data?: any;
  nutri_score?: {
    grade: 'A' | 'B' | 'C' | 'D' | 'E';
    score: number;
    category: string;
    breakdown: any;
  };
}

export interface ApiError {
  detail: string;
}

class ApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return this.handleResponse(response);
  }

  async scanImage(imageFile: File): Promise<ProductResponse> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(imageFile.type)) {
      throw new Error('Unsupported file type. Please use JPG, JPEG, or PNG files.');
    }

    // Validate file size (8MB max)
    const maxSize = 8 * 1024 * 1024; // 8MB in bytes
    if (imageFile.size > maxSize) {
      throw new Error('Image too large. Maximum file size is 8MB.');
    }

    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${API_BASE_URL}/scan-image`, {
      method: 'POST',
      body: formData,
    });

    const data = await this.handleResponse<ProductResponse>(response);
    
    // Calculate Nutri-Score if we have raw product data
    if (data.raw_product_data) {
      try {
        const nutrition = convertOpenFoodFactsToNutrition(data.raw_product_data);
        const category = determineProductCategory(data.name, data.raw_product_data);
        const nutriScoreResult = calculateNutriScore(nutrition, category);
        
        data.nutri_score = {
          grade: nutriScoreResult.grade,
          score: nutriScoreResult.score,
          category: nutriScoreResult.category,
          breakdown: nutriScoreResult.breakdown
        };
      } catch (error) {
        console.warn('Failed to calculate Nutri-Score:', error);
      }
    }
    
    return data;
  }

  async scanByBarcode(barcode: string): Promise<ProductResponse> {
    if (!barcode.trim()) {
      throw new Error('Barcode cannot be empty');
    }

    const response = await fetch(`${API_BASE_URL}/scan/${encodeURIComponent(barcode)}`);
    const data = await this.handleResponse<ProductResponse>(response);
    
    // Calculate Nutri-Score if we have raw product data
    if (data.raw_product_data) {
      try {
        const nutrition = convertOpenFoodFactsToNutrition(data.raw_product_data);
        const category = determineProductCategory(data.name, data.raw_product_data);
        const nutriScoreResult = calculateNutriScore(nutrition, category);
        
        data.nutri_score = {
          grade: nutriScoreResult.grade,
          score: nutriScoreResult.score,
          category: nutriScoreResult.category,
          breakdown: nutriScoreResult.breakdown
        };
      } catch (error) {
        console.warn('Failed to calculate Nutri-Score:', error);
      }
    }
    
    return data;
  }
}

export const apiService = new ApiService();
