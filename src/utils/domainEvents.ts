import { EventEmitter } from "events";
import { logger } from "../config/logger";

class DomainEvents extends EventEmitter {
  public dispatch(eventName: string, payload: any): void {
    logger.info(
      { eventName, payload },
      `[DomainEvent] Dispatched event: ${eventName}`,
    );
    try {
      this.emit(eventName, payload);
    } catch (error) {
      logger.error(
        { eventName, error },
        `[DomainEvent] Error handling event: ${eventName}`,
      );
    }
  }
}

export const domainEvents = new DomainEvents();

// ─── Event Names Constants ──────────────────────────────────────────────────
export const TENDER_EVENTS = {
  SUBMITTED: "TenderSubmitted",
  APPROVED: "TenderApproved",
  PUBLISHED: "TenderPublished",
  CLOSED: "TenderClosed",
  AWARDED: "TenderAwarded",
};
