import { EventEmitter } from 'events';
import { logger } from '../utils/logger.mjs';

/**
 * Base domain event interface that all aggregate events must implement
 */
export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  payload: unknown;
}

/**
 * Aggregate validation error for domain rule violations
 */
export class AggregateValidationError extends Error {
  constructor(message: string, public readonly aggregate: string, public readonly field?: string) {
    super(message);
    this.name = 'AggregateValidationError';
  }
}

/**
 * Aggregate not found error
 */
export class AggregateNotFoundError extends Error {
  constructor(aggregateType: string, id: string) {
    super(`${aggregateType} aggregate with id ${id} not found`);
    this.name = 'AggregateNotFoundError';
  }
}

/**
 * Base aggregate root class that all aggregates extend
 * 
 * Provides common patterns for:
 * - Domain event publishing
 * - Aggregate boundary validation
 * - Version tracking for optimistic concurrency
 * - Common error handling
 */
export abstract class BaseAggregate extends EventEmitter {
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];
  
  constructor(public readonly id: string) {
    super();
  }

  /**
   * Get the current version of the aggregate
   */
  public getVersion(): number {
    return this.version;
  }

  /**
   * Get uncommitted domain events
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this.uncommittedEvents];
  }

  /**
   * Mark all events as committed
   */
  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Apply a domain event to update aggregate state
   */
  protected applyEvent(event: DomainEvent): void {
    // Apply the event to internal state (implemented by subclasses)
    this.apply(event);
    
    // Increment version
    this.version++;
    
    // Add to uncommitted events
    this.uncommittedEvents.push(event);
    
    // Emit for event handlers
    this.emit(event.eventType, event);
    
    logger.debug(`Domain event applied: ${event.eventType}`, {
      aggregateId: event.aggregateId,
      version: this.version
    });
  }

  /**
   * Abstract method that subclasses implement to apply events
   */
  protected abstract apply(event: DomainEvent): void;

  /**
   * Validate that an operation is within aggregate boundaries
   */
  protected validateWithinBoundary(entityId: string, entityType: string): void {
    // Subclasses can override to implement specific boundary rules
    logger.debug(`Validating ${entityType} ${entityId} is within aggregate boundary`);
  }

  /**
   * Ensure a required field is present
   */
  protected ensureRequired(value: unknown, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new AggregateValidationError(
        `${fieldName} is required`,
        this.constructor.name,
        fieldName
      );
    }
  }

  /**
   * Ensure a value is within a valid range
   */
  protected ensureInRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new AggregateValidationError(
        `${fieldName} must be between ${min} and ${max}`,
        this.constructor.name,
        fieldName
      );
    }
  }

  /**
   * Ensure a string matches a pattern
   */
  protected ensurePattern(value: string, pattern: RegExp, fieldName: string, message?: string): void {
    if (!pattern.test(value)) {
      throw new AggregateValidationError(
        message || `${fieldName} has invalid format`,
        this.constructor.name,
        fieldName
      );
    }
  }

  /**
   * Create a domain event
   */
  protected createEvent(eventType: string, payload: unknown): DomainEvent {
    return {
      aggregateId: this.id,
      eventType,
      eventVersion: 1,
      occurredAt: new Date(),
      payload
    };
  }

  /**
   * Validate aggregate invariants
   * Subclasses should override to implement specific business rules
   */
  protected abstract validateInvariants(): void;
}