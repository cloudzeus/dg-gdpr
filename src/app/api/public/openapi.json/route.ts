import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "GDPR Rights API",
    version: "1.0.0",
    description:
      "Public API for submitting and tracking GDPR data subject rights requests. Integrate with your websites to allow visitors to exercise their rights under GDPR (Articles 15–21).\n\n**Authentication:** All requests require an `X-API-Key` header with a valid API key issued from the GDPR Compliance OS admin panel.\n\n**Response deadline:** Under GDPR Article 12, all requests must be responded to within **30 calendar days**.",
    contact: { name: "GDPR Compliance OS", url: process.env.NEXTAUTH_URL },
  },
  servers: [{ url: `${process.env.NEXTAUTH_URL}/api/public/gdpr`, description: "Production" }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key", description: "API key issued from GDPR Compliance OS admin panel." },
    },
    schemas: {
      DsrType: {
        type: "string",
        enum: ["ERASURE", "PORTABILITY", "ACCESS", "RECTIFICATION", "OBJECTION", "RESTRICTION", "WITHDRAW_CONSENT"],
        description: "ERASURE=Art.17, PORTABILITY=Art.20, ACCESS=Art.15, RECTIFICATION=Art.16, OBJECTION=Art.21, RESTRICTION=Art.18, WITHDRAW_CONSENT=Art.7(3)",
      },
      DsrStatus: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED", "PARTIAL"] },
      CreateRequestBody: {
        type: "object",
        required: ["type", "subjectName", "subjectEmail"],
        properties: {
          type: { $ref: "#/components/schemas/DsrType" },
          subjectName: { type: "string", example: "Γιώργος Παπαδόπουλος", description: "Full name of the data subject" },
          subjectEmail: { type: "string", format: "email", example: "gpapadopoulos@example.com" },
          subjectPhone: { type: "string", example: "+30 210 1234567", nullable: true },
          description: { type: "string", example: "Αιτούμαι τη διαγραφή όλων των προσωπικών δεδομένων μου.", nullable: true },
          systems: { type: "array", items: { type: "string" }, example: ["CRM", "Newsletter"], nullable: true, description: "Systems from which data should be erased/exported" },
        },
      },
      CreateRequestResponse: {
        type: "object",
        properties: {
          requestId: { type: "string", example: "clx1234abcdef" },
          type: { $ref: "#/components/schemas/DsrType" },
          status: { $ref: "#/components/schemas/DsrStatus" },
          message: { type: "string" },
          estimatedResponseDate: { type: "string", format: "date", example: "2025-06-15" },
        },
      },
      StatusResponse: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          type: { $ref: "#/components/schemas/DsrType" },
          status: { $ref: "#/components/schemas/DsrStatus" },
          subjectName: { type: "string" },
          subjectEmail: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          estimatedResponseDate: { type: "string", format: "date" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  paths: {
    "/request": {
      post: {
        summary: "Submit a GDPR rights request",
        description: "Creates a new data subject request. Sends confirmation email to the subject and notifies the DPO. Compliant with GDPR Articles 12, 15–21.",
        operationId: "createRequest",
        tags: ["Requests"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRequestBody" } } } },
        responses: {
          "201": { description: "Request created successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRequestResponse" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/request/{requestId}": {
      get: {
        summary: "Get request status",
        description: "Check the current status of a previously submitted data subject request.",
        operationId: "getRequestStatus",
        tags: ["Requests"],
        parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" }, description: "The requestId returned when the request was created" }],
        responses: {
          "200": { description: "Request status", content: { "application/json": { schema: { $ref: "#/components/schemas/StatusResponse" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Request not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/export/{requestId}": {
      get: {
        summary: "Download data export (PORTABILITY requests only)",
        description: "Downloads the data export once a PORTABILITY request is COMPLETED. Returns JSON or CSV depending on the `format` query parameter.",
        operationId: "exportData",
        tags: ["Portability"],
        parameters: [
          { name: "requestId", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "query", required: false, schema: { type: "string", enum: ["json", "csv"], default: "json" } },
        ],
        responses: {
          "200": { description: "Data export file", content: { "application/json": { schema: { type: "object" } }, "text/csv": { schema: { type: "string" } } } },
          "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Portability request not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "Request not yet completed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
  tags: [
    { name: "Requests", description: "Create and track GDPR data subject requests" },
    { name: "Portability", description: "Data portability export endpoints (Article 20)" },
  ],
};

export function GET() {
  return NextResponse.json(spec, { headers: { "Access-Control-Allow-Origin": "*" } });
}
