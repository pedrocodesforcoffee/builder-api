/**
 * Delivery Method Enum
 *
 * Defines the project delivery method - how the design and construction
 * are procured and managed.
 */
export enum DeliveryMethod {
  /**
   * Design-Bid-Build (Traditional Method)
   * Design is completed first, then construction is bid competitively.
   * Owner contracts separately with designer and builder.
   */
  DESIGN_BID_BUILD = 'design_bid_build',

  /**
   * Design-Build
   * Single entity (design-builder) contracts with owner for both design and construction.
   * Promotes collaboration and can reduce project duration.
   */
  DESIGN_BUILD = 'design_build',

  /**
   * Construction Manager at Risk (CM at Risk / CMAR)
   * CM provides preconstruction services during design, then guarantees a maximum price.
   * Acts as general contractor during construction.
   */
  CM_AT_RISK = 'cm_at_risk',

  /**
   * Integrated Project Delivery (IPD)
   * Collaborative alliance between owner, designer, and builder from early design.
   * Shared risk/reward model with aligned interests.
   */
  IPD = 'ipd',
}
