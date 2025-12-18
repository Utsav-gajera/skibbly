// Import with `` if you are using ESM\
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://f92a7f66064da27a99736737931cf1f9@o4510041845137408.ingest.de.sentry.io/4510041850642512",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});