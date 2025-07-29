/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type-safe conversion pipeline base class
 * 
 * Provides a structured approach to converting 5etools data to typed documents:
 * 1. Input validation (5etools types)  
 * 2. Transformation (5etools → DnD types)
 * 3. Output validation (Document + DnD types)
 * 4. Wrapper creation
 */

import { z } from 'zod';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { ETOOLS_DATA_PATH } from '../../config/constants.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';
import { 
  type DocumentType,
  type PluginDocumentType,
  validateDocument,
  validateWithSchema
} from '../validation/document-validators.mjs';
import {
  type MarkupProcessingOptions,
  entriesToCleanText
} from '../text/markup-processor.mjs';

/**
 * Conversion options
 */
export interface ConversionOptions {
  srdOnly?: boolean;
  includeAssets?: boolean;
  outputDir?: string;
  textProcessing?: MarkupProcessingOptions;
}

/**
 * Conversion stage result
 */
export interface ConversionStageResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: string[];
  stage?: string;
}

/**
 * Final conversion result
 */
export interface ConversionResult<T = unknown> {
  success: boolean;
  document?: T;
  wrapper?: IContentFileWrapper;
  errors?: string[];
  assetPath?: string;
}

/**
 * Batch conversion statistics
 */
export interface ConversionStats {
  total: number;
  converted: number;
  skipped: number;
  errors: number;
}

/**
 * Type constraint for inputs that have a name field
 */
type NamedInput = { name: string; [key: string]: unknown };

/**
 * Type constraint for documents that have name and imageId fields
 */
type DocumentWithNameAndImage = { name: string; imageId?: string; [key: string]: unknown };

/**
 * Abstract base class for type-safe converters
 */
export abstract class TypedConverter<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny,
  TDocument = z.infer<TOutput>
