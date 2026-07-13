import { AppDataSource } from "../../config/database";
import { SecurityLog } from "../../database/entities/SecurityLog";
import { logger } from "../../config/logger";

const securityLogRepo = AppDataSource.getRepository(SecurityLog);

/**
 * Resolves geolocation for an IP address using ip-api.com.
 * Returns local description for private/loopback subnets.
 * Aborts request after 2 seconds to fail open gracefully.
 */
export async function resolveIpLocation(ip: string | null): Promise<string> {
  if (!ip) {
    return "Unknown";
  }

  const cleanIp = ip.trim().split(",")[0] || ""; // Handle potential proxy headers

  if (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("172.16.") ||
    cleanIp.startsWith("::ffff:127.0.0.1")
  ) {
    return "Localhost";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return "Unknown";
    }

    const data: any = await response.json();
    if (data.status === "success") {
      const parts = [data.city, data.regionName, data.country].filter(Boolean);
      return parts.join(", ") || "Unknown";
    }
  } catch (err) {
    logger.warn(
      { err, ip: cleanIp },
      "IP geolocation lookup failed or timed out",
    );
  }

  return "Unknown";
}

/**
 * Logs a security event. Performs IP address geolocation lookup asynchronously
 * in the background to avoid blocking the user request.
 */
export async function logSecurityEvent(opts: {
  userId?: string | null;
  email: string | null;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  // Fire-and-forget background resolution to prevent request latency
  resolveIpLocation(opts.ipAddress)
    .then(async (location) => {
      try {
        const securityLog = securityLogRepo.create({
          userId: opts.userId ?? null,
          email: opts.email ?? null,
          event: opts.event,
          ipAddress: opts.ipAddress ?? null,
          userAgent: opts.userAgent ?? null,
          location,
          details: opts.details ?? null,
        });

        await securityLogRepo.save(securityLog);
        logger.info(
          { event: opts.event, email: opts.email, location },
          "Security event logged",
        );
      } catch (err) {
        logger.error(
          { err, event: opts.event },
          "Failed to save security log record",
        );
      }
    })
    .catch((err) => {
      logger.error(
        { err, event: opts.event },
        "Error occurred during security log background resolution",
      );
    });
}
