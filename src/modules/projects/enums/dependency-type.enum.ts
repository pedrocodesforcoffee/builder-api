/**
 * Dependency Type Enum
 *
 * Defines the type of dependency relationship between project phases.
 * Based on standard project management dependency types.
 */
export enum DependencyType {
  /**
   * Finish-to-Start (FS) - Most Common
   * The predecessor phase must finish before the successor phase can start.
   * Example: Design must finish before Construction can start.
   */
  FINISH_TO_START = 'FINISH_TO_START',

  /**
   * Start-to-Start (SS)
   * Both phases start at the same time.
   * Example: Site preparation and utility coordination start together.
   */
  START_TO_START = 'START_TO_START',

  /**
   * Finish-to-Finish (FF)
   * Both phases finish at the same time.
   * Example: Testing and documentation finish together.
   */
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',

  /**
   * Start-to-Finish (SF) - Rare
   * The successor phase cannot finish until the predecessor phase starts.
   * Example: Security monitoring can't end until new security system starts.
   */
  START_TO_FINISH = 'START_TO_FINISH',
}