> {
  protected readonly options: ConversionOptions;
  
  constructor(options: ConversionOptions = {}) {
    this.options = {
      srdOnly: true,
      includeAssets: true,
      textProcessing: { cleanText: true, extractReferences: false },
      ...options
    };
  }

  /**
   * Abstract methods that subclasses must implement
   */
  
  /** Schema for validating input data */
  protected abstract getInputSchema(): TInput;
  
  /** Schema for validating output data */
  protected abstract getOutputSchema(): TOutput;
  
  /** Document type for this converter */
  protected abstract getDocumentType(): DocumentType;
  
  /** Plugin document type for this converter */
  protected abstract getPluginDocumentType(): PluginDocumentType;
  
  /** Transform input data to output format */
  protected abstract transformData(input: z.infer<TInput>): Promise<z.infer<TOutput>> | z.infer<TOutput>;
  
  /** Extract description from input data */
  protected abstract extractDescription(input: z.infer<TInput>): string;
  
  /** Generate asset path (optional) */
  protected extractAssetPath?(input: z.infer<TInput>): string | undefined;

  /**
   * Stage 1: Validate input data against 5etools schema
   */
  protected validateInput(data: unknown): ConversionStageResult<z.infer<TInput>> {
    const schema = this.getInputSchema();
    const result = validateWithSchema(data, schema, 'Input validation');
    
    return {
      success: result.success,
      data: result.data,
      errors: result.errors,
      stage: 'input-validation'
    };
  }

  /**
   * Stage 2: Transform data from 5etools format to DnD format
   */
  protected async performTransformation(input: z.infer<TInput>): Promise<ConversionStageResult<z.infer<TOutput>>> {
    try {
      const transformed = await this.transformData(input);
      
      return {
        success: true,
        data: transformed,
        stage: 'transformation'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stage: 'transformation'
      };
    }
  }

  /**
   * Stage 3: Validate transformed data against DnD schema
   */
  protected validateTransformed(data: z.infer<TOutput>): ConversionStageResult<z.infer<TOutput>> {
    const schema = this.getOutputSchema();
    const result = validateWithSchema(data, schema, 'Output validation');
    
    return {
      success: result.success,
      data: result.data,
      errors: result.errors,
      stage: 'output-validation'
    };
  }

  /**
   * Stage 4: Create document structure
   */
  protected createDocument(
    input: z.infer<TInput>,
    pluginData: z.infer<TOutput>
  ): ConversionStageResult<TDocument> {
    try {
      const description = this.extractDescription(input);
      const assetPath = this.extractAssetPath?.(input);
      
      // Get name from input - using type guard
      if (!this.hasNameField(input)) {
        return {
          success: false,
          errors: ['Input data must have a name field'],
          stage: 'document-creation'
        };
      }
      
      const inputName = input.name;
      
      const document = {
        id: `${this.getPluginDocumentType()}-${this.generateSlug(inputName)}`,
        name: inputName,
        slug: this.generateSlug(inputName),
        pluginId: 'dnd-5e-2024',
        documentType: this.getDocumentType(),
        pluginDocumentType: this.getPluginDocumentType(),
        description: this.processText(description),
        userData: {},
        pluginData,
        ...(assetPath && { imageId: assetPath })
      } as TDocument;
      
      return {
        success: true,
        data: document,
        stage: 'document-creation'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Document creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stage: 'document-creation'
      };
    }
  }

  /**
   * Stage 5: Validate complete document
   */
  protected validateDocument(document: TDocument): ConversionStageResult<TDocument> {
    const result = validateDocument(
      document,
      this.getPluginDocumentType(),
      'Document validation'
    );
    
    return {
      success: result.success,
      data: result.success ? document : undefined,
      errors: result.errors,
      stage: 'document-validation'
    };
  }

  /**
   * Stage 6: Create wrapper format
   */
  protected createWrapper(
    input: z.infer<TInput>,
    document: TDocument
  ): ConversionStageResult<IContentFileWrapper> {
    try {
      const wrapper: IContentFileWrapper = {
        entry: {
          name: this.getDocumentName(document),
          type: this.getDocumentType(),
          imageId: this.getDocumentImageId(document),
          category: this.determineCategory(input),
          tags: this.extractTags(input),
          sortOrder: this.calculateSortOrder(input)
        },
        content: document
      };
      
      return {
        success: true,
        data: wrapper,
        stage: 'wrapper-creation'
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Wrapper creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        stage: 'wrapper-creation'
      };
    }
  }

  /**
   * Main conversion pipeline - converts a single item
   */
  public async convertItem(inputData: unknown): Promise<ConversionResult<TDocument>> {
    // Stage 1: Input validation
    const inputResult = this.validateInput(inputData);
    if (!inputResult.success || !inputResult.data) {
      return {
        success: false,
        errors: inputResult.errors || ['Input validation failed']
      };
    }

    // Stage 2: Transformation
    const transformResult = await this.performTransformation(inputResult.data);
    if (!transformResult.success || !transformResult.data) {
      return {
        success: false,
        errors: transformResult.errors || ['Transformation failed']
      };
    }

    // Stage 3: Output validation
    const outputResult = this.validateTransformed(transformResult.data);
    if (!outputResult.success || !outputResult.data) {
      return {
        success: false,
        errors: outputResult.errors || ['Output validation failed']
      };
    }

    // Stage 4: Document creation
    const documentResult = this.createDocument(inputResult.data, outputResult.data);
    if (!documentResult.success || !documentResult.data) {
      return {
        success: false,
        errors: documentResult.errors || ['Document creation failed']
      };
    }

    // Stage 5: Document validation
    const docValidationResult = this.validateDocument(documentResult.data);
    if (!docValidationResult.success || !docValidationResult.data) {
      return {
        success: false,
        errors: docValidationResult.errors || ['Document validation failed']
      };
    }

    // Stage 6: Wrapper creation
    const wrapperResult = this.createWrapper(inputResult.data, docValidationResult.data);
    if (!wrapperResult.success || !wrapperResult.data) {
      return {
        success: false,
        errors: wrapperResult.errors || ['Wrapper creation failed']
      };
    }

    return {
      success: true,
      document: docValidationResult.data,
      wrapper: wrapperResult.data,
      assetPath: this.extractAssetPath?.(inputResult.data)
    };
  }

  /**
   * Utility methods
   */

  /** Read and parse JSON file from 5etools data directory */
  protected async readEtoolsData<T = unknown>(relativePath: string): Promise<T> {
    const fullPath = join(ETOOLS_DATA_PATH, relativePath);
    try {
      const data = await readFile(fullPath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      throw new Error(`Failed to read 5etools data file: ${relativePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /** Filter array to SRD content only */
  protected filterSrdContent<T extends { srd52?: boolean }>(data: T[]): T[] {
    if (!this.options.srdOnly) {
      return data;
    }
    return data.filter(item => item.srd52 === true);
  }

  /** Process text content using markup processor */
  protected processText(text: string): string {
    return entriesToCleanText([text]);
  }

  /** Generate URL-safe slug from name */
  protected generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /** Log conversion progress */
  protected log(message: string, ...args: unknown[]): void {
    console.log(`[${this.constructor.name}] ${message}`, ...args);
  }

  /**
   * Override these methods in subclasses for custom behavior
   */
  
  protected determineCategory(_input: z.infer<TInput>): string | undefined {
    return undefined;
  }
  
  protected extractTags(input: z.infer<TInput>): string[] {
    const tags: string[] = [];
    
    // Add source tag if available
    if (input && typeof input === 'object' && 'source' in input && typeof input.source === 'string') {
      tags.push(input.source.toLowerCase());
    }
    
    return tags;
  }
  
  protected calculateSortOrder(_input: z.infer<TInput>): number {
    return 0;
  }
  
  /**
   * Type guards and utility methods
   */
  
  private hasNameField(input: z.infer<TInput>): input is z.infer<TInput> & NamedInput {
    return typeof input === 'object' && input !== null && 
           'name' in input && typeof (input as any).name === 'string';
  }
  
  private getDocumentName(document: TDocument): string {
    if (typeof document === 'object' && document !== null && 'name' in document) {
      return (document as DocumentWithNameAndImage).name;
    }
    throw new Error('Document must have a name field');
  }
  
  private getDocumentImageId(document: TDocument): string | undefined {
    if (typeof document === 'object' && document !== null && 'imageId' in document) {
      return (document as any).imageId;
    }
    return undefined;
  }
}