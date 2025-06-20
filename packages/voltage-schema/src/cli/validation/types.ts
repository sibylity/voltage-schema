export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export interface ValidationContext {
  filePath: string;
  configIndex?: number;
} 